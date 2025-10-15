// Sub-routers definitions

// tRPC part
import { router } from "./trpc";

export const trpcRouter = router({
  // TODO
});

export type TrpcRouter = typeof trpcRouter;

// Hono API part
import { Hono } from "hono";
import * as z from "zod";
const api = new Hono<{ Bindings: Env }>();
api.get("/github-setup", async (c) => {
  const queries = c.req.queries();
  if (!queries.code || typeof queries.code[0] !== "string") {
    return c.json({ error: "Missing code parameter" }, 400);
  }
  const code = queries.code[0];
  const secret = c.env.GITHUB_TOKEN;

  const GithubAccessTokenSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
    scope: z.string(),
  });
  const GitHubUserSchema = z.object({
    // we only need this for now
    id: z.number(),
    login: z.string(),
  });

    const resp_u = await (await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${secret}`,
        "User-Agent": "Ferris.love",
      },
      body: new URLSearchParams({
        client_id: c.env.GITHUB_CLIENT_ID,
        client_secret: secret,
        code,
      }),
    })).json();
    if((resp_u as {error?: string}).error){
      const d=(resp_u as {error_description?: string}).error_description || "It seems that the code is invalid.";
      return c.redirect(`/error?type=github-connect&message=${d}`)
    }
    const resp = GithubAccessTokenSchema.parse(resp_u);
    const user_u= await (await fetch("https://api.github.com/user", {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${resp.access_token}`,
        "User-Agent": "Ferris.love",
      },
    })).json();
    if((user_u as {message?:string}).message){
      const d=(user_u as {message?: string}).message || "It seems that the access token is invalid.";
      return c.redirect(`/error?type=github-connect&message=${d}`)
    }
    const user = GitHubUserSchema.parse(user_u);
    c.env.DB.prepare("INSERT INTO github_users (github_id, github_login, access_token) VALUES (?, ?, ?)")
      .bind(user.id, user.login, resp.access_token)
      .run();
    console.log(`Connected GitHub user ${user.login} (ID ${user.id})`);
    return c.redirect("/user-home");

});

api.get("/invoke-github-setup", async (c) => {
  const client_id = c.env.GITHUB_CLIENT_ID;
  return c.redirect(
    `https://github.com/login/oauth/authorize?client_id=${client_id}`,
  );
});

export const apiRouter = api;
