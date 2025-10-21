import { cache } from "react";
import { gh } from "@/octokit";

export const getGithubInstallation = cache(async (username: string) => {
  return await gh()
    .octokit.request(`/users/${username}/installation`)
    .then((resp) => resp.data.id as number)
    .catch((_) => null);
});
