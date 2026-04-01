import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getStatsWithoutRepo } from "@/app/actions/get-stats";
import { users } from "@/db/schema";
import { makeDb } from "@/db/util";
import { type BadgeMetric, generateBadge } from "@/lib/badges";
import {
  getCachedSvg,
  getUserBadgeKey,
  getUserLatestAnalyzedAt,
  putCachedSvg,
} from "@/lib/badge-cache";

const LABELS = {
  total_fn_calls: "Fn Calls",
  total_method_calls: "Method Calls",
  total_var_defs: "Variables",
};
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string }> },
) {
  const { owner: user } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const url = new URL(request.url);
  const showParam = url.searchParams.get("show");
  const showKeys = showParam
    ? showParam.split(",").slice(0, 3)
    : Object.keys(LABELS);
  const filteredShowKeys = showKeys.filter((key) => key in LABELS);
  const showKeyString = filteredShowKeys.join(",");
  const variantParam = url.searchParams.get("variant");
  let variant = "card";
  if (["card", "mini", "big_lorc"].includes(variantParam ?? "")) {
    variant = variantParam ?? "card";
  }
  const latestAnalyzedAt = await getUserLatestAnalyzedAt(env, user).catch(
    () => null,
  );
  if (latestAnalyzedAt) {
    const cacheKey = getUserBadgeKey({
      user,
      variant,
      show: showKeyString,
      analyzedAt: latestAnalyzedAt,
    });
    const cachedSvg = await getCachedSvg(env, cacheKey).catch(() => null);
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

  // look up user in db
  const db_user = await db.select().from(users).where(eq(users.login, user));
  if (db_user.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const stats = await getStatsWithoutRepo(db_user[0].githubId);
  const metrics: BadgeMetric[] = [];
  for (const k of filteredShowKeys) {
    // biome-ignore-start lint/suspicious/noTsIgnore: wuwu
    // @ts-ignore
    const stat: number = stats[k];
    metrics.push({
      key: k,
      // @ts-ignore
      label: LABELS[k],
      value: stat,
    });
    // biome-ignore-end lint/suspicious/noTsIgnore: wuwu
  }
  const svg = await generateBadge({
    lorc: stats.total_lorc,
    metrics,
    name: `@${user}`,
    variant,
  });

  const cacheKey = getUserBadgeKey({
    user,
    variant,
    show: showKeyString,
    analyzedAt: latestAnalyzedAt ?? undefined,
  });
  await putCachedSvg(env, cacheKey, svg).catch(() => null);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
