-- Custom migration. `decks.answer_intent_pending` left the schema in 0063 and stayed in the
-- database, because the build then serving still selected it and migrations run before promotion.
-- 0063's build has been serving since, and names the column nowhere, so it can go. IF EXISTS keeps
-- a database that never had it (a fresh branch built from the current schema) from failing here.
ALTER TABLE "decks" DROP COLUMN IF EXISTS "answer_intent_pending";
