// The one number the signed-out report sweep and the copy that names it share. Kept apart from `purge.ts` (server-only, reads the
// database) so the client-side copy can import it without pulling the database in. `purge.ts` re-exports it.

/** Days a signed-out problem report is kept. */
export const ANON_REPORT_RETENTION_DAYS = 90;
