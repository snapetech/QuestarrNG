ALTER TABLE `games` ADD `expansions` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `release_name_blacklist` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `hide_shelved_by_default` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `hide_owned_in_has_results` integer DEFAULT true NOT NULL;