"use server";

import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { agh } from "@/octokit";

const getAvailableReposCached = unstable_cache(
  async (login: string) => {
    try {
      const app = await agh();
      const inst_id = (
        await app.octokit.request("GET /users/{username}/installation", {
          username: login,
        })
      ).data.id;
      const inst = await app.getInstallationOctokit(inst_id);

      return (
        await inst.request("GET /installation/repositories", {
          headers: { "X-GitHub-Api-Version": "2026-03-10" },
        })
      ).data;
    } catch {
      return { total_count: 0, repositories: [] };
    }
  },
  ["available-repos"],
  { revalidate: 300 },
);

export async function getAvailableRepos() {
  const session = await auth();
  const login = session?.user.login;

  if (!login) {
    return { repositories: [] };
  }

  return getAvailableReposCached(login);
}
