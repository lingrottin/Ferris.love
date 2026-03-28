import { D1Adapter, up } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, type InferSelectModel } from "drizzle-orm";
import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import { users } from "@/db/schema";
import { makeDb } from "@/db/util";

declare module "next-auth" {
  interface Session {
    user: {
      db?: InferSelectModel<typeof users>;
    } & DefaultSession["user"];
  }
}

let _migrationChecked = false;
let _migrationPromise: Promise<void> | null = null;

async function ensureDbMigrated(env: CloudflareEnv): Promise<void> {
  if (_migrationChecked) return;
  if (_migrationPromise) return _migrationPromise;

  _migrationPromise = (async () => {
    try {
      const v = await env.KV.get("root:auth:db_migrated");
      if (v !== "true") {
        await up(env.DB_AUTH);
        await env.KV.put("root:auth:db_migrated", "true");
      }
      _migrationChecked = true;
    } catch (e) {
      console.error("Error migrating database:", e);
    }
  })();

  return _migrationPromise;
}

// biome-ignore lint/suspicious/noTsIgnore : idk why ts is mad
// @ts-ignore
export const { handlers, signIn, signOut, auth } = NextAuth(async (_) => {
  const { env } = getCloudflareContext();
  await ensureDbMigrated(env);

  return {
    providers: [GitHub],
    adapter: D1Adapter(env.DB_AUTH),
    callbacks: {
      async signIn({ profile, user }) {
        if (!profile) return false;
        const db = await makeDb();

        const githubId = String(profile.id);
        const login = String(profile.login);
        const authId = user.id || "";

        const existing = await db
          .select()
          .from(users)
          .where(eq(users.githubId, githubId));

        if (existing.length === 0) {
          try {
            await db.insert(users).values({
              githubId,
              authId,
              login,
            });
          } catch (e) {
            console.error("Failed to insert user:", e);
          }
        } else if (existing[0].authId !== authId && authId) {
          try {
            await db
              .update(users)
              .set({ authId, login, updatedAt: Math.floor(Date.now() / 1000) })
              .where(eq(users.githubId, githubId));
          } catch (e) {
            console.error("Failed to update user:", e);
          }
        }
        return true;
      },
      async session({ session }) {
        if (!session.user?.id) return session;
        const db = await makeDb();
        const u = await db
          .select()
          .from(users)
          .where(eq(users.authId, session.user.id));
        if (u.length > 0) {
          session.user.db = u[0];
        }
        return session;
      },
    },
  };
});
