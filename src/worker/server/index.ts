// Sub-routers definitions

import { Hono } from "hono";
import * as z from "zod";
import { router } from "./trpc";

// tRPC part

export const trpcRouter = router({
  // TODO
});

export type TrpcRouter = typeof trpcRouter;

// Hono API part

const api = new Hono<{ Bindings: Env }>();

api.get("/invoke-github-login", async (c) => {
  const client_id = c.env.GITHUB_CLIENT_ID;
  return c.redirect(
    `https://github.com/login/oauth/authorize?client_id=${client_id}`,
  );
});

api.get("/invoke-github-install", c => {
  const app_name = c.env.GITHUB_APP_NAME;
  return c.redirect(`https://github.com/apps/${app_name}/installations/new`);
})

export const apiRouter = api;
