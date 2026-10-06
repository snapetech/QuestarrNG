ALTER TABLE `game_downloads` ADD `category` text;--> statement-breakpoint
ALTER TABLE `game_files` ADD `category_overridden` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `installed_version` text;