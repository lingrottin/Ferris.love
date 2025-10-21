import { D1Adapter, up } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { User as NextAuthUser, Session } from "next-auth";
import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth(async (_) => {
  const { env } = getCloudflareContext();
  if ((await env.KV.get("root:auth:db_migrated")) !== "true") {
    try {
      await up(env.DB);
      await env.KV.put("root:auth:db_migrated", "true");
    } catch (e) {
      console.error("Error migrating database:", e);
    }
  }
  return {
    session: {
      strategy: "jwt",
    },
    providers: [
      GitHub({
        clientId: env.AUTH_GITHUB_ID,
        clientSecret: env.AUTH_GITHUB_SECRET,
        profile(profile) {
          // Ensure login is preserved from GitHub profile
          const mapped: Partial<NextAuthUser> & { login?: string } = {
            id: String(profile.id),
            name: profile.name ?? profile.login,
            email: profile.email,
            image: profile.avatar_url,
            login: profile.login,
          };
          return mapped as unknown as NextAuthUser;
        },
      }),
    ],
    adapter: D1Adapter(env.DB),
    callbacks: {
      async jwt({ token, user, profile }): Promise<JWT> {
        // Ensure token exists
        if (!token) token = {} as JWT;
        // Persist GitHub login from profile into token (defensive)
        const profileLogin = (profile as unknown as { login?: string })?.login;
        if (typeof profileLogin === "string" && profileLogin.length > 0) {
          (token as JWT & { login?: string }).login = profileLogin;
        }
        // Also persist from user if present (database row)
        const userLogin = (user as NextAuthUser & { login?: string })?.login;
        if (typeof userLogin === "string" && userLogin.length > 0) {
          (token as JWT & { login?: string }).login = userLogin;
        }
        return token;
      },
      async session({ session, token, user }) {
        try {
          const userLogin = (user as NextAuthUser & { login?: string })?.login;
          const tokenLogin = (token as JWT & { login?: string })?.login;
          const login =
            typeof userLogin === "string" && userLogin.length > 0
              ? userLogin
              : tokenLogin;
          if (login && login.length > 0) {
            if (!session) return {} as Session;
            if (!session.user) {
              (session as Session).user = {
                name: undefined,
                email: undefined,
              } as unknown as Session["user"];
            }
            (session as Session).user.login = login;
          }
        } catch (e) {
          console.warn("session callback: error while setting login", e);
        }
        return session;
      },
    },
  };
});
