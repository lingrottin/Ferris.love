import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { repoStats, repos } from "@/db/schema";
import { makeDb } from "@/db/util";
import {
  type BadgeStats,
  generateBadge,
  generatePlaceholderBadge,
} from "@/lib/badge";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  const repoName = `${owner}/${repo}`;

  const theme = request.nextUrl.searchParams.get("theme") as
    | "light"
    | "dark"
    | null;

  const db = await makeDb();

  // Find the repo
  const repoRows = await db
    .select()
    .from(repos)
    .where(and(eq(repos.ownerLogin, owner), eq(repos.name, repo)))
    .limit(1);

  if (repoRows.length === 0) {
    const svg = generatePlaceholderBadge(repoName);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=300, max-age=300",
      },
    });
  }

  const repoRow = repoRows[0];

  // Get latest stats
  const statsRows = await db
    .select()
    .from(repoStats)
    .where(eq(repoStats.repoId, repoRow.githubRepoId))
    .orderBy(desc(repoStats.analyzedAt))
    .limit(1);

  if (statsRows.length === 0) {
    const svg = generatePlaceholderBadge(repoName);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=300, max-age=300",
      },
    });
  }

  const stat = statsRows[0];
  let counts: BadgeStats;

  try {
    const parsed = JSON.parse(stat.counts) as Record<string, number>;
    counts = {
      fn_count: parsed.fn_count ?? 0,
      struct_count: parsed.struct_count ?? 0,
      enum_count: parsed.enum_count ?? 0,
      trait_count: parsed.trait_count ?? 0,
    };
  } catch {
    counts = { fn_count: 0, struct_count: 0, enum_count: 0, trait_count: 0 };
  }

  const svg = generateBadge(counts, repoName, theme ?? undefined);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, s-maxage=3600, max-age=3600",
    },
  });
}
