import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
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
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const callbackSecret = env.MATTHEW_CALLBACK_SECRET;

  if (!callbackSecret) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  // Verify Bearer token (HMAC of request body using shared secret)
  const authHeader = request.headers.get("Authorization");
  const rawBody = await request.text();

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const valid = await verifyHmac(callbackSecret, rawBody, token);
    if (!valid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    // Also accept X-Signature header
    const signature = request.headers.get("X-Signature");
    if (!signature) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const valid = await verifyHmac(callbackSecret, rawBody, signature);
    if (!valid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = JSON.parse(rawBody) as {
    repo_id: string;
    commit_sha: string;
    lorc?: number;
    fn_count?: number;
    struct_count?: number;
    enum_count?: number;
    trait_count?: number;
    counts?: Record<string, number>;
  };

  if (!body.repo_id || !body.commit_sha) {
    return NextResponse.json(
      { error: "Missing repo_id or commit_sha" },
      { status: 400 },
    );
  }

  const counts = body.counts ?? {
    fn_count: body.fn_count ?? 0,
    struct_count: body.struct_count ?? 0,
    enum_count: body.enum_count ?? 0,
    trait_count: body.trait_count ?? 0,
  };

  const db = await makeDb();

  // Insert stats
  await db
    .insert(repoStats)
    .values({
      repoId: body.repo_id,
      commitSha: body.commit_sha,
      lorc: body.lorc ?? 0,
      counts: JSON.stringify(counts),
    })
    .onConflictDoNothing();

  // Update repo status to done
  await db
    .update(repos)
    .set({
      status: "done",
      lastScanAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(repos.githubRepoId, body.repo_id));

  return NextResponse.json({ ok: true });
}
