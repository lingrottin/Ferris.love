import { sql } from "drizzle-orm";
import { cache } from "react";
import { repoStats, repos, userRepos } from "@/db/schema";
import type { makeDb } from "@/db/util";
import { gh } from "@/octokit";

export const getGithubInstallation = cache(async (username: string) => {
  return await gh()
    .octokit.request(`/users/${username}/installation`)
    .then((resp) => resp.data.id as number)
    .catch((_) => {
      console.error(_);
      return null;
    });
});

export async function getUserRepos(
  githubId: string,
  db: Awaited<ReturnType<typeof makeDb>>,
  page: number,
) {
  const m = (page - 1) * 15;

  // ① 最新一次分析记录（带 ROW_NUMBER）
  const latestStats = db.$with("latest_stats").as(
    db
      .select({
        repoId: repoStats.repoId,
        lorc: repoStats.lorc,
        analyzedAt: repoStats.analyzedAt,
        rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${repoStats.repoId} ORDER BY ${repoStats.requestedAt} DESC, ${repoStats.id} DESC)`.as(
          "rn",
        ),
      })
      .from(repoStats),
  );

  // ② 用户的仓库 + 最新统计
  const joined = db.$with("joined").as(
    db
      .with(latestStats)
      .select({
        repoId: repos.githubRepoId,
        ownerLogin: repos.ownerLogin,
        name: repos.name,
        status: repos.status,
        lorc: sql<number>`COALESCE(${latestStats.lorc}, 0)`.as("lorc"),
        analyzedAt: latestStats.analyzedAt,
        totalCount: sql<number>`COUNT(*) OVER ()`.as("total_count"),
      })
      .from(userRepos)
      .innerJoin(repos, sql`${userRepos.repoId} = ${repos.githubRepoId}`)
      .leftJoin(
        latestStats,
        sql`${latestStats.repoId} = ${repos.githubRepoId} AND ${latestStats.rn} = 1`,
      )
      .where(sql`${userRepos.userId} = ${githubId}`)
      .orderBy(sql`${repos.createdAt} DESC`)
      .limit(15)
      .offset(m),
  );

  // ③ 执行查询
  const results = await db.with(joined).select().from(joined);

  // ④ 整理结果
  const reposData = results.map((r) => ({
    repoId: r.repoId,
    ownerLogin: r.ownerLogin,
    name: r.name,
    status: r.status,
    lorc: r.lorc,
    analyzedAt: r.analyzedAt,
  }));

  const totalCount = results[0]?.totalCount ?? 0;

  return { reposData, totalCount };
}
