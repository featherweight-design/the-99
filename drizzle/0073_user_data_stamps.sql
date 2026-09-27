CREATE TABLE "user_data_stamps" (
	"user_id" text PRIMARY KEY NOT NULL,
	"stamp" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
-- The reader's data stamp moves at COMMIT whenever a table Home or `/decks` reads changes for
-- them; both pages key their cached payload on it (`src/lib/cache/user-data-stamp.ts`).
--
-- WHY A DEFERRED CONSTRAINT TRIGGER. An immediate trigger would lock the reader's stamp row at
-- the first statement and hold it to commit, so two transactions for one reader that also
-- touch a common row in the opposite order can deadlock. Deferred to commit, the stamp is the
-- LAST lock a transaction takes: a transaction waiting on a stamp row waits on one that has
-- already run every statement and is committing, and a committing transaction waits on nothing
-- else (no constraint in this schema is deferrable). No cycle can pass through the stamp. The
-- one exception is a transaction stamping SEVERAL readers, which only the commander index's
-- all-reader clear of `commander_scores` does; two of those at once would take the rows in
-- event order, and nothing runs two of them.
--
-- ROW-LEVEL, BECAUSE A CONSTRAINT TRIGGER MUST BE, and cheap per row after the first: the owner
-- key each row names (a reader, a deck or a version) is remembered in a transaction-local
-- setting, so a collection replace of thousands of rows resolves and bumps one reader once.
-- Deck- and version-keyed rows resolve their reader through `decks` at commit. A row whose deck
-- is gone by then belongs to a deleted deck, whose own `decks` row stamps the reader.
--
-- It must never fail a write: the function reads, upserts one row and sets one setting.
-- `pnpm probe:list-stamp` writes each table below and asserts the stamp moved.
CREATE OR REPLACE FUNCTION user_data_touch() RETURNS trigger AS $$
DECLARE
  owner text := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END) ->> TG_ARGV[0];
  key text;
  seen text;
  reader text;
BEGIN
  IF owner IS NULL THEN RETURN NULL; END IF;
  key := '|' || TG_ARGV[0] || ':' || owner || '|';
  seen := coalesce(current_setting('the99.user_data_touched', true), '');
  IF position(key in seen) > 0 THEN RETURN NULL; END IF;
  IF TG_ARGV[0] = 'user_id' THEN
    reader := owner;
  ELSIF TG_ARGV[0] = 'deck_id' THEN
    SELECT d.user_id INTO reader FROM decks d WHERE d.id = owner::uuid;
  ELSE
    SELECT d.user_id INTO reader FROM deck_versions v JOIN decks d ON d.id = v.deck_id
      WHERE v.id = owner::uuid;
  END IF;
  IF reader IS NOT NULL AND position('|user_id:' || reader || '|' in seen) = 0 THEN
    INSERT INTO user_data_stamps (user_id, stamp) VALUES (reader, 1)
      ON CONFLICT (user_id) DO UPDATE SET stamp = user_data_stamps.stamp + 1;
    seen := seen || '|user_id:' || reader || '|';
  END IF;
  PERFORM set_config('the99.user_data_touched', seen || key, true);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "card_art_preferences";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "card_art_preferences"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "card_assignments";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "card_assignments"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "collection_items";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "collection_items"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "commander_scores";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "commander_scores"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "csv_uploads";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "csv_uploads"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "deck_folders";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "deck_folders"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "deck_games";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "deck_games"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "deck_profiles";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "deck_profiles"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "decks";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "decks"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "pull_releases";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "pull_releases"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "deck_cards";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "deck_cards"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('deck_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "deck_locks";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "deck_locks"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('deck_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "deck_proxies";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "deck_proxies"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('deck_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "deck_unresolved_rows";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "deck_unresolved_rows"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('deck_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "deck_versions";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "deck_versions"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('deck_id');
--> statement-breakpoint
DROP TRIGGER IF EXISTS user_data_touch ON "deck_version_cards";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "deck_version_cards"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('version_id');
