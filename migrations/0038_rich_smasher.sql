ALTER TABLE `game_downloads` ADD `seerr_external_request_id` text;--> statement-breakpoint
CREATE INDEX `game_downloads_seerr_request_idx` ON `game_downloads` (`seerr_external_request_id`);