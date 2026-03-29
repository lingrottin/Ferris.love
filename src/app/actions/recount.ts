"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { repoStats, repos, userRepos } from "@/db/schema";
import { makeDb } from "@/db/util";
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

async function getInstallationId(owner: string): Promise<number> {
  const app = await agh();
  const resp = await app.octokit.request("GET /users/{username}/installation", {
    username: owner,
  });
  return resp.data.id;
}

export async function recount(): Promise<RecountResult> {
  const session = await auth();
  if (!session?.user?.db?.githubId) {
    return { ok: false, error: "Unauthorized" };
  }

  const { env } = await getCloudflareContext({ async: true });
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

  const installationCache = new Map<string, number>();
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
      let installationId = installationCache.get(repo.owner);
      if (!installationId) {
        installationId = await getInstallationId(repo.owner);
        installationCache.set(repo.owner, installationId);
      }

      let installationOctokit = installationOctokitCache.get(installationId);
      if (!installationOctokit) {
        const app = await agh();
        installationOctokit = await app.getInstallationOctokit(installationId);
        installationOctokitCache.set(installationId, installationOctokit);
      }

      const latestStats = await db
        .select({ id: repoStats.id })
        .from(repoStats)
        .where(eq(repoStats.repoId, repo.repoId))
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
        const commits = await installationOctokit.request(
          "GET /repos/{owner}/{repo}/commits",
          {
            owner: repo.owner,
            repo: repo.name,
            per_page: 1,
          },
        );
        const commitSha = commits.data[0]?.sha;

        if (!commitSha) {
          failed += 1;
          continue;
        }

        await db.insert(repoStats).values({
          repoId: repo.repoId,
          commitSha,
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
        .where(eq(repos.githubRepoId, repo.repoId));

      const callbackUrl = `${env.BASE_URL}/api/callback/matthew?repo=${encodeURIComponent(`${repo.owner}/${repo.name}`)}`;
      const matthewResp = await fetch(`${env.MATTHEW_URL}/api/count`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.MATTHEW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: repo.owner,
          repo: repo.name,
          callback: callbackUrl,
        }),
      });

      if (!matthewResp.ok) {
        throw new Error(`Matthew API returned ${matthewResp.status}`);
      }

      queued += 1;
    } catch (e) {
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
