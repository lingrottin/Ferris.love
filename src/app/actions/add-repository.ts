"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { repoStats, repos, userRepos } from "@/db/schema";
import { makeDb } from "@/db/util";
import { agh } from "@/octokit";

type AddRepositoryResult =
  | {
      ok: true;
      status: "queued" | "existing";
      repoId: string;
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

export async function addRepository(
  repo: string,
): Promise<AddRepositoryResult> {
  const session = await auth();
  if (!session?.user?.db?.githubId) {
    return { ok: false, error: "Unauthorized" };
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
  const db = await makeDb();

  let installationId: number;
  try {
    installationId = await getInstallationId(owner);
  } catch {
    return { ok: false, error: "GitHub App not installed for this owner" };
  }

  const app = await agh();
  const octokit = await app.getInstallationOctokit(installationId);

  let repoData: { id: number; language: string | null; full_name: string };
  try {
    const resp = await octokit.request("GET /repos/{owner}/{repo}", {
      owner,
      repo: repoName,
    });
    repoData = {
      id: resp.data.id,
      language: resp.data.language,
      full_name: resp.data.full_name,
    };
  } catch {
    return { ok: false, error: "Repository not found" };
  }

  // Cargo.toml 不一定在根目录，并且就算不是 Rust 项目我们也可以数，无非就是 0 嘛。所以这里的检测逻辑是完全没有必要的。

  // Get latest commit SHA
  let commitSha: string;
  try {
    const commits = await octokit.request("GET /repos/{owner}/{repo}/commits", {
      owner,
      repo: repoName,
      per_page: 1,
    });
    commitSha = commits.data[0].sha;
  } catch {
    return { ok: false, error: "Could not fetch commits" };
  }

  const githubRepoId = repoData.id.toString();

  const existingStats = await db
    .select()
    .from(repoStats)
    .where(
      and(
        eq(repoStats.repoId, githubRepoId),
        eq(repoStats.commitSha, commitSha),
        inArray(repoStats.status, ["done", "analyzing"]),
      ),
    );

  const needsAnalysis = existingStats.length === 0;

  const existingRepo = await db
    .select()
    .from(repos)
    .where(eq(repos.githubRepoId, githubRepoId));

  if (existingRepo.length === 0) {
    await db.insert(repos).values({
      githubRepoId,
      ownerLogin: owner,
      name: repoName,
      isPrivate: false,
      status: needsAnalysis ? "analyzing" : "done",
    });
  } else if (needsAnalysis) {
    await db
      .update(repos)
      .set({ status: "analyzing" })
      .where(eq(repos.githubRepoId, githubRepoId));
  }

  const existingLink = await db
    .select()
    .from(userRepos)
    .where(
      and(
        eq(userRepos.userId, session.user.db.githubId),
        eq(userRepos.repoId, githubRepoId),
      ),
    );

  if (existingLink.length === 0) {
    await db.insert(userRepos).values({
      userId: session.user.db.githubId,
      repoId: githubRepoId,
      role: "owner",
    });
  }

  if (needsAnalysis) {
    const webhookSecret = crypto.randomUUID();
    await db
      .update(repos)
      .set({ webhookSecret })
      .where(eq(repos.githubRepoId, githubRepoId));

    try {
      await octokit.request("POST /repos/{owner}/{repo}/hooks", {
        owner,
        repo: repoName,
        config: {
          url: `${env.BASE_URL}/api/webhook/github`,
          content_type: "json",
          secret: webhookSecret,
        },
        events: ["push"],
      });
    } catch (e) {
      console.warn("Webhook registration failed (may already exist):", e);
    }

    await db.insert(repoStats).values({
      repoId: githubRepoId,
      commitSha,
      status: "analyzing",
      counts: "{}",
    });

    const callbackUrl = `${env.BASE_URL}/api/callback/matthew?repo=${encodeURIComponent(`${owner}/${repoName}`)}`;
    try {
      await fetch(`${env.MATTHEW_URL}/api/count`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.MATTHEW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: owner,
          repo: repoName,
          callback: callbackUrl,
        }),
      });
    } catch (e) {
      console.error("Matthew API call failed:", e);
    }
  }

  return {
    ok: true,
    status: needsAnalysis ? "queued" : "existing",
    repoId: githubRepoId,
  };
}
