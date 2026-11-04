import { sql } from "drizzle-orm";
import { repoStats, repos, userRepos } from "@/db/schema";
import type { makeDb } from "@/db/util";
import type { Counts } from "@/lib/utils";

export async function getRepo(
  owner: string,
  name: string,
  db: Awaited<ReturnType<typeof makeDb>>,
) {
  const repo = await db
    .select()
    .from(repos)
    .where(sql`${repos.ownerLogin} = ${owner} AND ${repos.name} = ${name}`)
    .then((rows) => rows[0] ?? null);
  return repo;
}

export async function getRepoStats(
  repoId: string,
  db: Awaited<ReturnType<typeof makeDb>>,
) {
  const stats = await db
    .select()
    .from(repoStats)
    .where(
      sql`${repoStats.repoId} = ${repoId} AND ${repoStats.status} = 'done'`,
    )
    .orderBy(sql`${repoStats.requestedAt} DESC, ${repoStats.id} DESC`)
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!stats) return null;

  return {
    ...stats,
    counts: JSON.parse(stats.counts) as Counts,
  };
}

export async function verifyRepoRelationship(
  repoId: string,
  userId: string,
  db: Awaited<ReturnType<typeof makeDb>>,
) {
  const relation = await db
    .select()
    .from(userRepos)
    .where(
      sql`${userRepos.repoId} = ${repoId} AND ${userRepos.userId} = ${userId}`,
    )
    .then((rows) => rows[0] ?? null);
  return !!relation;
}
