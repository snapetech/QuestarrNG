ALTER TABLE "games" ADD COLUMN "expansions" jsonb;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "release_name_blacklist" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "hide_shelved_by_default" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "hide_owned_in_has_results" boolean DEFAULT true NOT NULL;