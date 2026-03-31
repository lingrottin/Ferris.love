import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getStatsWithoutRepo } from "@/app/actions/get-stats";
import { users } from "@/db/schema";
import { makeDb } from "@/db/util";
import { type BadgeMetric, generateBadge } from "@/lib/badges";

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
  const db = await makeDb();

  // look up user in db
  const db_user = await db.select().from(users).where(eq(users.login, user));
  if (db_user.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const stats = await getStatsWithoutRepo(db_user[0].githubId);
  const url = new URL(request.url);
  const showParam = url.searchParams.get("show");
  const showKeys = showParam
    ? showParam.split(",").slice(0, 3)
    : Object.keys(LABELS);
  const variantParam = url.searchParams.get("variant");
  const metrics: BadgeMetric[] = [];
  for (const k of showKeys) {
    if (Object.keys(LABELS).includes(k)) {
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
  }
  let variant = "card";
  if (["card", "mini", "big_lorc"].includes(variantParam ?? "")) {
    variant = variantParam ?? "card";
  }
  const svg = await generateBadge({
    lorc: stats.total_lorc,
    metrics,
    name: `@${user}`,
    variant,
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
