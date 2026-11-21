-- Guided build tile: a run's state is drawn on the Home and /decks tiles, which cache their payload per reader keyed on the
-- user_data_stamps stamp. A run write (start, finish, refund) must move its owner's stamp, as every per-user table those pages read does.
-- Deferred, per row, keyed on user_id: the same trigger 0107 put on wishlist_items.
-- REVERSAL: DROP TRIGGER user_data_touch ON "guided_builds";
DROP TRIGGER IF EXISTS user_data_touch ON "guided_builds";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "guided_builds"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
