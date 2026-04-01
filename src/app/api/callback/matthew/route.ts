import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { repoStats, repos } from "@/db/schema";
import { makeDb } from "@/db/util";
import {
  setRepoLatestAnalyzedAt,
  setUserLatestAnalyzedAt,
} from "@/lib/badge-cache";
import { verifyHmacSha256, type Counts } from "@/lib/utils";

interface MatthewCallback {
  repo: string;
  status: "Done" | "Error";
  data: { lorc: number; counts: Counts } | null;
  error: string | null;
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  const url = new URL(request.url);
  const repoParam = url.searchParams.get("repo");
  console.info("[matthew-callback] incoming request", {
    repoParam,
    hasSignature: Boolean(request.headers.get("X-Signature-256")),
  });

  if (!repoParam) {
    console.warn("[matthew-callback] missing repo param");
    return NextResponse.json({ error: "Missing repo param" }, { status: 400 });
  }

  const rawBody = await request.text();
  console.info("[matthew-callback] request body received", {
    repoParam,
    bodyLength: rawBody.length,
  });

  // Verify HMAC signature
  const signatureHeader = request.headers.get("X-Signature-256") || "";
  const valid = await verifyHmacSha256(
    env.MATTHEW_CALLBACK_SECRET,
    rawBody,
    signatureHeader,
  );
  if (!valid) {
    console.warn("[matthew-callback] invalid signature", { repoParam });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  console.info("[matthew-callback] signature verified", { repoParam });

  let callback: MatthewCallback;
  try {
    callback = JSON.parse(rawBody) as MatthewCallback;
  } catch {
    console.warn("[matthew-callback] invalid JSON body", { repoParam });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  console.info("[matthew-callback] callback parsed", {
    repoParam,
    status: callback.status,
    hasData: Boolean(callback.data),
    hasError: Boolean(callback.error),
  });

  // Parse owner/repo from query param
  const parts = repoParam.split("/");
  if (parts.length !== 2) {
    console.warn("[matthew-callback] invalid repo format", { repoParam });
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
    console.warn("[matthew-callback] repo not found", { owner, repoName });
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }

  const repo = repoRecords[0];
  console.info("[matthew-callback] repo record found", {
    owner,
    repoName,
    githubRepoId: repo.githubRepoId,
  });

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (callback.status === "Done" && callback.data) {
    console.info("[matthew-callback] processing done status", {
      owner,
      repoName,
      lorc: callback.data.lorc,
      countKeys: Object.keys(callback.data.counts).length,
    });

    // Update repo_stats: find the "analyzing" record for this repo
    await db
      .update(repoStats)
      .set({
        status: "done",
        lorc: callback.data.lorc,
        counts: JSON.stringify(callback.data.counts),
        callFn: callback.data.counts.call_fn || 0,
        callMethod: callback.data.counts.call_method || 0,
        defVar: callback.data.counts.def_var || 0,
        analyzedAt: nowSeconds,
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

    await setRepoLatestAnalyzedAt(env, owner, repoName, nowSeconds).catch(
      () => null,
    );
    await setUserLatestAnalyzedAt(env, owner, nowSeconds).catch(() => null);

    console.info("[matthew-callback] done status updates completed", {
      owner,
      repoName,
      githubRepoId: repo.githubRepoId,
    });
  } else if (callback.status === "Error") {
    console.error("[matthew-callback] processing error status", {
      owner,
      repoName,
      error: callback.error || "Unknown error",
    });

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

    console.info("[matthew-callback] error status updates completed", {
      owner,
      repoName,
      githubRepoId: repo.githubRepoId,
    });
  } else {
    console.warn("[matthew-callback] unsupported callback payload", {
      owner,
      repoName,
      status: callback.status,
      hasData: Boolean(callback.data),
      callback,
    });
  }

  console.info("[matthew-callback] request handled", {
    owner,
    repoName,
    status: callback.status,
  });

  return NextResponse.json({ ok: true });
}
