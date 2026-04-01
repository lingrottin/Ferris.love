import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { repoStats, repos } from "@/db/schema";
import { makeDb } from "@/db/util";
import { verifyHmacSha256 } from "@/lib/utils";
import { agh } from "@/octokit";

async function getInstallationId(owner: string): Promise<number> {
  const app = await agh();
  const resp = await app.octokit.request("GET /users/{username}/installation", {
    username: owner,
  });
  return resp.data.id;
}


export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const rawBody = await request.text();

  // Parse body to get repo info
  let payload: {
    repository: { full_name: string; id: number };
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
  const valid = await verifyHmacSha256(repo.webhookSecret, rawBody, signatureHeader);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Get commit SHA from push payload
  const commitSha = payload.after;
  if (!commitSha || commitSha === "0000000000000000000000000000000000000000") {
    return NextResponse.json({ ok: true }); // Branch deletion, ignore
  }

  // Check if we already have a non-error record for this commit
  const existingStats = await db
    .select()
    .from(repoStats)
    .where(
      and(
        eq(repoStats.repoId, repo.githubRepoId),
        eq(repoStats.commitSha, commitSha),
        ne(repoStats.status, "error"),
      ),
    );

  if (existingStats.length > 0) {
    return NextResponse.json({ ok: true }); // Already tracked
  }

  // Insert new analyzing record
  await db.insert(repoStats).values({
    repoId: repo.githubRepoId,
    commitSha,
    status: "analyzing",
    counts: "{}",
  });

  // Update repo status
  await db
    .update(repos)
    .set({ status: "analyzing" })
    .where(eq(repos.githubRepoId, repo.githubRepoId));

  // Get installation token for Matthew to clone private repos
  let installationToken: string | undefined;
  try {
    const installationId = await getInstallationId(owner);
    const app = await agh();
    const octokit = await app.getInstallationOctokit(installationId);
    const authResult = (await octokit.auth({
      type: "installation",
      installationId,
    })) as { token: string };
    installationToken = authResult.token;
  } catch (e) {
    console.warn("Could not get installation token for Matthew:", e);
  }

  // Call Matthew API
  const callbackUrl = `${env.BASE_URL}/api/callback/matthew?repo=${encodeURIComponent(`${owner}/${repoName}`)}`;
  try {
    const matthewResponse = await fetch(`${env.MATTHEW_URL}/api/count`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MATTHEW_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: owner,
        repo: repoName,
        callback: callbackUrl,
        ...(installationToken && { token: installationToken }),
      }),
    });
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
            eq(repoStats.repoId, repo.githubRepoId),
            eq(repoStats.commitSha, commitSha),
          ),
        );
      await db
        .update(repos)
        .set({ status: "failed" })
        .where(eq(repos.githubRepoId, repo.githubRepoId));
    }
  } catch (e) {
    console.error("Matthew API call failed:", e);
  }

  return NextResponse.json({ ok: true });
}
