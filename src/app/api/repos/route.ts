import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { repoStats, repos, userRepos } from "@/db/schema";
import { makeDb } from "@/db/util";
import { agh } from "@/octokit";

async function getInstallationId(owner: string): Promise<number> {
  const app = await agh();
  const resp = await app.octokit.request("GET /users/{username}/installation", {
    username: owner,
  });
  return resp.data.id;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.db?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = await makeDb();

  let body: { repo: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parts = body.repo?.split("/");
  if (!parts || parts.length !== 2 || !parts[0] || !parts[1]) {
    return NextResponse.json(
      { error: "Invalid repo format, expected owner/repo" },
      { status: 400 },
    );
  }
  const [owner, repoName] = parts;

  // Get GitHub App installation for this owner
  let installationId: number;
  try {
    installationId = await getInstallationId(owner);
  } catch {
    return NextResponse.json(
      { error: "GitHub App not installed for this owner" },
      { status: 400 },
    );
  }

  const app = await agh();
  const octokit = await app.getInstallationOctokit(installationId);

  // Verify repo exists and is Rust
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
    return NextResponse.json(
      { error: "Repository not found" },
      { status: 404 },
    );
  }

  // Check if it's a Rust repo
  if (repoData.language !== "Rust") {
    // Fallback: check for Cargo.toml
    try {
      await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner,
        repo: repoName,
        path: "Cargo.toml",
      });
    } catch {
      return NextResponse.json(
        { error: "Repository is not a Rust project" },
        { status: 400 },
      );
    }
  }

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
    return NextResponse.json(
      { error: "Could not fetch commits" },
      { status: 500 },
    );
  }

  const githubRepoId = repoData.id.toString();

  // Check if analysis already exists for this commit
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

  // Upsert repos table
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

  // Link user in user_repos (skip if already linked)
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
    // Generate webhook secret and store it
    const webhookSecret = crypto.randomUUID();
    await db
      .update(repos)
      .set({ webhookSecret })
      .where(eq(repos.githubRepoId, githubRepoId));

    // Register GitHub webhook
    try {
      await octokit.request("POST /repos/{owner}/{repo}/hooks", {
        owner,
        repo: repoName,
        config: {
          url: `${env.AUTH_URL}/api/webhook/github`,
          content_type: "json",
          secret: webhookSecret,
        },
        events: ["push"],
      });
    } catch (e) {
      // Webhook may already exist, continue
      console.warn("Webhook registration failed (may already exist):", e);
    }

    // Insert repo_stats record
    await db.insert(repoStats).values({
      repoId: githubRepoId,
      commitSha,
      status: "analyzing",
      counts: "{}",
    });

    // Call Matthew API
    const callbackUrl = `${env.AUTH_URL}/api/callback/matthew?repo=${encodeURIComponent(`${owner}/${repoName}`)}`;
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
      // Don't fail the request — the callback will retry or user can re-trigger
    }
  }

  return NextResponse.json({
    status: needsAnalysis ? "queued" : "existing",
    repoId: githubRepoId,
  });
}
