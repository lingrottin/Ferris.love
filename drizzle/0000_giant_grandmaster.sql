CREATE TABLE `repo_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`repo_id` text NOT NULL,
	`commit_sha` text NOT NULL,
	`counts` text NOT NULL,
	`analyzed_at` integer,
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`github_repo_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repo_commit_unique` ON `repo_stats` (`repo_id`,`commit_sha`);--> statement-breakpoint
CREATE TABLE `repos` (
	`github_repo_id` text PRIMARY KEY NOT NULL,
	`owner_login` text NOT NULL,
	`name` text NOT NULL,
	`is_private` integer DEFAULT false,
	`status` text DEFAULT 'queued' NOT NULL,
	`last_scan_at` integer,
	`scan_error` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_repo_unique` ON `repos` (`owner_login`,`name`);--> statement-breakpoint
CREATE TABLE `user_repos` (
	`user_id` text NOT NULL,
	`repo_id` text NOT NULL,
	`role` text DEFAULT 'owner',
	`added_at` integer,
	`updated_at` integer,
	PRIMARY KEY(`user_id`, `repo_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`github_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`github_repo_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`github_id` text PRIMARY KEY NOT NULL,
	`auth_id` text NOT NULL,
	`login` text NOT NULL,
	`meta` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth_id_unique` ON `users` (`auth_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_login_unique` ON `users` (`login`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_id` ON `users` (`auth_id`);