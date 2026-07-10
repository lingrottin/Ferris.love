"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { repoStats, repos, userRepos } from "@/db/schema";
import { makeDb } from "@/db/util";
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

async function getInstallationId(owner: string): Promise<number> {
  const app = await agh();
  const resp = await app.octokit.request("GET /users/{username}/installation", {
    username: owner,
  });
  return resp.data.id;
}

async function getCurrentUserInstallationToken(login: string): Promise<string> {
  const app = await agh();
  const installation = await app.octokit.request(
    "GET /users/{username}/installation",
    {
      username: login,
    },
  );
  const authResult = (await app.octokit.auth({
    type: "installation",
    installationId: installation.data.id,
  })) as { token: string };
  return authResult.token;
}

async function queueRecountForRepo({
  repoId,
  owner,
  name,
  env,
  db,
  userInstallationToken,
  installationCache,
  installationOctokitCache,
}: {
  repoId: string;
  owner: string;
  name: string;
  env: CloudflareEnv;
  db: Awaited<ReturnType<typeof makeDb>>;
  userInstallationToken: string;
  installationCache: Map<string, number | null>;
  installationOctokitCache: Map<
    number,
    Awaited<
      ReturnType<Awaited<ReturnType<typeof agh>>["getInstallationOctokit"]>
    >
  >;
}) {
  let installationId = installationCache.get(owner);
  if (installationId === undefined) {
    try {
      installationId = await getInstallationId(owner);
      installationCache.set(owner, installationId);
    } catch (e) {
      // Recount should still be queued for public repositories without installation.
      console.warn("No installation found, continuing with empty token", {
        owner,
        repo: name,
        error: e,
      });
      installationId = null;
      installationCache.set(owner, null);
    }
  }

  let installationOctokit: Awaited<
    ReturnType<Awaited<ReturnType<typeof agh>>["getInstallationOctokit"]>
  > | null = null;
  if (installationId) {
    installationOctokit = installationOctokitCache.get(installationId) ?? null;
  }
  if (installationId && !installationOctokit) {
    const app = await agh();
    installationOctokit = await app.getInstallationOctokit(installationId);
    installationOctokitCache.set(installationId, installationOctokit);
  }

  const latestStats = await db
    .select({ id: repoStats.id })
    .from(repoStats)
    .where(eq(repoStats.repoId, repoId))
    .orderBy(desc(repoStats.analyzedAt))
    .limit(1);

  if (latestStats.length > 0) {
    await db
      .update(repoStats)
      .set({
        status: "analyzing",
        lorc: 0,
        counts: "{}",
        callFn: 0,
        callMethod: 0,
        defVar: 0,
      })
      .where(eq(repoStats.id, latestStats[0].id));
  } else {
    let commitSha: string | undefined;
    if (installationOctokit) {
      const commits = await installationOctokit.request(
        "GET /repos/{owner}/{repo}/commits",
        {
          owner,
          repo: name,
          per_page: 1,
        },
      );
      commitSha = commits.data[0]?.sha;
    } else {
      try {
        const app = await agh();
        const commits = await app.octokit.request(
          "GET /repos/{owner}/{repo}/commits",
          {
            owner,
            repo: name,
            per_page: 1,
          },
        );
        commitSha = commits.data[0]?.sha;
      } catch {
        // If we cannot read commit history (e.g. private repo without installation),
        // still create an analyzing record so recount can proceed.
        commitSha = `recount-${Date.now()}`;
      }
    }

    await db.insert(repoStats).values({
      repoId,
      commitSha: commitSha || `recount-${Date.now()}`,
      status: "analyzing",
      counts: "{}",
    });
  }

  await db
    .update(repos)
    .set({
      status: "analyzing",
      scanError: null,
    })
    .where(eq(repos.githubRepoId, repoId));

  let installationToken = "";
  if (installationId && installationOctokit) {
    const authResult = (await installationOctokit.auth({
      type: "installation",
      installationId,
    })) as { token: string };
    installationToken = authResult.token;
  }

  const callbackUrl = `${env.BASE_URL}/api/callback/matthew?repo=${encodeURIComponent(`${owner}/${name}`)}`;
  const matthewResp = await env.MATTHEW.fetch(
    `http://container/api/count`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MATTHEW_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: owner,
        repo: name,
        callback: callbackUrl,
        token: installationToken === "" ? undefined : installationToken,
        userInstallationToken,
      }),
    },
  );

  if (!matthewResp.ok) {
    console.log(matthewResp);
    throw new Error(`Matthew API returned ${matthewResp.status}`);
  }
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

  let userInstallationToken: string;
  try {
    userInstallationToken = await getCurrentUserInstallationToken(
      session.user.login,
    );
  } catch (e) {
    console.error("Failed to get current user installation token", e);
    return {
      ok: false,
      error: "GitHub App is not installed for the current user",
    };
  }

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

  const installationCache = new Map<string, number | null>();
  const installationOctokitCache = new Map<
    number,
    Awaited<
      ReturnType<Awaited<ReturnType<typeof agh>>["getInstallationOctokit"]>
    >
  >();
  let queued = 0;
  let failed = 0;

  for (const repo of userRepoRows) {
    try {
      await queueRecountForRepo({
        repoId: repo.repoId,
        owner: repo.owner,
        name: repo.name,
        env,
        db,
        userInstallationToken,
        installationCache,
        installationOctokitCache,
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

  let userInstallationToken: string;
  try {
    userInstallationToken = await getCurrentUserInstallationToken(
      session.user.login,
    );
  } catch (e) {
    console.error("Failed to get current user installation token", e);
    return {
      ok: false,
      error: "GitHub App is not installed for the current user",
    };
  }

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

  const installationCache = new Map<string, number | null>();
  const installationOctokitCache = new Map<
    number,
    Awaited<
      ReturnType<Awaited<ReturnType<typeof agh>>["getInstallationOctokit"]>
    >
  >();

  try {
    await queueRecountForRepo({
      repoId: targetRepo.repoId,
      owner: targetRepo.owner,
      name: targetRepo.name,
      env,
      db,
      userInstallationToken,
      installationCache,
      installationOctokitCache,
    });
    return { ok: true, queued: true };
  } catch (e) {
    console.error("Failed to queue recount for repo", owner, repoName, e);
    return { ok: false, error: "Failed to queue recount" };
  }
}
