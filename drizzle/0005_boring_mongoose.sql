PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_repo_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`repo_id` text NOT NULL,
	`status` text DEFAULT 'analyzing' NOT NULL,
	`lorc` integer DEFAULT 0 NOT NULL,
	`commit_sha` text NOT NULL,
	`counts` text DEFAULT '{}' NOT NULL,
	`analyzed_at` integer,
	`call_fn` integer DEFAULT 0 NOT NULL,
	`call_method` integer DEFAULT 0 NOT NULL,
	`def_var` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`github_repo_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_repo_stats`("id", "repo_id", "status", "lorc", "commit_sha", "counts", "analyzed_at", "call_fn", "call_method", "def_var") SELECT "id", "repo_id", "status", "lorc", "commit_sha", "counts", "analyzed_at", "call_fn", "call_method", "def_var" FROM `repo_stats`;--> statement-breakpoint
DROP TABLE `repo_stats`;--> statement-breakpoint
ALTER TABLE `__new_repo_stats` RENAME TO `repo_stats`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `repo_commit_unique` ON `repo_stats` (`repo_id`,`commit_sha`);--> statement-breakpoint
CREATE INDEX `idx_repo_stats_repo_analyzed_at` ON `repo_stats` (`repo_id`,`analyzed_at`);