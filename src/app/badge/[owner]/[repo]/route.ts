import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { repoStats, repos } from "@/db/schema";
import { makeDb } from "@/db/util";
import {
  DEFAULT_SHOW,
  generateBadge,
  generatePlaceholderBadge,
} from "@/lib/badges";
import {
  getCachedSvg,
  getRepoBadgeKey,
  getRepoLatestAnalyzedAt,
  setRepoLatestAnalyzedAt,
  putCachedSvg,
} from "@/lib/badge-cache";
import { COUNTS_LABELS_SHORT as COUNTS_LABELS } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo: repoName } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const url = new URL(request.url);

  // Parse show param
  const showParam = url.searchParams.get("show");
  const showKeys = showParam ? showParam.split(",").slice(0, 5) : DEFAULT_SHOW;
  const showKeyString = showKeys.join(",");
  const variantParam = url.searchParams.get("variant");
  let variant = "horizontal";
  if (["card", "mini", "horizontal"].includes(variantParam ?? "")) {
    variant = variantParam ?? "horizontal";
  }

  const latestAnalyzedAt = await getRepoLatestAnalyzedAt(
    env,
    owner,
    repoName,
  ).catch(() => null);
  if (latestAnalyzedAt) {
    const cachedKey = getRepoBadgeKey({
      owner,
      repo: repoName,
      variant,
      show: showKeyString,
      analyzedAt: latestAnalyzedAt,
    });
    const cachedSvg = await getCachedSvg(env, cachedKey).catch(() => null);
    if (cachedSvg) {
      return new NextResponse(cachedSvg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }
  }
  const db = await makeDb();

  // Look up repo
  const repoRecords = await db
    .select()
    .from(repos)
    .where(and(eq(repos.ownerLogin, owner), eq(repos.name, repoName)));

  if (repoRecords.length === 0) {
    const svg = await generatePlaceholderBadge();
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  }

  const repoRecord = repoRecords[0];

  // Get latest done stats
  const stats = await db
    .select()
    .from(repoStats)
    .where(
      and(
        eq(repoStats.repoId, repoRecord.githubRepoId),
        eq(repoStats.status, "done"),
      ),
    )
    .orderBy(desc(repoStats.analyzedAt))
    .limit(1);

  if (stats.length === 0) {
    const svg = await generatePlaceholderBadge();
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  }

  const stat = stats[0];
  // Parse counts
  let counts: Record<string, number> = {};
  try {
    counts = JSON.parse(stat.counts);
  } catch {
    // Empty counts
  }

  const metrics = showKeys
    .filter((key) => key in COUNTS_LABELS)
    .map((key) => ({
      key,
      label: COUNTS_LABELS[key],
      value: counts[key] ?? 0,
    }));
  const svg = await generateBadge({
    lorc: stat.lorc,
    metrics,
    name: `${owner}/${repoName}`,
    variant,
  });

  await setRepoLatestAnalyzedAt(
    env,
    owner,
    repoName,
    stat.analyzedAt ?? 0,
  ).catch(() => null);
  const cacheKey = getRepoBadgeKey({
    owner,
    repo: repoName,
    variant,
    show: showKeyString,
    analyzedAt: stat.analyzedAt ?? 0,
  });
  await putCachedSvg(env, cacheKey, svg).catch(() => null);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
