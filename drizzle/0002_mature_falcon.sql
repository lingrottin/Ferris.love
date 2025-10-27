DROP INDEX `auth_id`;--> statement-breakpoint
CREATE UNIQUE INDEX `auth_id_unique` ON `users` (`auth_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `login_unique` ON `users` (`login`);--> statement-breakpoint
CREATE INDEX `idx_repo_stats_repo_analyzed_at` ON `repo_stats` (`repo_id`,`analyzed_at`);--> statement-breakpoint
CREATE INDEX `idx_repos_created_at` ON `repos` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_user_repos_user_id` ON `user_repos` (`user_id`);