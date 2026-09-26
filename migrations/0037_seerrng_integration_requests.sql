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
CREATE UNIQUE INDEX `integration_requests_user_external_id_idx` ON `integration_requests` (`user_id`,`external_request_id`);
--> statement-breakpoint
CREATE INDEX `integration_requests_game_id_idx` ON `integration_requests` (`game_id`);
