import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { Miniflare } from "miniflare";
import {
  dispatchOutbox,
  enqueueAnalysis,
  finishJob,
  loadJob,
} from "../src/lib/analysis/jobs";
import {
  type AnalysisMessage,
  type AnalysisOutput,
  parseOutput,
} from "../src/lib/analysis/protocol";

const mf = new Miniflare({
  workers: [
    {
      config: {
        name: "analysis-tests",
        compatibilityDate: "2026-11-04",
        manifest: {
          mainModule: "index.js",
          modules: {
            "index.js": {
              type: "esm",
              contents:
                "export default { fetch() { return new Response('ok'); } }",
            },
          },
        },
        env: { DB: { type: "d1", id: "analysis-test" } },
      },
    },
  ],
});
let db: D1Database;
const sent: AnalysisMessage[] = [];
const queue = {
  async send(body: AnalysisMessage) {
    sent.push(body);
    return {
      metadata: { metrics: { backlogCount: sent.length, backlogBytes: 0 } },
    };
  },
};
const sha = "a".repeat(40);

before(async () => {
  db = await mf.getD1Database("DB");
  // Apply the actual schema history, so migration and SQL behavior are exercised together.
  for (const name of [
    "0000_giant_grandmaster",
    "0001_solid_adam_warlock",
    "0002_mature_falcon",
    "0003_panoramic_wrecker",
    "0004_shiny_night_thrasher",
    "0005_boring_mongoose",
    "0006_add_webhook_installed",
    "0007_analysis_queue",
  ]) {
    const sql = await readFile(
      new URL(`../drizzle/${name}.sql`, import.meta.url),
      "utf8",
    );
    for (const statement of sql
      .split(";")
      .map((s) => s.replaceAll("--> statement-breakpoint", "").trim())
      .filter(Boolean)) {
      await db.prepare(statement).run();
    }
  }
});
after(async () => {
  await mf.dispose();
});

function output(jobId: string, commitSha = sha): AnalysisOutput {
  return {
    version: 1,
    jobId,
    commitSha,
    data: {
      lorc: 12,
      counts: { call_fn: 3 },
      parsedFiles: 1,
      skippedFiles: 0,
      snapshotBytes: 80,
    },
    error: null,
    retryable: false,
  };
}

test("protocol rejects stale identities, invalid counts, and contradictory success", () => {
  const input = { jobId: "job", owner: "o", repo: "r", commitSha: sha };
  assert.equal(
    parseOutput(JSON.stringify(output("job")), input).data?.lorc,
    12,
  );
  assert.throws(() => parseOutput(JSON.stringify(output("other")), input));
  assert.throws(() =>
    parseOutput(JSON.stringify(output("job", "b".repeat(40))), input),
  );
  assert.throws(() =>
    parseOutput(JSON.stringify({ ...output("job"), retryable: true }), input),
  );
  assert.throws(() =>
    parseOutput(
      JSON.stringify({
        ...output("job"),
        data: { ...output("job").data, lorc: -1 },
      }),
      input,
    ),
  );
  assert.throws(() => parseOutput("null", input));
});

test("outbox survives publish failure, duplicates are suppressed, and old completion cannot overwrite recount", async () => {
  await db
    .prepare(
      "INSERT INTO repos (github_repo_id, owner_login, name) VALUES ('1', 'owner', 'repo')",
    )
    .run();
  const input = {
    repoId: "1",
    owner: "owner",
    name: "repo",
    commitSha: sha,
    installationId: null,
  };
  const failedQueue = {
    async send() {
      throw new Error("Queue temporarily unavailable");
    },
  };
  const first = await enqueueAnalysis(
    { DB: db, ANALYSIS_QUEUE: failedQueue },
    input,
  );
  assert.ok(first.jobId);
  const firstJob = await loadJob(db, first.jobId);
  assert.ok(firstJob);
  assert.equal(firstJob.dispatched_at, null);
  await dispatchOutbox({ DB: db, ANALYSIS_QUEUE: queue });
  assert.deepEqual(sent, [{ version: 1, jobId: first.jobId }]);
  assert.ok((await loadJob(db, first.jobId))?.dispatched_at);
  assert.equal(
    (await enqueueAnalysis({ DB: db, ANALYSIS_QUEUE: queue }, input)).queued,
    false,
  );
  const second = await enqueueAnalysis(
    { DB: db, ANALYSIS_QUEUE: queue },
    { ...input, force: true },
  );
  assert.ok(second.jobId);
  await finishJob(db, firstJob, output(firstJob.id));
  assert.equal(
    (
      await db
        .prepare("SELECT status FROM repo_stats WHERE repo_id = '1'")
        .first<{ status: string }>()
    )?.status,
    "analyzing",
  );
  assert.equal(
    (
      await db
        .prepare("SELECT status FROM repos WHERE github_repo_id = '1'")
        .first<{ status: string }>()
    )?.status,
    "queued",
  );
  const secondJob = await loadJob(db, second.jobId);
  assert.ok(secondJob);
  await finishJob(db, secondJob, output(secondJob.id));
  await finishJob(db, secondJob, output(secondJob.id));
  assert.equal(
    (
      await db
        .prepare("SELECT COUNT(*) AS n FROM repo_stats WHERE repo_id = '1'")
        .first<{ n: number }>()
    )?.n,
    1,
  );
  assert.equal(
    (
      await db
        .prepare("SELECT lorc FROM repo_stats WHERE repo_id = '1'")
        .first<{ lorc: number }>()
    )?.lorc,
    12,
  );
  assert.equal(
    (await enqueueAnalysis({ DB: db, ANALYSIS_QUEUE: queue }, input)).queued,
    false,
  );
});

test("completion order cannot change the newest requested snapshot", async () => {
  await db
    .prepare(
      "INSERT INTO repos (github_repo_id, owner_login, name) VALUES ('2', 'owner', 'second')",
    )
    .run();
  const input = {
    repoId: "2",
    owner: "owner",
    name: "second",
    installationId: null,
  };
  const first = await enqueueAnalysis(
    { DB: db, ANALYSIS_QUEUE: queue },
    { ...input, commitSha: sha },
  );
  const second = await enqueueAnalysis(
    { DB: db, ANALYSIS_QUEUE: queue },
    { ...input, commitSha: "b".repeat(40) },
  );
  assert.ok(first.jobId && second.jobId);
  const oldJob = await loadJob(db, first.jobId);
  const newJob = await loadJob(db, second.jobId);
  assert.ok(oldJob && newJob);
  await finishJob(db, newJob, output(newJob.id, newJob.commit_sha));
  await finishJob(db, oldJob, output(oldJob.id));
  const latest = await db
    .prepare(
      "SELECT commit_sha FROM repo_stats WHERE repo_id = '2' AND status = 'done' ORDER BY requested_at DESC, id DESC LIMIT 1",
    )
    .first<{ commit_sha: string }>();
  assert.equal(latest?.commit_sha, newJob.commit_sha);
  assert.equal(
    (
      await db
        .prepare("SELECT latest_job_id FROM repos WHERE github_repo_id = '2'")
        .first<{ latest_job_id: string }>()
    )?.latest_job_id,
    newJob.id,
  );
});
