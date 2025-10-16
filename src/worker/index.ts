import GitHub from "@auth/core/providers/github";
import { D1Adapter } from "@auth/d1-adapter";
import { authHandler, initAuthConfig, verifyAuth } from "@hono/auth-js";
import { trpcServer } from "@hono/trpc-server";
import { type Context, Hono } from "hono";
import { apiRouter, trpcRouter } from "./server/index";

const app = new Hono<{ Bindings: Env }>();

app.use("/trpc/*", trpcServer({ router: trpcRouter }));
app.use(
  "*",
  initAuthConfig((c: Context<{ Bindings: Env }>) => ({
    secret: c.env.AUTH_SECRET,
    providers: [
      GitHub({
        clientId: c.env.GITHUB_CLIENT_ID,
        clientSecret: c.env.GITHUB_TOKEN,
      }),
    ],
    adapter: D1Adapter(c.env.DB),
  })),
);

app.use("/api/auth/*", authHandler());

//app.use("/api/*", verifyAuth());

app.route("/api", apiRouter);

export default app;
