CREATE TABLE `ai_auto_download_holds` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`release_title` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_auto_download_holds_game_title_idx` ON `ai_auto_download_holds` (`game_id`,`release_title`);--> statement-breakpoint
CREATE TABLE `game_journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`note` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_journal_entries_game_user_idx` ON `game_journal_entries` (`game_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `game_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`completed_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_milestones_game_user_idx` ON `game_milestones` (`game_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `game_screenshots` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`file_path` text NOT NULL,
	`caption` text,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_screenshots_game_user_idx` ON `game_screenshots` (`game_id`,`user_id`);--> statement-breakpoint
INSERT INTO `game_journal_entries` (`id`, `game_id`, `user_id`, `note`)
SELECT lower(hex(randomblob(16))), `id`, `user_id`, `notes`
FROM `games`
WHERE `notes` IS NOT NULL AND trim(`notes`) <> '' AND `user_id` IS NOT NULL;--> statement-breakpoint
CREATE TABLE `integration_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`external_request_id` text NOT NULL,
	`game_id` text,
	`download_id` text,
	`title` text NOT NULL,
	`operating_system` text,
	`architecture` text,
	`status` text DEFAULT 'accepted' NOT NULL,
	`error_message` text,
	`attempted_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`download_id`) REFERENCES `game_downloads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_requests_user_external_id_idx` ON `integration_requests` (`user_id`,`external_request_id`);--> statement-breakpoint
CREATE INDEX `integration_requests_game_id_idx` ON `integration_requests` (`game_id`);--> statement-breakpoint
ALTER TABLE `games` ADD `target_operating_system` text;--> statement-breakpoint
ALTER TABLE `games` ADD `target_architecture` text;--> statement-breakpoint
ALTER TABLE `games` DROP COLUMN `notes`;
