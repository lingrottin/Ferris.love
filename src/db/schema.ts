import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// 🧍‍♂️ Users
export const users = sqliteTable("users", {
  githubId: text("github_id").notNull().unique(),
  login: text("login").notNull().unique(),
  meta: text("meta", { mode: "json" })
    .$type<Record<string, any>>()
    .default(sql`json('{}')`),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
});

// 🏗️ Repos
export const repos = sqliteTable("repos", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()), // 👈 UUID v7 在 Workers 可直接生成
  githubRepoId: text("github_repo_id").notNull().unique(),
  ownerLogin: text("owner_login").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  isPrivate: integer("is_private", { mode: "boolean" }).default(false),
  status: text("status", { enum: ["queued", "analyzing", "done", "failed"] })
    .notNull()
    .default("queued"),
  lastScanAt: integer("last_scan_at", { mode: "timestamp_ms" }),
  scanError: text("scan_error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
});

// 👥 User ↔ Repo 多对多中间表
export const userRepos = sqliteTable(
  "user_repos",
  {
    userId: text("user_id").notNull(), // references users.githubId
    repoId: text("repo_id").notNull(), // references repos.id
    role: text("role", { enum: ["owner", "collaborator"] }).default("owner"),
    addedAt: integer("added_at", { mode: "timestamp_ms" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.repoId] }),
  }),
);

// 📊 Repo Stats
export const repoStats = sqliteTable("repo_stats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()), // 👈 UUID v7
  repoId: text("repo_id").notNull(), // references repos.id
  commitSha: text("commit_sha").notNull(),
  counts: text("counts", { mode: "json" })
    .$type<Record<string, number>>()
    .notNull(),
  analyzedAt: integer("analyzed_at", { mode: "timestamp_ms" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
});
