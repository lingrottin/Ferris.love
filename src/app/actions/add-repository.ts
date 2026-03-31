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

  let hasInstallation = true;
  let installationId: number | null = null;
  // biome-ignore lint/suspicious/noExplicitAny: octokit types are complex
  let octokit: any = null;

  try {
    installationId = await getInstallationId(owner);
    const app = await agh();
    octokit = await app.getInstallationOctokit(installationId);
  } catch {
    hasInstallation = false;
  }

  // Get repo info
  let repoData: {
    id: number;
    language: string | null;
    full_name: string;
    private: boolean;
  };
  if (hasInstallation && octokit) {
    try {
      const resp = await octokit.request("GET /repos/{owner}/{repo}", {
        owner,
        repo: repoName,
      });
      repoData = {
        id: resp.data.id,
        language: resp.data.language,
        full_name: resp.data.full_name,
        private: resp.data.private,
      };
    } catch {
      return { ok: false, error: "Repository not found" };
    }
  } else {
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "ferris.love",
        },
      },
    );
    if (!resp.ok) {
      return { ok: false, error: "Repository not found" };
    }
    // biome-ignore lint/suspicious/noExplicitAny: GitHub API response
    const data = (await resp.json()) as any;
    repoData = {
      id: data.id,
      language: data.language,
      full_name: data.full_name,
      private: data.private,
    };
  }

  // Block private repos without installation
  if (repoData.private && !hasInstallation) {
    return {
      ok: false,
      error:
        "This is a private repository. The owner must install the Ferris.love GitHub App to allow analysis.",
    };
  }

  // Get latest commit SHA
  let commitSha: string;
  if (hasInstallation && octokit) {
    try {
      const commits = await octokit.request(
        "GET /repos/{owner}/{repo}/commits",
        {
          owner,
          repo: repoName,
          per_page: 1,
        },
      );
      commitSha = commits.data[0].sha;
    } catch {
      return { ok: false, error: "Could not fetch commits" };
    }
  } else {
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/commits?per_page=1`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "ferris.love",
        },
      },
    );
    if (!resp.ok) {
      return { ok: false, error: "Could not fetch commits" };
    }
    // biome-ignore lint/suspicious/noExplicitAny: GitHub API response
    const data = (await resp.json()) as any[];
    commitSha = data[0]?.sha;
    if (!commitSha) {
      return { ok: false, error: "Repository has no commits" };
    }
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
      isPrivate: repoData.private ?? false,
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
    let webhookInstalled = false;
    const webhookSecret = crypto.randomUUID();

    if (hasInstallation && octokit) {
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
        webhookInstalled = true;
      } catch (e) {
        console.warn(
          "Webhook registration failed (may already exist or no permission):",
          e,
        );
      }
    }

    await db
      .update(repos)
      .set({
        webhookSecret: hasInstallation ? webhookSecret : null,
        webhookInstalled,
      })
      .where(eq(repos.githubRepoId, githubRepoId));

    await db.insert(repoStats).values({
      repoId: githubRepoId,
      commitSha,
      status: "analyzing",
      counts: "{}",
    });

    const callbackUrl = `${env.BASE_URL}/api/callback/matthew?repo=${encodeURIComponent(`${owner}/${repoName}`)}`;

    // biome-ignore lint/suspicious/noExplicitAny: dynamic body shape
    const matthewBody: any = {
      user: owner,
      repo: repoName,
      callback: callbackUrl,
    };

    if (hasInstallation && octokit && installationId) {
      try {
        const authResult = (await octokit.auth({
          type: "installation",
          installationId,
        })) as { token: string };
        matthewBody.token = authResult.token;
      } catch (e) {
        console.warn("Failed to get installation token:", e);
      }
    }

    try {
      await fetch(`${env.MATTHEW_URL}/api/count`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.MATTHEW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(matthewBody),
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
