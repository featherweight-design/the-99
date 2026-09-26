import { and, desc, eq, sql } from "drizzle-orm";
import type { db } from "../../db";
import { pullReleases } from "../../db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The release a `Pull it` writes (Hugh's ruling, 2026-09-27; see `pullReleases` in the schema).
 *
 * A pull edits the source deck's draft and cuts no version, so the source's committed version
 * still lists the card. This row subtracts the pulled copy from that claim in `all_claims`, which
 * both claim readers share, and that is what frees it for the asking deck. It lives as long as the
 * source's draft: every writer that ends that draft, or takes the card back, deletes it here.
 */
export async function writePullRelease(
  tx: Tx,
  release: { userId: string; sourceDeckId: string; oracleId: string; askingDeckId: string },
): Promise<void> {
  await tx.insert(pullReleases).values({ ...release, copies: 1 }).onConflictDoUpdate({
    target: [pullReleases.sourceDeckId, pullReleases.oracleId, pullReleases.askingDeckId],
    // A second pull of the same card from the same draft for the same deck takes one more copy.
    // A pull for a DIFFERENT deck is its own row, so every asker is told when this is undone.
    // The stamp moves too: Put back takes back from the NEWEST pull, which this one now is.
    set: { copies: sql`${pullReleases.copies} + 1`, createdAt: sql`now()` },
  });
}

/**
 * Every release the deck's draft holds, gone: its COMMIT (the version now lists what the draft
 * does, so there is no committed claim left to subtract from) and its DISCARD (the pulled cards are
 * back, so their copies are claimed again). Returns the decks the copies were pulled for, whose
 * figures move with it.
 */
export async function clearPullReleases(tx: Tx, sourceDeckId: string): Promise<string[]> {
  const gone = await tx.delete(pullReleases)
    .where(eq(pullReleases.sourceDeckId, sourceDeckId))
    .returning({ askingDeckId: pullReleases.askingDeckId });
  return [...new Set(gone.map((r) => r.askingDeckId))];
}

/**
 * ONE copy is back in the source's draft (Put back, or any add of it), so ONE released copy is
 * claimed again: the newest release gives up a copy, and its row goes when it reaches none. Only
 * that release's asking deck sees its buy tag return; a card pulled twice keeps its other copy out.
 */
export async function takeBackPullRelease(
  tx: Tx,
  sourceDeckId: string,
  oracleId: string,
): Promise<string[]> {
  const [newest] = await tx.select({ askingDeckId: pullReleases.askingDeckId, copies: pullReleases.copies })
    .from(pullReleases)
    .where(and(eq(pullReleases.sourceDeckId, sourceDeckId), eq(pullReleases.oracleId, oracleId)))
    .orderBy(desc(pullReleases.createdAt), desc(pullReleases.askingDeckId))
    .limit(1)
    .for("update");
  if (!newest) return [];
  const row = and(
    eq(pullReleases.sourceDeckId, sourceDeckId),
    eq(pullReleases.oracleId, oracleId),
    eq(pullReleases.askingDeckId, newest.askingDeckId),
  );
  if (newest.copies > 1) {
    await tx.update(pullReleases).set({ copies: sql`${pullReleases.copies} - 1` }).where(row);
  } else {
    await tx.delete(pullReleases).where(row);
  }
  return [newest.askingDeckId];
}
