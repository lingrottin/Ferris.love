"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { repos, userRepos, users } from "@/db/schema";
import { makeDb } from "@/db/util";

type UnregisterResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function unregisterAccount(): Promise<UnregisterResult> {
  const session = await auth();
  if (!session?.user?.db?.githubId) {
    return { ok: false, error: "Unauthorized" };
  }

  const userId = session.user.db.githubId;
  const db = await makeDb();

  const linkedRepos = await db
    .select({ repoId: userRepos.repoId })
    .from(userRepos)
    .where(eq(userRepos.userId, userId));

  const repoIds = linkedRepos.map((row) => row.repoId);

  if (repoIds.length > 0) {
    await db.delete(userRepos).where(eq(userRepos.userId, userId));

    const remainingLinks = await db
      .select({
        repoId: userRepos.repoId,
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(userRepos)
      .where(inArray(userRepos.repoId, repoIds))
      .groupBy(userRepos.repoId);

    const remainingRepoIds = new Set(remainingLinks.map((row) => row.repoId));
    const orphanedRepoIds = repoIds.filter(
      (repoId) => !remainingRepoIds.has(repoId),
    );

    if (orphanedRepoIds.length > 0) {
      await db
        .delete(repos)
        .where(inArray(repos.githubRepoId, orphanedRepoIds));
    }
  }

  await db.delete(users).where(eq(users.githubId, userId));

  return { ok: true };
}
