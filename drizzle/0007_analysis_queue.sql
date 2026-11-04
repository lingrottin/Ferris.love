ALTER TABLE repos ADD COLUMN latest_job_id text;
ALTER TABLE repo_stats ADD COLUMN job_id text;
ALTER TABLE repo_stats ADD COLUMN requested_at integer NOT NULL DEFAULT 0;
UPDATE repo_stats SET requested_at = COALESCE(analyzed_at, 0) * 1000;
CREATE TABLE analysis_jobs (
  id text PRIMARY KEY NOT NULL,
  repo_id text NOT NULL REFERENCES repos(github_repo_id) ON DELETE CASCADE,
  stats_id text NOT NULL REFERENCES repo_stats(id) ON DELETE CASCADE,
  owner text NOT NULL,
  name text NOT NULL,
  commit_sha text NOT NULL,
  installation_id integer,
  status text NOT NULL DEFAULT 'queued',
  created_at integer NOT NULL,
  dispatched_at integer,
  completed_at integer,
  error text
);
CREATE INDEX idx_analysis_jobs_outbox ON analysis_jobs(status, dispatched_at, created_at);
CREATE INDEX idx_repo_stats_requested ON repo_stats(repo_id, requested_at DESC, id DESC);
