CREATE TABLE "deck_game_axes" (
	"game_id" uuid NOT NULL,
	"axis" text NOT NULL,
	"polarity" text NOT NULL,
	CONSTRAINT "deck_game_axes_game_id_axis_pk" PRIMARY KEY("game_id","axis"),
	CONSTRAINT "deck_game_axes_polarity_check" CHECK ("deck_game_axes"."polarity" in ('worked', 'hurt'))
);
--> statement-breakpoint
CREATE TABLE "deck_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"result" text NOT NULL,
	"pod_size" integer NOT NULL,
	"played_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deck_games_result_check" CHECK ("deck_games"."result" in ('win', 'loss', 'draw')),
	CONSTRAINT "deck_games_pod_size_check" CHECK ("deck_games"."pod_size" between 2 and 8)
);
--> statement-breakpoint
ALTER TABLE "deck_game_axes" ADD CONSTRAINT "deck_game_axes_game_id_deck_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."deck_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_games" ADD CONSTRAINT "deck_games_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_games_deck_played_idx" ON "deck_games" USING btree ("deck_id","played_at");