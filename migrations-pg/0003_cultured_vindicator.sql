ALTER TABLE "platform_mappings" ADD COLUMN "romm_platform_slug" text;
--> statement-breakpoint
UPDATE "platform_mappings" SET "romm_platform_slug" = CASE lower("source_platform_name")
  WHEN 'nes' THEN 'nes' WHEN 'snes' THEN 'snes' WHEN 'n64' THEN 'n64'
  WHEN 'ngc' THEN 'ngc' WHEN 'wii' THEN 'wii' WHEN 'gb' THEN 'gb'
  WHEN 'gbc' THEN 'gbc' WHEN 'gba' THEN 'gba' WHEN 'nds' THEN 'nds'
  WHEN '3ds' THEN '3ds' WHEN 'switch' THEN 'switch' WHEN 'ps' THEN 'ps'
  WHEN 'ps2' THEN 'ps2' WHEN 'ps3' THEN 'ps3' WHEN 'psp' THEN 'psp'
  WHEN 'gamegear' THEN 'gamegear' WHEN 'mastersystem' THEN 'mastersystem'
  WHEN 'genesis' THEN 'genesis' WHEN 'dc' THEN 'dreamcast'
  WHEN 'atari2600' THEN 'atari2600' WHEN 'neogeoaes' THEN 'neogeoaes'
  ELSE "romm_platform_slug" END
WHERE "romm_platform_slug" IS NULL;
