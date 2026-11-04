"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { Octokit } from "octokit";
import { auth } from "@/auth";
import { repos, userRepos } from "@/db/schema";
import { makeDb } from "@/db/util";
import { enqueueAnalysis } from "@/lib/analysis/jobs";
import { consumeRateLimit, formatRetryAfter } from "@/lib/rate-limit";
import { agh } from "@/octokit";

type RecountResult =
  | {
      ok: true;
      total: number;
      queued: number;
      failed: number;
    }
  | {
      ok: false;
      error: string;
    };

type RecountSingleResult =
  | {
      ok: true;
      queued: true;
    }
  | {
      ok: false;
      error: string;
    };

async function queueRecountForRepo({
  repoId,
  owner,
  name,
  env,
  fallbackLogin,
}: {
  repoId: string;
  owner: string;
  name: string;
  env: CloudflareEnv;
  fallbackLogin: string;
}) {
  const app = await agh();
  let installationId: number | null = null;
  try {
    const installation = await app.octokit.request(
      "GET /repos/{owner}/{repo}/installation",
      { owner, repo: name },
    );
    installationId = installation.data.id;
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error;
    // Public repositories can use the requesting user's installation quota.
    try {
      const installation = await app.octokit.request(
        "GET /users/{username}/installation",
        { username: fallbackLogin },
      );
      installationId = installation.data.id;
    } catch (fallbackError) {
      if ((fallbackError as { status?: number }).status !== 404)
        throw fallbackError;
    }
  }
  const octokit = installationId
    ? await app.getInstallationOctokit(installationId)
    : new Octokit();
  const { data: commits } = await octokit.request(
    "GET /repos/{owner}/{repo}/commits",
    { owner, repo: name, per_page: 1 },
  );
  const commitSha = commits[0]?.sha;
  if (!commitSha) throw new Error("Repository has no commits");
  await enqueueAnalysis(env, {
    repoId,
    owner,
    name,
    commitSha,
    installationId,
    force: true,
  });
}

export async function recount(): Promise<RecountResult> {
  const session = await auth();
  if (!session?.user?.db?.githubId) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!session.user.login) {
    return { ok: false, error: "Missing user login" };
  }

  const { env } = await getCloudflareContext({ async: true });
  const rateLimit = await consumeRateLimit({
    env,
    key: `recount-all:${session.user.db.githubId}`,
    limit: 2,
    windowSeconds: 60 * 60 * 24,
  });
  if (!rateLimit.ok) {
    return {
      ok: false,
      error: `Rate limit exceeded. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
    };
  }
  const db = await makeDb();

  const userRepoRows = await db
    .select({
      repoId: repos.githubRepoId,
      owner: repos.ownerLogin,
      name: repos.name,
    })
    .from(userRepos)
    .innerJoin(repos, eq(userRepos.repoId, repos.githubRepoId))
    .where(eq(userRepos.userId, session.user.db.githubId));

  if (userRepoRows.length === 0) {
    return { ok: true, total: 0, queued: 0, failed: 0 };
  }

  let queued = 0;
  let failed = 0;

  for (const repo of userRepoRows) {
    try {
      await queueRecountForRepo({
        repoId: repo.repoId,
        owner: repo.owner,
        name: repo.name,
        env,
        fallbackLogin: session.user.login,
      });

      queued += 1;
    } catch (e) {
      console.log(e);
      console.error(
        "Failed to queue recount for repo",
        repo.owner,
        repo.name,
        e,
      );
      failed += 1;
    }
  }

  return {
    ok: true,
    total: userRepoRows.length,
    queued,
    failed,
  };
}

export async function recountSingle(
  repo: string,
): Promise<RecountSingleResult> {
  const session = await auth();
  if (!session?.user?.db?.githubId) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!session.user.login) {
    return { ok: false, error: "Missing user login" };
  }

  const parts = repo?.split("/");
  if (!parts || parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      ok: false,
      error: 'Invalid repo format. An "Owner/Repo" is expected',
    };
  }

  const [owner, repoName] = parts;
  const { env } = await getCloudflareContext({ async: true });
  const rateLimit = await consumeRateLimit({
    env,
    key: `recount-single:${session.user.db.githubId}`,
    limit: 30,
    windowSeconds: 60 * 60,
  });
  if (!rateLimit.ok) {
    return {
      ok: false,
      error: `Rate limit exceeded. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds)}.`,
    };
  }
  const db = await makeDb();

  const targetRepo = await db
    .select({
      repoId: repos.githubRepoId,
      owner: repos.ownerLogin,
      name: repos.name,
    })
    .from(repos)
    .innerJoin(userRepos, eq(userRepos.repoId, repos.githubRepoId))
    .where(
      and(
        eq(userRepos.userId, session.user.db.githubId),
        eq(repos.ownerLogin, owner),
        eq(repos.name, repoName),
      ),
    )
    .then((rows) => rows[0] ?? null);

  if (!targetRepo) {
    return {
      ok: false,
      error: "Repository not found or not linked to your account",
    };
  }

  try {
    await queueRecountForRepo({
      repoId: targetRepo.repoId,
      owner: targetRepo.owner,
      name: targetRepo.name,
      env,
      fallbackLogin: session.user.login,
    });
    return { ok: true, queued: true };
  } catch (e) {
    console.error("Failed to queue recount for repo", owner, repoName, e);
    return { ok: false, error: "Failed to queue recount" };
  }
}
