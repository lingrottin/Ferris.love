import { DurableObject } from "cloudflare:workers";
import { App } from "octokit";
import {
  dispatchOutbox,
  finishJob,
  loadJob,
} from "../../src/lib/analysis/jobs";
import {
  type AnalysisInput,
  type AnalysisMessage,
  type AnalysisOutput,
  parseOutput,
} from "../../src/lib/analysis/protocol";

const TASK_TIMEOUT_MS = 11 * 60_000;
const MAX_STDOUT_BYTES = 64 * 1024;
const MAX_STDERR_BYTES = 64 * 1024;

async function readBounded(
  stream: ReadableStream<Uint8Array> | null | undefined,
  limit: number,
) {
  if (!stream) return "";
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new Error("Matthew output exceeds limit");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** One object per job. Repeated deliveries share execution and its persisted result. */
export class MatthewContainer extends DurableObject<CounterEnv> {
  private active: Promise<AnalysisOutput> | undefined;

  async run(input: AnalysisInput): Promise<AnalysisOutput> {
    if (this.active) return this.active;
    this.active = this.execute(input);
    try {
      return await this.active;
    } finally {
      this.active = undefined;
    }
  }

  private async execute(input: AnalysisInput): Promise<AnalysisOutput> {
    const cached = await this.ctx.storage.get<AnalysisOutput>("result");
    if (cached) return cached;
    const container = this.ctx.container;
    if (!container) throw new Error("Container binding missing");
    // A new DO activation may inherit an orphaned process from a lost caller.
    // Stop its VM before retrying so two attempts cannot work on the same job.
    if (container.running) await container.destroy();
    container.start({
      image: container.images.matthew,
      instance: "standard-1",
      enableInternet: true,
    });
    await container.setInactivityTimeout(TASK_TIMEOUT_MS + 60_000);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TASK_TIMEOUT_MS);
    try {
      const stdin = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(input)));
          controller.close();
        },
      });
      const process = await container.exec(
        ["timeout", "--kill-after=5", "600", "/usr/local/bin/matthew"],
        { stdin, signal: abort.signal },
      );
      // Stop the timer at process exit. Signaling an exited exec process is an API error.
      const exited = process.exitCode.finally(() => clearTimeout(timer));
      const [stdout, , exitCode] = await Promise.all([
        readBounded(process.stdout, MAX_STDOUT_BYTES),
        readBounded(process.stderr, MAX_STDERR_BYTES),
        exited,
      ]);
      const output = parseOutput(stdout, input);
      if ((exitCode === 0) !== (output.error === null))
        throw new Error("Matthew exit code and result disagree");
      // Retryable failures must run again on redelivery rather than reusing an error.
      if (!output.retryable) await this.ctx.storage.put("result", output);
      await this.ctx.storage.setAlarm(Date.now() + 7 * 24 * 60 * 60_000);
      return output;
    } finally {
      clearTimeout(timer);
      // Destroying the VM also kills git descendants and frees ephemeral checkout files.
      await container.destroy();
    }
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}

async function consume(
  message: Message<AnalysisMessage>,
  env: CounterEnv,
  deadLetter: boolean,
) {
  if (
    !message.body ||
    message.body.version !== 1 ||
    typeof message.body.jobId !== "string"
  ) {
    console.error("Invalid analysis message", { messageId: message.id });
    message.ack();
    return;
  }
  const job = await loadJob(env.DB, message.body.jobId);
  if (!job || ["failed", "cancelled"].includes(job.status)) {
    message.ack();
    return;
  }
  // Cache updates can fail after D1 commits. Redelivery retries invalidation too.
  if (job.status === "done") {
    await invalidateBadges(env, job);
    message.ack();
    return;
  }
  const target = await env.DB.prepare(
    "SELECT job_id FROM repo_stats WHERE id = ?",
  )
    .bind(job.stats_id)
    .first<{ job_id: string }>();
  if (!target || target.job_id !== job.id) {
    await env.DB.prepare(
      "UPDATE analysis_jobs SET status = 'cancelled', completed_at = ? WHERE id = ?",
    )
      .bind(Date.now(), job.id)
      .run();
    message.ack();
    return;
  }
  if (deadLetter) {
    await finishJob(env.DB, job, {
      version: 1,
      jobId: job.id,
      commitSha: job.commit_sha,
      data: null,
      error: job.error ?? "Analysis exhausted its retries",
      retryable: false,
    });
    message.ack();
    return;
  }
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE analysis_jobs SET status = 'running' WHERE id = ?",
    ).bind(job.id),
    env.DB.prepare(
      "UPDATE repos SET status = 'analyzing' WHERE github_repo_id = ? AND latest_job_id = ?",
    ).bind(job.repo_id, job.id),
  ]);
  const input: AnalysisInput = {
    jobId: job.id,
    owner: job.owner,
    repo: job.name,
    commitSha: job.commit_sha,
  };
  if (job.installation_id) {
    const app = new App({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY.trim(),
    });
    let auth: { token: string };
    try {
      auth = (await app.octokit.auth({
        type: "installation",
        installationId: job.installation_id,
      })) as { token: string };
    } catch (error) {
      console.error("GitHub installation token mint failed", {
        jobId: job.id,
        status: (error as { status?: number }).status,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
    input.token = auth.token;
  }
  const output = await env.MATTHEW.getByName(job.id).run(input);
  if (output.retryable) {
    console.error("Matthew returned a retryable error", {
      jobId: job.id,
      error: output.error,
    });
    await env.DB.prepare("UPDATE analysis_jobs SET error = ? WHERE id = ?")
      .bind(output.error, job.id)
      .run();
    throw new Error("Retryable Matthew failure");
  }
  await finishJob(env.DB, job, output);
  // Invalidate for every successful result, including out-of-order historical completions.
  if (output.data) await invalidateBadges(env, job);
  message.ack();
}

async function invalidateBadges(
  env: CounterEnv,
  job: { owner: string; name: string; repo_id: string },
) {
  await env.KV.delete(`badge:repo:latest:${job.owner}/${job.name}`);
  const linked = await env.DB.prepare(
    "SELECT users.login FROM users JOIN user_repos ON user_repos.user_id = users.github_id WHERE user_repos.repo_id = ?",
  )
    .bind(job.repo_id)
    .all<{ login: string }>();
  // A duplicate or older completion must never restore an already cached version.
  await Promise.all(
    linked.results.map(({ login }) =>
      env.KV.put(`badge:user:latest:${login}`, crypto.randomUUID()),
    ),
  );
}

export default {
  async queue(batch: MessageBatch<AnalysisMessage>, env: CounterEnv) {
    const deadLetter = batch.queue === "ferris-analysis-dlq";
    for (const message of batch.messages) {
      try {
        await consume(message, env, deadLetter);
      } catch (error) {
        console.error("Analysis delivery failed", {
          jobId: message.body?.jobId,
          attempt: message.attempts,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        message.retry({
          delaySeconds: Math.min(3600, 30 * 2 ** Math.min(message.attempts, 7)),
        });
      }
    }
  },
  async scheduled(_controller: ScheduledController, env: CounterEnv) {
    await dispatchOutbox(env);
  },
} satisfies ExportedHandler<CounterEnv, AnalysisMessage>;
