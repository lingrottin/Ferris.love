import { getCloudflareContext } from "@opennextjs/cloudflare";
import { App } from "octokit";

export function gh(cf_env?: CloudflareEnv) {
  const env = cf_env !== undefined ? cf_env : getCloudflareContext().env
  return new App({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.trim(),
    clientId: env.AUTH_GITHUB_ID,
    clientSecret: env.AUTH_GITHUB_SECRET,
  });
}

export async function agh (){
  const env=(await getCloudflareContext({async:true})).env;
  return new App({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.trim(),
    clientId: env.AUTH_GITHUB_ID,
    clientSecret: env.AUTH_GITHUB_SECRET,
  });}

