import { D1Adapter, up } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import NextAuth from "next-auth";
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
    providers: [GitHub],
    adapter: D1Adapter(env.DB),
  };
});
