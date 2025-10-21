import { getCloudflareContext } from "@opennextjs/cloudflare";
import { App, Octokit } from "octokit";
import {
  ProxyAgent,
  type RequestInfo,
  type RequestInit,
  fetch as undiciFetch,
} from "undici";

// this is for debugging; comment this before deploying
const proxiedFetch = (url: RequestInfo, options: RequestInit) => {
  return undiciFetch(url, {
    ...options,
    dispatcher: new ProxyAgent("http://localhost:10808"),
  });
};

export function gh(cf_env?: CloudflareEnv) {
  const env = cf_env !== undefined ? cf_env : getCloudflareContext().env;
  return new App({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.trim(),
    clientId: env.AUTH_GITHUB_ID,
    clientSecret: env.AUTH_GITHUB_SECRET,
    Octokit: Octokit.defaults({
      request: {
        fetch: proxiedFetch,
      },
    }),
  });
}

export async function agh() {
  const env = (await getCloudflareContext({ async: true })).env;
  return new App({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.trim(),
    clientId: env.AUTH_GITHUB_ID,
    clientSecret: env.AUTH_GITHUB_SECRET,
  });
}
