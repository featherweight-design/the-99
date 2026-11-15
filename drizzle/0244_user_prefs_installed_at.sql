-- When the reader first opened the installed app, signed in, on a phone (install onboarding call 7, Hugh 2026-11-15). Nullable, no backfill: null is an app never opened, which is every account today.
ALTER TABLE "user_prefs" ADD COLUMN "installed_at" timestamp with time zone;
