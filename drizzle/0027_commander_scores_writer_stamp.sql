-- Stamps `commander_scores.writer_version` from a transaction-local setting, so
-- a writer that does not know the column cannot leave a row claiming to be
-- current.
--
-- The DEFAULT alone could not do this. It catches an old deployment's INSERTs,
-- which omit the column, but not its UPDATEs: `persistScores` upserts, and an
-- upsert onto an existing version-2 row leaves that 2 in place while replacing
-- every score beside it. Two ways that happens — a rollback, and a compute that
-- was already in flight when the new build went live — and both end the same
-- way: a set with its built commanders deleted back out of it, marked current,
-- served warm, and the commander gone again. That is the whole bug this
-- migration's predecessor exists to fix, returning by the back door.
--
-- Only the DOWNGRADE is automatic. A writer that sets `app.writer_version` keeps
-- whatever value it wrote, so the column still works if this trigger is ever
-- dropped; a writer that does not set it marks every row it touches stale, and
-- the next read recomputes. There is no version this can invent — 1 is "older
-- than anything that announces itself".
CREATE OR REPLACE FUNCTION commander_scores_stamp_writer_version() RETURNS trigger AS $$
BEGIN
  IF coalesce(current_setting('app.writer_version', true), '') = '' THEN
    NEW.writer_version := 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS commander_scores_writer_version_stamp ON "commander_scores";
--> statement-breakpoint
CREATE TRIGGER commander_scores_writer_version_stamp
  BEFORE INSERT OR UPDATE ON "commander_scores"
  FOR EACH ROW EXECUTE FUNCTION commander_scores_stamp_writer_version();
