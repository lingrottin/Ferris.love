"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, count, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { repos, userRepos } from "@/db/schema";
import { makeDb } from "@/db/util";
import { agh } from "@/octokit";

type RemoveRepositoryResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
      removed: boolean;
    };

function normalizeUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function getInstallationId(owner: string): Promise<number> {
  const app = await agh();
  const resp = await app.octokit.request("GET /users/{username}/installation", {
    username: owner,
  });
  return resp.data.id;
}

export async function removeRepository(
  repo: string,
): Promise<RemoveRepositoryResult> {
  const session = await auth();
  if (!session?.user?.db?.githubId) {
    return { ok: false, error: "Unauthorized", removed: false };
  }

  const parts = repo?.split("/");
  if (!parts || parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      ok: false,
      error: 'Invalid repo format. An "Owner/Repo" is expected',
      removed: false,
    };
  }

  const [owner, repoName] = parts;
  const db = await makeDb();
  const userId = session.user.db.githubId;

  const existingRepo = await db
    .select()
    .from(repos)
    .where(and(eq(repos.ownerLogin, owner), eq(repos.name, repoName)))
    .then((rows) => rows[0] ?? null);

  if (!existingRepo) {
    return { ok: false, error: "Repository not found", removed: false };
  }

  const existingLink = await db
    .select()
    .from(userRepos)
    .where(
      and(
        eq(userRepos.userId, userId),
        eq(userRepos.repoId, existingRepo.githubRepoId),
      ),
    )
    .then((rows) => rows[0] ?? null);

  if (!existingLink) {
    return {
      ok: false,
      error: "Repository is not linked to your account",
      removed: false,
    };
  }

  await db
    .delete(userRepos)
    .where(
      and(
        eq(userRepos.userId, userId),
        eq(userRepos.repoId, existingRepo.githubRepoId),
      ),
    );

  const repoLinks = await db
    .select({ value: count(userRepos.userId) })
    .from(userRepos)
    .where(eq(userRepos.repoId, existingRepo.githubRepoId));

  const linkedUsers = repoLinks[0]?.value ?? 0;
  if (linkedUsers > 0) {
    return { ok: true };
  }

  let webhookCleanupFailed = false;
  try {
    const app = await agh();
    const installationId = await getInstallationId(owner);
    const octokit = await app.getInstallationOctokit(installationId);
    const { env } = await getCloudflareContext({ async: true });

    const hooks = await octokit.request("GET /repos/{owner}/{repo}/hooks", {
      owner,
      repo: repoName,
      per_page: 100,
    });

    const webhookUrl = normalizeUrl(`${env.BASE_URL}/api/webhook/github`);
    const hooksToDelete = hooks.data.filter((hook) => {
      const hookUrl = hook.config?.url;
      return (
        typeof hookUrl === "string" && normalizeUrl(hookUrl) === webhookUrl
      );
    });

    await Promise.all(
      hooksToDelete.map((hook) =>
        octokit.request("DELETE /repos/{owner}/{repo}/hooks/{hook_id}", {
          owner,
          repo: repoName,
          hook_id: hook.id,
        }),
      ),
    );
  } catch (error) {
    console.warn("Failed to delete webhook while removing repository:", error);
    webhookCleanupFailed = true;
  }

  await db
    .delete(repos)
    .where(eq(repos.githubRepoId, existingRepo.githubRepoId));

  if (webhookCleanupFailed) {
    return {
      ok: false,
      error:
        "Repository removed, but webhook cleanup failed. Please remove the Ferris.love webhook manually in GitHub repository settings.",
      removed: true,
    };
  }

  return { ok: true };
}
