ALTER TABLE "commander_support" ADD COLUMN "avg_ramp" real;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_draw" real;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_removal" real;--> statement-breakpoint
ALTER TABLE "commander_support" ADD COLUMN "avg_wipes" real;--> statement-breakpoint
ALTER TABLE "identity_composition" ADD COLUMN "avg_ramp" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "identity_composition" ADD COLUMN "avg_draw" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "identity_composition" ADD COLUMN "avg_removal" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "identity_composition" ADD COLUMN "avg_wipes" real DEFAULT 0 NOT NULL;