/**
 * When the catalog first showed a set or a precon (`catalog_first_seen`). Written at the end of the
 * ingest that read it, under the same `catalog-ingest` lock, so two runs never race the baseline test.
 *
 * **The first run for a kind is a BASELINE.** It finds no row of that kind, so every key it stamps was
 * already in the catalog and its `first_seen_at` is the day stamping began; those rows are written
 * `baseline: true` and no reader may call one an arrival. Every later run stamps only the keys it has
 * not seen, `baseline: false`, and never touches a stamp already written.
 *
 * NON-FATAL, like the catalog stamp: the refresh workflow runs the seed scripts without `db:migrate`,
 * so a database the migration has not reached must cost a warning here and not a red ingest.
 */
import { eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { catalogFirstSeen } from "../../db/schema";

export type FirstSeenKind = "set" | "precon";

/** A drizzle transaction on `src/db`'s connection. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Stamps `keys` through `tx`. Returns how many were new, and whether this run was the kind's baseline. */
export async function stampFirstSeenIn(
  tx: Pick<Tx, "select" | "insert">,
  kind: FirstSeenKind,
  keys: readonly string[],
  now: Date,
): Promise<{ added: number; baseline: boolean }> {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return { added: 0, baseline: false };
  const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(catalogFirstSeen).where(eq(catalogFirstSeen.kind, kind));
  const baseline = n === 0;
  let added = 0;
  for (let i = 0; i < unique.length; i += 500) {
    const done = await tx
      .insert(catalogFirstSeen)
      .values(unique.slice(i, i + 500).map((key) => ({ kind, key, firstSeenAt: now, baseline })))
      .onConflictDoNothing()
      .returning({ key: catalogFirstSeen.key });
    added += done.length;
  }
  return { added, baseline };
}

export async function stampFirstSeen(kind: FirstSeenKind, keys: readonly string[], now = new Date()): Promise<void> {
  try {
    const { added, baseline } = await db.transaction((tx) => stampFirstSeenIn(tx, kind, keys, now));
    if (baseline) console.log(`first seen: ${added} ${kind}s stamped as the baseline`);
    else if (added > 0) console.log(`first seen: ${added} new ${kind}${added === 1 ? "" : "s"}`);
  } catch (error) {
    console.warn(`first seen not stamped for ${kind}s: ${error instanceof Error ? error.message : String(error)}`);
  }
}
