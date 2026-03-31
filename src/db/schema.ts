import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";

const nowSeconds = () => Math.floor(Date.now() / 1000);

/* ------------------------------------------
 * users — GitHub 用户表
 * ------------------------------------------ */
export const users = sqliteTable(
  "users",
  {
    githubId: text("github_id").primaryKey(),
    authId: text("auth_id").notNull().unique(),
    login: text("login").notNull().unique(),
    meta: text("meta")
      .notNull()
      .default("{}" as const),
    createdAt: integer("created_at").notNull().$defaultFn(nowSeconds),
    updatedAt: integer("updated_at").notNull().$defaultFn(nowSeconds),
  },
  (table) => [
    uniqueIndex("auth_id_unique").on(table.authId),
    uniqueIndex("login_unique").on(table.login),
  ],
);

/* ------------------------------------------
 * repos — 仓库表
 * ------------------------------------------ */
export const repos = sqliteTable(
  "repos",
  {
    githubRepoId: text("github_repo_id").primaryKey(),
    ownerLogin: text("owner_login").notNull(),
    name: text("name").notNull(),
    isPrivate: integer("is_private", { mode: "boolean" }).default(false),
    status: text("status", {
      enum: ["queued", "analyzing", "done", "failed"],
    })
      .notNull()
      .default("queued"),
    lastScanAt: integer("last_scan_at"),
    scanError: text("scan_error"),
    webhookSecret: text("webhook_secret"),
    webhookInstalled: integer("webhook_installed", { mode: "boolean" }).default(
      false,
    ),
    createdAt: integer("created_at").$defaultFn(nowSeconds),
  },
  (table) => [
    // 用户 + 仓库名 唯一约束
    uniqueIndex("owner_repo_unique").on(table.ownerLogin, table.name),
    // 为按时间排序的查询添加索引
    index("idx_repos_created_at").on(table.createdAt),
  ],
);

/* ------------------------------------------
 * user_repos — 用户与仓库的多对多关系表
 * ------------------------------------------ */
export const userRepos = sqliteTable(
  "user_repos",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.githubId, { onDelete: "cascade" }),
    repoId: text("repo_id")
      .notNull()
      .references(() => repos.githubRepoId, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "collaborator"] }).default("owner"),
    addedAt: integer("added_at").$defaultFn(nowSeconds),
    updatedAt: integer("updated_at").$defaultFn(nowSeconds),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.repoId] }),
    // 为通过用户查仓库加速
    index("idx_user_repos_user_id").on(table.userId),
  ],
);

/* ------------------------------------------
 * repo_stats — 仓库分析结果表
 * ------------------------------------------ */
export const repoStats = sqliteTable(
  "repo_stats",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    repoId: text("repo_id")
      .notNull()
      .references(() => repos.githubRepoId, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["analyzing", "done", "error"],
    })
      .notNull()
      .default("analyzing"),
    lorc: integer("lorc").notNull().default(0),
    commitSha: text("commit_sha").notNull(),
    counts: text("counts").notNull().default("{}"),
    analyzedAt: integer("analyzed_at").$defaultFn(nowSeconds),
    callFn: integer("call_fn").notNull().default(0),
    callMethod: integer("call_method").notNull().default(0),
    defVar: integer("def_var").notNull().default(0),
  },
  (table) => [
    uniqueIndex("repo_commit_unique").on(table.repoId, table.commitSha),
    // 为按 analyzed_at DESC 查找最新 stat 加速
    index("idx_repo_stats_repo_analyzed_at").on(table.repoId, table.analyzedAt),
    index("idx_repo_stats_status_repo_id_analyzed_at").on(
      table.status,
      table.repoId,
      table.analyzedAt,
    ),
  ],
);
