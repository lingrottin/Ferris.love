import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { repoStats, repos } from "@/db/schema";
import { makeDb } from "@/db/util";

async function verifyHmac(
  secret: string,
  body: string,
  signature: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected =
    "sha256=" +
    Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  return expected === signature;
}

interface MatthewCallback {
  repo: string;
  status: "done" | "error";
  data: { lorc: number; counts: Record<string, number> } | null;
  error: string | null;
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  const url = new URL(request.url);
  const repoParam = url.searchParams.get("repo");
  if (!repoParam) {
    return NextResponse.json({ error: "Missing repo param" }, { status: 400 });
  }

  const rawBody = await request.text();

  // Verify HMAC signature
  const signatureHeader = request.headers.get("X-Signature-256") || "";
  const valid = await verifyHmac(
    env.MATTHEW_CALLBACK_SECRET,
    rawBody,
    signatureHeader,
  );
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const callback: MatthewCallback = JSON.parse(rawBody);

  // Parse owner/repo from query param
  const parts = repoParam.split("/");
  if (parts.length !== 2) {
    return NextResponse.json({ error: "Invalid repo format" }, { status: 400 });
  }
  const [owner, repoName] = parts;

  const db = await makeDb();

  // Look up repo
  const repoRecords = await db
    .select()
    .from(repos)
    .where(and(eq(repos.ownerLogin, owner), eq(repos.name, repoName)));

  if (repoRecords.length === 0) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }

  const repo = repoRecords[0];
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (callback.status === "done" && callback.data) {
    // Update repo_stats: find the "analyzing" record for this repo
    await db
      .update(repoStats)
      .set({
        status: "done",
        lorc: callback.data.lorc,
        counts: JSON.stringify(callback.data.counts),
      })
      .where(
        and(
          eq(repoStats.repoId, repo.githubRepoId),
          eq(repoStats.status, "analyzing"),
        ),
      );

    // Update repos table
    await db
      .update(repos)
      .set({
        status: "done",
        lastScanAt: nowSeconds,
      })
      .where(eq(repos.githubRepoId, repo.githubRepoId));
  } else if (callback.status === "error") {
    // Update repo_stats status to error
    await db
      .update(repoStats)
      .set({ status: "error" })
      .where(
        and(
          eq(repoStats.repoId, repo.githubRepoId),
          eq(repoStats.status, "analyzing"),
        ),
      );

    // Update repos table
    await db
      .update(repos)
      .set({
        status: "failed",
        scanError: callback.error || "Unknown error",
      })
      .where(eq(repos.githubRepoId, repo.githubRepoId));
  }

  return NextResponse.json({ ok: true });
}
