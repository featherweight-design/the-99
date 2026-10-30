/**
 * `ANNOUNCEMENTS_ENABLED` (Hugh, 2026-10-29): the reader surfaces of the magic.wizards.com Announcements line (Home
 * kinds, Settings rows, pushes, none built yet). It never gates the ingest cron, which fills the catalog those
 * surfaces will read whatever the switch says. Exactly `'true'` turns it on.
 */
export function announcementsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.ANNOUNCEMENTS_ENABLED === "true";
}
