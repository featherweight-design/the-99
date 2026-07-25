export type MigrationState = "ok" | "behind" | "ahead";

export type MigrationHealth = {
  state: MigrationState;
  applied: number;
  expected: number;
  latestApplied: string | null;
  pending: string[];
};

/**
 * Compares the number of migrations recorded in `drizzle.__drizzle_migrations`
 * against the tags this build shipped with.
 *
 * Count comparison rather than hash comparison: the migrations table stores a
 * hash of each SQL file but not its tag, and the journal stores tags but no
 * hashes, so the two cannot be joined without re-hashing the .sql files at
 * runtime — files that are not reliably present in a serverless bundle. Drizzle
 * applies migrations in journal order and never backfills a gap, so position is
 * a sound stand-in for identity here.
 */
export function compareMigrations(applied: number, tags: readonly string[]): MigrationHealth {
  const expected = tags.length;

  // Schema ahead of code is healthy under expand-contract: the migration landed
  // in a build that this instance has not been replaced by yet, or a rollback
  // left newer schema in place. Reported so it is visible, not treated as a fault.
  const state: MigrationState = applied === expected ? "ok" : applied < expected ? "behind" : "ahead";

  return {
    state,
    applied,
    expected,
    latestApplied: applied > 0 ? (tags[Math.min(applied, expected) - 1] ?? null) : null,
    pending: tags.slice(applied),
  };
}
