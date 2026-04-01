"use server";

import { agh } from "@/octokit";

const PER_PAGE = 50;

export async function getAvailableRepos(
  login: string | null | undefined,
  page = 1,
) {
  "use cache";

  if (!login) {
    return {
      total_count: 0,
      repositories: [],
      page,
      per_page: PER_PAGE,
      has_more: false,
    };
  }

  try {
    const app = await agh();
    const inst_id = (
      await app.octokit.request("GET /users/{username}/installation", {
        username: login,
      })
    ).data.id;
    const inst = await app.getInstallationOctokit(inst_id);

    const data = (
      await inst.request("GET /installation/repositories", {
        headers: { "X-GitHub-Api-Version": "2026-03-10" },
        per_page: PER_PAGE,
        page,
      })
    ).data;

    return {
      ...data,
      page,
      per_page: PER_PAGE,
      has_more: page * PER_PAGE < data.total_count,
    };
  } catch {
    return {
      total_count: 0,
      repositories: [],
      page,
      per_page: PER_PAGE,
      has_more: false,
    };
  }
}
