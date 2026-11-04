import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { repos } from "@/db/schema";
import { makeDb } from "@/db/util";
import { enqueueAnalysis } from "@/lib/analysis/jobs";
import { verifyHmacSha256 } from "@/lib/utils";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const rawBody = await request.text();

  // Parse body to get repo info
  let payload: {
    repository: {
      full_name: string;
      id: number;
      private: boolean;
      default_branch?: string;
    };
    ref?: string;
    after: string;
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.repository?.full_name) {
    return NextResponse.json({ error: "Not a push event" }, { status: 400 });
  }

  const fullName = payload.repository.full_name;
  const parts = fullName.split("/");
  if (parts.length !== 2) {
    return NextResponse.json({ error: "Invalid repo name" }, { status: 400 });
  }
  const [owner, repoName] = parts;

  const db = await makeDb();

  // Look up repo in our database
  const repoRecords = await db
    .select()
    .from(repos)
    .where(and(eq(repos.ownerLogin, owner), eq(repos.name, repoName)));

  if (repoRecords.length === 0) {
    return NextResponse.json({ ok: true }); // Unknown repo, ignore
  }

  const repo = repoRecords[0];

  // Verify signature using per-repo webhook secret
  if (!repo.webhookSecret) {
    return NextResponse.json(
      { error: "No webhook secret configured" },
      { status: 500 },
    );
  }

  const signatureHeader = request.headers.get("X-Hub-Signature-256") || "";
  const valid = await verifyHmacSha256(
    repo.webhookSecret,
    rawBody,
    signatureHeader,
  );
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Sync is_private if the repo visibility changed on GitHub
  const currentPrivate = !!payload.repository.private;
  if (repo.isPrivate !== currentPrivate) {
    await db
      .update(repos)
      .set({ isPrivate: currentPrivate })
      .where(eq(repos.githubRepoId, repo.githubRepoId));
  }

  // Get commit SHA from push payload
  const commitSha = payload.after;
  if (!commitSha || commitSha === "0000000000000000000000000000000000000000") {
    return NextResponse.json({ ok: true }); // Branch deletion, ignore
  }

  // Public repository statistics track the default branch. Tags and other branches
  // must not replace its result. The exact push SHA is captured before queueing.
  if (
    payload.repository.default_branch &&
    payload.ref !== `refs/heads/${payload.repository.default_branch}`
  ) {
    return NextResponse.json({ ok: true });
  }
  try {
    const { agh } = await import("@/octokit");
    const app = await agh();
    let installationId: number | null = null;
    try {
      const installation = await app.octokit.request(
        "GET /repos/{owner}/{repo}/installation",
        { owner, repo: repoName },
      );
      installationId = installation.data.id;
    } catch (error) {
      if ((error as { status?: number }).status !== 404) throw error;
    }
    await enqueueAnalysis(env, {
      repoId: repo.githubRepoId,
      owner,
      name: repoName,
      commitSha,
      installationId,
    });
  } catch (error) {
    console.error("Could not persist push analysis", error);
    return NextResponse.json(
      { error: "Could not queue analysis" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
