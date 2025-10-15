import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { apiRouter, trpcRouter } from "./server/index";

const app = new Hono<{ Bindings: Env }>();

app.use("/trpc/*", trpcServer({ router: trpcRouter }));
app.route("/api", apiRouter);

export default app;
