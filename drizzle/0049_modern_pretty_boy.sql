ALTER TABLE "deck_versions" ADD COLUMN "declared_bracket" integer;--> statement-breakpoint
ALTER TABLE "deck_versions" ADD COLUMN "permits" integer[];--> statement-breakpoint
ALTER TABLE "deck_versions" ADD CONSTRAINT "deck_versions_declared_bracket_range" CHECK ("deck_versions"."declared_bracket" is null or "deck_versions"."declared_bracket" between 1 and 5);