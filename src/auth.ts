import { D1Adapter, up } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, type InferSelectModel } from "drizzle-orm";
import NextAuth, { type DefaultSession } from "next-auth";
import authConfig from "@/auth.config";
import { users } from "@/db/schema";
import { makeDb } from "@/db/util";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      login?: string;
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

export const { handlers, signIn, signOut, auth } = NextAuth(async (_) => {
  const { env } = getCloudflareContext();
  await ensureDbMigrated(env);

  return {
    ...authConfig,
    adapter: D1Adapter(env.DB_AUTH),
    session: { strategy: "jwt" },
    callbacks: {
      ...(authConfig.callbacks ?? {}),
      async signIn({ profile, user }) {
        if (!profile) return false;
        const db = await makeDb();
        const u = await db
          .select()
          .from(users)
          .where(eq(users.authId, user.id ?? ""));
        if (u.length === 0) {
          const v = {
            githubId: String(profile.id),
            authId: user.id || "",
            login: String(profile.login),
          };
          try {
            await db.insert(users).values(v);
          } catch (e) {
            console.log(e);
          }
        }
        return true;
      },
      async session({ session, token }) {
        if (token.githubId) {
          session.user.id = token.githubId as string;
        }
        if (token.login) {
          session.user.login = token.login as string;
        }
        const db = await makeDb();
        const u = await db
          .select()
          .from(users)
          .where(eq(users.githubId, session.user.id ?? ""));
        if (u.length > 0) {
          session.user.db = u[0];
        }
        return session;
      },
    },
  };
});
