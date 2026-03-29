ALTER TABLE `repo_stats` ADD `call_fn` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `repo_stats` ADD `call_method` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `repo_stats` ADD `def_var` text DEFAULT '{}' NOT NULL;