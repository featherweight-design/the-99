import journal from "../../../drizzle/meta/_journal.json";

/**
 * Migration tags this build shipped with, in journal order.
 *
 * Imported rather than read from disk so the list is bundled into the
 * serverless function — `drizzle/` is not present in the deployed filesystem.
 */
export const shippedMigrationTags: readonly string[] = journal.entries.map((e) => e.tag);
