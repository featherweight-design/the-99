-- Home's welcome-credits strip, closed for good per account (welcome credits D2). `user_prefs` already carries the
-- `user_data_touch` stamp trigger (0123), so its writer sets this only while it is null.
ALTER TABLE "user_prefs" ADD COLUMN "welcome_strip_dismissed_at" timestamp with time zone;
