import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { repoStats, repos } from "@/db/schema";
import { makeDb } from "@/db/util";
import {
  DEFAULT_SHOW,
  generateBadge,
  generatePlaceholderBadge,
} from "@/lib/badge";
import { COUNTS_LABELS_SHORT as COUNTS_LABELS } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo: repoName } = await params;
  const db = await makeDb();

  // Look up repo
  const repoRecords = await db
    .select()
    .from(repos)
    .where(and(eq(repos.ownerLogin, owner), eq(repos.name, repoName)));

  if (repoRecords.length === 0) {
    const svg = generatePlaceholderBadge(`${owner}/${repoName}`);
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
    const svg = generatePlaceholderBadge(`${owner}/${repoName}`);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  }

  const stat = stats[0];
  const url = new URL(request.url);

  // Parse show param
  const showParam = url.searchParams.get("show");
  const showKeys = showParam ? showParam.split(",").slice(0, 5) : DEFAULT_SHOW;
  const theme = url.searchParams.get("theme") as "dark" | "light" | null;

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

  const svg = generateBadge({
    lorc: stat.lorc,
    metrics,
    repoName: `${owner}/${repoName}`,
    theme: theme || undefined,
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
