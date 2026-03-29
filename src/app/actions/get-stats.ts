"use server";

import { and, eq, sql } from "drizzle-orm";
import { repoStats, repos, userRepos } from "@/db/schema";
import { makeDb } from "@/db/util";

export type SingleRepoStat = {
  repoId: string;
  name: string;
  owner: string;
  private: boolean;
  commitSha: string;
  fn_calls: number;
  method_calls: number;
  var_defs: number;
  lorc: number;
};

export type GetStatsResult = {
  total_repos: number;
  total_lorc: number;
  total_fn_calls: number;
  total_method_calls: number;
  total_var_defs: number;
  repos: SingleRepoStat[];
};

export async function getStats(user: string): Promise<GetStatsResult> {
  const db = await makeDb();
  const latestPerRepo = db
    .select({
      repoId: repoStats.repoId,
      maxAnalyzedAt: sql<number>`MAX(${repoStats.analyzedAt})`.as(
        "maxAnalyzedAt",
      ),
    })
    .from(repoStats)
    .innerJoin(repos, eq(repoStats.repoId, repos.githubRepoId))
    .innerJoin(userRepos, eq(userRepos.repoId, repos.githubRepoId))
    .where(and(eq(repoStats.status, "done"), eq(userRepos.userId, user)))
    .groupBy(repoStats.repoId)
    .as("latest_per_repo");
  const latestStats = db
    .select({
      id: repoStats.id,
      repoId: repoStats.repoId,
      status: repoStats.status,
      lorc: repoStats.lorc,
      commitSha: repoStats.commitSha,
      analyzedAt: repoStats.analyzedAt,
      callFn: repoStats.callFn,
      callMethod: repoStats.callMethod,
      defVar: repoStats.defVar,
    })
    .from(repoStats)
    .innerJoin(
      latestPerRepo,
      and(
        eq(repoStats.repoId, latestPerRepo.repoId),
        eq(repoStats.analyzedAt, latestPerRepo.maxAnalyzedAt),
      ),
    )
    .where(eq(repoStats.status, "done"))
    .as("latest_stats");
  const totalsRow = await db
    .select({
      totalRepos: sql<number>`COUNT(*)`,
      totalLorc: sql<number>`COALESCE(SUM(${latestStats.lorc}), 0)`,
      totalFnCalls: sql<number>`COALESCE(SUM(${latestStats.callFn}), 0)`,
      totalMethodCalls: sql<number>`COALESCE(SUM(${latestStats.callMethod}), 0)`,
      totalVarDefs: sql<number>`COALESCE(SUM(${latestStats.defVar}), 0)`,
    })
    .from(latestStats)
    .then(
      (rows) =>
        rows[0] ?? {
          totalRepos: 0,
          totalLorc: 0,
          totalFnCalls: 0,
          totalMethodCalls: 0,
          totalVarDefs: 0,
        },
    );
  const reposList = await db
    .select({
      repoId: repos.githubRepoId,
      name: repos.name,
      owner: repos.ownerLogin,
      private: repos.isPrivate,
      commitSha: latestStats.commitSha,
      fn_calls: latestStats.callFn,
      method_calls: latestStats.callMethod,
      var_defs: latestStats.defVar,
      lorc: latestStats.lorc,
    })
    .from(latestStats)
    .innerJoin(repos, eq(repos.githubRepoId, latestStats.repoId))
    .orderBy(sql`${latestStats.analyzedAt} DESC`);

  return {
    total_repos: totalsRow.totalRepos,
    total_lorc: totalsRow.totalLorc,
    total_fn_calls: totalsRow.totalFnCalls,
    total_method_calls: totalsRow.totalMethodCalls,
    total_var_defs: totalsRow.totalVarDefs,
    repos: reposList.map((r) => ({ ...r, private: !!r.private })),
  };
}
