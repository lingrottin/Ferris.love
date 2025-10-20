import { getCloudflareContext } from "@opennextjs/cloudflare";
import { App } from "octokit";

const { env } = getCloudflareContext();
export const gh = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY.trim(),
  clientId: env.AUTH_GITHUB_ID,
  clientSecret: env.AUTH_GITHUB_SECRET,
});
