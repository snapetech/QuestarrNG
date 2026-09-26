ALTER TABLE `games` ADD `seerr_external_request_id` text;--> statement-breakpoint
ALTER TABLE `games` ADD `seerr_variant` text;--> statement-breakpoint
ALTER TABLE `games` ADD `seerr_cancelled` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `games_seerr_external_request_id_unique` ON `games` (`seerr_external_request_id`);