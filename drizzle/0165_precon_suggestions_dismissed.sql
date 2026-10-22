-- Deck messages A11: the precon suggestions a reader closed with the ✕, remembered on the account (per deck and
-- precon). `user_prefs` already carries the `user_data_touch` stamp trigger (0123) and is purged with the account.
ALTER TABLE "user_prefs" ADD COLUMN "precon_suggestions_dismissed" text[] DEFAULT '{}'::text[] NOT NULL;
