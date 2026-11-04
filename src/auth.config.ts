import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

const authConfig = {
  providers: [
    GitHub({
      issuer: "https://github.com/login/oauth",
      profile(profile) {
        return {
          id: String(profile.id),
          login: profile.login as string,
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, profile, user }) {
      if (profile) {
        token.githubId = String(profile.id);
        token.login = profile.login as string;
      }
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
