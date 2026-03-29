"use server";

import { auth } from "@/auth";
import { agh } from "@/octokit";

export async function getAvailableRepos() {
  const session = await auth();
  const app = await agh();
  const inst_id = (
    await app.octokit.request("GET /users/{username}/installation", {
      username: session?.user.login ?? "",
    })
  ).data.id;
  const inst = await app.getInstallationOctokit(inst_id);
  const data = (
    await inst.request("GET /installation/repositories", {
      headers: { "X-GitHub-Api-Version": "2026-03-10" },
    })
  ).data;
  return data;
}
