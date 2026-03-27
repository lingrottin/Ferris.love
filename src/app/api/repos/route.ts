import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { repos, userRepos } from "@/db/schema";
import { makeDb } from "@/db/util";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    repo?: string;
  } | null;
  if (!body?.repo || typeof body.repo !== "string") {
    return NextResponse.json(
      {
        error: "Missing or invalid 'repo' field. Expected 'owner/repo' format.",
      },
      { status: 400 },
    );
  }

  const repoFullName: string = body.repo.trim();
  const parts = repoFullName.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return NextResponse.json(
      { error: "Invalid repo format. Expected 'owner/repo'." },
      { status: 400 },
    );
  }

  const [owner, repoName] = parts;

  // Verify repo exists and is a Rust project via GitHub API
  const ghResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ferris.love",
      },
    },
  );

  if (!ghResponse.ok) {
    return NextResponse.json(
      { error: "Repository not found on GitHub." },
      { status: 404 },
    );
  }

  const ghRepo = (await ghResponse.json()) as {
    id: number;
    language: string | null;
    private: boolean;
  };

  // Check if it's a Rust project
  if (ghRepo.language !== "Rust") {
    // Fallback: check for Cargo.toml
    const cargoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/contents/Cargo.toml`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "ferris.love",
        },
      },
    );
    if (!cargoResponse.ok) {
      return NextResponse.json(
        { error: "Repository does not appear to be a Rust project." },
        { status: 422 },
      );
    }
  }

  const db = await makeDb();
  const githubRepoId = String(ghRepo.id);
  const userId = session.user.id;

  // Check if user already has this repo
  const existing = await db
    .select()
    .from(userRepos)
    .where(
      and(eq(userRepos.userId, userId), eq(userRepos.repoId, githubRepoId)),
    );

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Repository already added." },
      { status: 409 },
    );
  }

  // Upsert repo record
  await db
    .insert(repos)
    .values({
      githubRepoId,
      ownerLogin: owner,
      name: repoName,
      isPrivate: ghRepo.private,
      status: "queued",
    })
    .onConflictDoNothing();

  // Link user to repo
  await db.insert(userRepos).values({
    userId,
    repoId: githubRepoId,
    role: "owner",
  });

  // Send to Matthew backend for analysis
  const { env } = await getCloudflareContext({ async: true });
  const matthewUrl = env.MATTHEW_URL;

  if (matthewUrl) {
    try {
      const callbackUrl = `${env.AUTH_URL}/api/callback/matthew`;
      await fetch(`${matthewUrl}/invoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: `${owner}/${repoName}`,
          repo_id: githubRepoId,
          callback_url: callbackUrl,
        }),
      });
    } catch (e) {
      console.error("Failed to invoke Matthew:", e);
    }
  }

  return NextResponse.json({ status: "queued", repoId: githubRepoId });
}
