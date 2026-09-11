CREATE TABLE "deck_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_folders_user_name_key" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
CREATE INDEX "deck_folders_user_idx" ON "deck_folders" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_folder_id_deck_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."deck_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "decks_user_folder_idx" ON "decks" USING btree ("user_id","folder_id");