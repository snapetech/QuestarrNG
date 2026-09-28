CREATE TABLE "ai_auto_download_holds" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"release_title" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" bigint DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint
);
--> statement-breakpoint
CREATE TABLE "game_journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"note" text NOT NULL,
	"created_at" bigint DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint
);
--> statement-breakpoint
CREATE TABLE "game_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"completed_at" bigint,
	"created_at" bigint DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint
);
--> statement-breakpoint
CREATE TABLE "game_screenshots" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"file_path" text NOT NULL,
	"caption" text,
	"created_at" bigint DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint
);
--> statement-breakpoint
CREATE TABLE "integration_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"external_request_id" text NOT NULL,
	"game_id" text,
	"download_id" text,
	"title" text NOT NULL,
	"operating_system" text,
	"architecture" text,
	"status" text DEFAULT 'accepted' NOT NULL,
	"error_message" text,
	"attempted_at" bigint DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
	"created_at" bigint DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
	"updated_at" bigint DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint
);
--> statement-breakpoint
ALTER TABLE "game_downloads" ADD COLUMN "seerr_external_request_id" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "target_operating_system" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "target_architecture" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "seerr_external_request_id" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "seerr_variant" jsonb;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "seerr_cancelled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "seerr_dispatching" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "seerr_recovery_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_auto_download_holds" ADD CONSTRAINT "ai_auto_download_holds_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_journal_entries" ADD CONSTRAINT "game_journal_entries_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_journal_entries" ADD CONSTRAINT "game_journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_milestones" ADD CONSTRAINT "game_milestones_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_milestones" ADD CONSTRAINT "game_milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_screenshots" ADD CONSTRAINT "game_screenshots_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_screenshots" ADD CONSTRAINT "game_screenshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_requests" ADD CONSTRAINT "integration_requests_download_id_game_downloads_id_fk" FOREIGN KEY ("download_id") REFERENCES "public"."game_downloads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_auto_download_holds_game_title_idx" ON "ai_auto_download_holds" USING btree ("game_id","release_title");--> statement-breakpoint
CREATE INDEX "game_journal_entries_game_user_idx" ON "game_journal_entries" USING btree ("game_id","user_id");--> statement-breakpoint
CREATE INDEX "game_milestones_game_user_idx" ON "game_milestones" USING btree ("game_id","user_id");--> statement-breakpoint
CREATE INDEX "game_screenshots_game_user_idx" ON "game_screenshots" USING btree ("game_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_requests_user_external_id_idx" ON "integration_requests" USING btree ("user_id","external_request_id");--> statement-breakpoint
CREATE INDEX "integration_requests_game_id_idx" ON "integration_requests" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_downloads_seerr_request_idx" ON "game_downloads" USING btree ("seerr_external_request_id");--> statement-breakpoint
INSERT INTO "game_journal_entries" ("id", "game_id", "user_id", "note")
SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", "user_id", "notes"
FROM "games"
WHERE "notes" IS NOT NULL AND btrim("notes") <> '' AND "user_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_seerr_external_request_id_unique" UNIQUE("seerr_external_request_id");
