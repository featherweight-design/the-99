import { sql } from "drizzle-orm";
import { shippedMigrationTags } from "./migration-journal";
import { compareMigrations, type MigrationHealth } from "./migration-status";

export type HealthReport =
  | (Omit<MigrationHealth, "state"> & { status: MigrationHealth["state"] })
  | { status: "error" };

/**
 * Reads the migration ledger Drizzle maintains and compares it to what this
 * build shipped. `drizzle.__drizzle_migrations` is Drizzle's own bookkeeping
 * table, so it is queried raw rather than through the schema.
 *
 * Only the row count is used. That table's `created_at` is copied from the
 * journal's `when` — the time the migration was *generated*, not applied — so it
 * is identical across every database that has the migration and says nothing
 * about when this deployment caught up. Reporting it as an applied-at time would
 * be actively misleading, and `latestApplied` already identifies the migration.
 */
export async function checkHealth(): Promise<HealthReport> {
  try {
    // Imported inside the try because `src/db` throws at module init when
    // DATABASE_URL is unset — a static import would make that an unhandled 500
    // instead of the `error` report this endpoint exists to give.
    const { db } = await import("../../db");

    const result = await db.execute<{ applied: number }>(
      sql`select count(*)::int as applied from drizzle.__drizzle_migrations`,
    );

    const { state, ...health } = compareMigrations(
      result.rows[0]?.applied ?? 0,
      shippedMigrationTags,
    );

    return { ...health, status: state };
  } catch {
    // The error is deliberately not echoed: a connection failure message can
    // carry the host and database name, and this endpoint is unauthenticated.
    return { status: "error" };
  }
}
