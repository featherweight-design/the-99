-- A hide or an unhide moves its owner's data stamp, as the other per-user tables do (0123). `cacheForUser` reads the
-- stamp before and after it builds a list payload and files nothing when it moved: a For you or Discover payload built
-- from a read taken before an unhide, and finished after the unhide's `updateTag`, would otherwise be filed as fresh
-- (the data cache dates an entry when it is written, not when its reads were taken) and served with the row missing.
DROP TRIGGER IF EXISTS user_data_touch ON "hidden_commanders";
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER user_data_touch AFTER INSERT OR UPDATE OR DELETE ON "hidden_commanders"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION user_data_touch('user_id');
