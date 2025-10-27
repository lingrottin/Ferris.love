import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type DrizzleD1Database, drizzle as d } from "drizzle-orm/d1";
import * as schema from "./schema";

type DB = DrizzleD1Database<typeof schema>;

export async function makeDb(): Promise<DB> {
  const { env } = await getCloudflareContext({ async: true });
  return d(env.DB, { schema });
}
