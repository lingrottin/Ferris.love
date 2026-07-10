"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { repoStats, repos, userRepos } from "@/db/schema";
import { makeDb } from "@/db/util";
import { consumeRateLimit, formatRetryAfter } from "@/lib/rate-limit";
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

async function getInstallationId(
  app: Awaited<ReturnType<typeof agh>>,
  owner: string,
): Promise<number> {
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
  const rateLimit = await consumeRateLimit({
    env,
    key: `add-repo:${session.user.db.githubId}`,
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

  let hasOwnerInstallation = true;
  let ownerInstallationId: number | null = null;
  let userInstallationId: number | null = null;
  // biome-ignore lint/suspicious/noExplicitAny: octokit types are complex
  let ownerOctokit: any = null;
  // biome-ignore lint/suspicious/noExplicitAny: octokit types are complex
  let userOctokit: any = null;
  // biome-ignore lint/suspicious/noExplicitAny: octokit types are complex
  let authOctokit: any = null;
  const app = await agh();

  try {
    ownerInstallationId = await getInstallationId(app, owner);
    ownerOctokit = await app.getInstallationOctokit(ownerInstallationId);
  } catch {
    hasOwnerInstallation = false;
  }

  const currentLogin = session?.user?.login;
  if (currentLogin) {
    try {
      userInstallationId = await getInstallationId(app, currentLogin);
      userOctokit = await app.getInstallationOctokit(userInstallationId);
    } catch {
      userInstallationId = null;
      userOctokit = null;
    }
  }

  authOctokit = ownerOctokit ?? userOctokit;
  if (!authOctokit) {
    return {
      ok: false,
      error: "GitHub App is not installed for this owner or the current user",
    };
  }

  // Get repo info
  let repoData: {
    id: number;
    language: string | null;
    full_name: string;
    private: boolean;
  };
  try {
    const resp = await authOctokit.request("GET /repos/{owner}/{repo}", {
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

  // Block private repos without installation
  if (repoData.private && !hasOwnerInstallation) {
    return {
      ok: false,
      error:
        "This is a private repository. The owner must install the Ferris.love GitHub App to allow analysis.",
    };
  }

  // Get latest commit SHA
  let commitSha: string;
  try {
    const commits = await authOctokit.request(
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
      .set({ status: "analyzing", isPrivate: !!repoData.private })
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
    let webhookSecret: string | null = null;

    if (hasOwnerInstallation && ownerOctokit) {
      const generatedSecret = crypto.randomUUID();
      try {
        await ownerOctokit.request("POST /repos/{owner}/{repo}/hooks", {
          owner,
          repo: repoName,
          config: {
            url: `${env.BASE_URL}/api/webhook/github`,
            content_type: "json",
            secret: generatedSecret,
          },
          events: ["push"],
        });
        webhookInstalled = true;
        webhookSecret = generatedSecret;
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
        webhookSecret,
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

    if (hasOwnerInstallation && ownerOctokit && ownerInstallationId) {
      try {
        const authResult = (await ownerOctokit.auth({
          type: "installation",
          installationId: ownerInstallationId,
        })) as { token: string };
        matthewBody.token = authResult.token;
      } catch (e) {
        console.warn("Failed to get installation token:", e);
      }
    }

    if (userInstallationId) {
      try {
        const authResult = (await app.octokit.auth({
          type: "installation",
          installationId: userInstallationId,
        })) as { token: string };
        matthewBody.userInstallationToken = authResult.token;
      } catch (e) {
        console.warn("Failed to get current user installation token:", e);
      }
    }

    try {
      const matthewResponse = await env.MATTHEW.fetch(
        `http://container/api/count`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.MATTHEW_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(matthewBody),
        },
      );
      if (!matthewResponse.ok) {
        console.error(
          "Matthew API returned error:",
          matthewResponse.status,
          matthewResponse.statusText,
        );
        await db
          .update(repoStats)
          .set({ status: "error" })
          .where(
            and(
              eq(repoStats.repoId, githubRepoId),
              eq(repoStats.commitSha, commitSha),
            ),
          );
        await db
          .update(repos)
          .set({ status: "failed" })
          .where(eq(repos.githubRepoId, githubRepoId));
      }
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
