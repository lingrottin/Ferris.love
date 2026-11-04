import { v7 as uuidv7 } from "uuid";
import type { AnalysisMessage, AnalysisOutput } from "./protocol";

type Bindings = {
  DB: D1Database;
  ANALYSIS_QUEUE: Pick<Queue<AnalysisMessage>, "send">;
};
export type AnalysisJob = {
  id: string;
  repo_id: string;
  stats_id: string;
  owner: string;
  name: string;
  commit_sha: string;
  installation_id: number | null;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  created_at: number;
  dispatched_at: number | null;
  completed_at: number | null;
  error: string | null;
};

export async function publishJob(env: Bindings, jobId: string) {
  await env.ANALYSIS_QUEUE.send({ version: 1, jobId });
  await env.DB.prepare(
    "UPDATE analysis_jobs SET dispatched_at = ? WHERE id = ? AND status = 'queued'",
  )
    .bind(Date.now(), jobId)
    .run();
}

/** D1 batch commits the job and its outbox before Queue delivery is attempted. */
export async function enqueueAnalysis(
  env: Bindings,
  input: {
    repoId: string;
    owner: string;
    name: string;
    commitSha: string;
    installationId: number | null;
    force?: boolean;
  },
): Promise<{ jobId: string | null; queued: boolean }> {
  if (!/^[a-f0-9]{40}$/i.test(input.commitSha))
    throw new Error("A full commit SHA is required");
  const jobId = uuidv7();
  const statId = uuidv7();
  const created = Date.now();
  // Non-forced duplicate webhook/add requests retain the already active or successful result.
  // A forced recount can replace the job pointer without allowing an old result to overwrite it.
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO repo_stats (id, repo_id, commit_sha, status, counts, analyzed_at, requested_at, job_id)
      VALUES (?, ?, ?, 'analyzing', '{}', ?, ?, ?)
      ON CONFLICT(repo_id, commit_sha) DO UPDATE SET status = 'analyzing', requested_at = excluded.requested_at, job_id = excluded.job_id
      WHERE ? OR repo_stats.status = 'error'`).bind(
      statId,
      input.repoId,
      input.commitSha,
      Math.floor(created / 1000),
      created,
      jobId,
      input.force ? 1 : 0,
    ),
    env.DB.prepare(`INSERT INTO analysis_jobs (id, repo_id, stats_id, owner, name, commit_sha, installation_id, created_at)
      SELECT ?, repo_id, id, ?, ?, commit_sha, ?, ? FROM repo_stats WHERE repo_id = ? AND commit_sha = ? AND job_id = ?`).bind(
      jobId,
      input.owner,
      input.name,
      input.installationId,
      created,
      input.repoId,
      input.commitSha,
      jobId,
    ),
    env.DB.prepare(`UPDATE repos SET latest_job_id = ?, status = 'queued', scan_error = NULL
      WHERE github_repo_id = ? AND EXISTS (SELECT 1 FROM analysis_jobs WHERE id = ?)`).bind(
      jobId,
      input.repoId,
      jobId,
    ),
  ]);
  const job = await loadJob(env.DB, jobId);
  if (!job) return { jobId: null, queued: false };
  try {
    await publishJob(env, jobId);
  } catch {
    console.warn("Analysis outbox retained for scheduled delivery", { jobId });
  }
  return { jobId, queued: true };
}

export async function loadJob(db: D1Database, id: string) {
  return db
    .prepare("SELECT * FROM analysis_jobs WHERE id = ?")
    .bind(id)
    .first<AnalysisJob>();
}

export async function finishJob(
  db: D1Database,
  job: AnalysisJob,
  output: AnalysisOutput,
) {
  const now = Math.floor(Date.now() / 1000);
  const data = output.data;
  const error = output.error?.slice(0, 2000) ?? null;
  await db.batch([
    data
      ? db
          .prepare(`UPDATE repo_stats SET status = 'done', lorc = ?, counts = ?, call_fn = ?, call_method = ?, def_var = ?, analyzed_at = ?
      WHERE id = ? AND job_id = ?`)
          .bind(
            data.lorc,
            JSON.stringify(data.counts),
            data.counts.call_fn ?? 0,
            data.counts.call_method ?? 0,
            data.counts.def_var ?? 0,
            now,
            job.stats_id,
            job.id,
          )
      : db
          .prepare(
            "UPDATE repo_stats SET status = 'error' WHERE id = ? AND job_id = ?",
          )
          .bind(job.stats_id, job.id),
    db
      .prepare(`UPDATE repos SET status = ?, scan_error = ?, last_scan_at = CASE WHEN ? THEN ? ELSE last_scan_at END
      WHERE github_repo_id = ? AND latest_job_id = ?`)
      .bind(
        data ? "done" : "failed",
        error,
        data ? 1 : 0,
        now,
        job.repo_id,
        job.id,
      ),
    db
      .prepare(
        "UPDATE analysis_jobs SET status = ?, error = ?, completed_at = ? WHERE id = ?",
      )
      .bind(data ? "done" : "failed", error, Date.now(), job.id),
  ]);
}

export async function dispatchOutbox(env: Bindings) {
  const jobs = await env.DB.prepare(
    "SELECT id FROM analysis_jobs WHERE status = 'queued' AND dispatched_at IS NULL ORDER BY created_at LIMIT 100",
  ).all<{ id: string }>();
  for (const job of jobs.results) await publishJob(env, job.id);
}
