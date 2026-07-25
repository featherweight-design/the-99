-- No-op. Proves migrations apply during the Vercel build (issue #70) by being
-- recorded in drizzle.__drizzle_migrations without touching any schema object.
SELECT 1;
