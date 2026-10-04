import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { decks, pullReleases } from "../../db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * `writePullRelease`'s own SET clause, pulled out so a test can render the exact SQL it emits
 * without executing a write — see `pull-release.test.ts`. A second pull of the same card from
 * the same draft for the same deck takes one more copy, and `createdAt` is bumped alongside it
 * (see the column's own comment): without that, a re-pull from a source whose row already
 * existed would leave this looking OLDER than a different source's row made in between, and
 * `latestReleaseSources` would name the wrong deck.
 */
export const PULL_RELEASE_UPSERT_SET = {
  copies: sql`${pullReleases.copies} + 1`,
  createdAt: sql`now()`,
};

/**
 * The release a `Pull it` writes (Hugh's ruling, 2026-09-27; see `pullReleases` in the schema).
 *
 * A pull edits the source deck's draft and cuts no version, so the source's committed version
 * still lists the card. This row subtracts the pulled copy from that claim in `all_claims`, which
 * both claim readers share, and that is what frees it for the asking deck. It lives as long as the
 * source's draft, and ONLY the source's commit or discard deletes it (`clearPullReleases`). A card
 * that comes back into the draft does not: `all_claims` limits the release to what the draft
 * lacks, so it stops subtracting while the card is back and counts again if the card is cut again
 * before the commit. Deleting it on a return path would lose that second cut's release.
 */
export async function writePullRelease(
  tx: Tx,
  release: { userId: string; sourceDeckId: string; oracleId: string; askingDeckId: string },
): Promise<void> {
  await tx.insert(pullReleases).values({ ...release, copies: 1 }).onConflictDoUpdate({
    target: [pullReleases.sourceDeckId, pullReleases.oracleId, pullReleases.askingDeckId],
    // A pull for a DIFFERENT deck is its own row, so every asker is told when this is undone.
    set: PULL_RELEASE_UPSERT_SET,
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
 * The decks a pull from this source freed this card for. Read, never deleted: a card back in the
 * source's draft already cancels its own release in `all_claims`, whose limit never subtracts more
 * than the version lists beyond the draft, so an add only has to tell those decks their figures
 * moved. Every path that returns the card behaves the same way, Put back included, and only the
 * source's commit or discard deletes a release.
 */
export async function releaseAskers(
  tx: Tx,
  sourceDeckId: string,
  oracleId: string,
): Promise<string[]> {
  const rows = await tx.selectDistinct({ askingDeckId: pullReleases.askingDeckId })
    .from(pullReleases)
    .where(and(eq(pullReleases.sourceDeckId, sourceDeckId), eq(pullReleases.oracleId, oracleId)));
  return rows.map((r) => r.askingDeckId);
}

export type ReleaseSource = { sourceDeckId: string; sourceDeckName: string };
type ReleaseRow = ReleaseSource & { oracleId: string };

/**
 * The first (newest, by the caller's own ordering) row seen per card, pure so it can be unit
 * tested without a database — see `pull-release.test.ts`. The handoff names "the" release row
 * for a card, but the primary key is `(sourceDeckId, oracleId, askingDeckId)`, ONE ROW PER
 * SOURCE, so a deck asking for two or more copies of a card can hold two release rows for it
 * if the copies came from different decks over time; this picks the newest, since the label is
 * about the most recent action and no frame covers naming several.
 */
export function newestPerCard(rowsNewestFirst: ReleaseRow[]): Map<string, ReleaseSource> {
  const byCard = new Map<string, ReleaseSource>();
  for (const row of rowsNewestFirst) {
    if (!byCard.has(row.oracleId)) {
      byCard.set(row.oracleId, { sourceDeckId: row.sourceDeckId, sourceDeckName: row.sourceDeckName });
    }
  }
  return byCard;
}

/**
 * The deck a reader's most recent pull, for this asking deck and this card, took the copy
 * out of — for the review row's post-pull label (addendum R1, "pulled from {deck}").
 *
 * `created_at` means last TOUCHED, not first created — `writePullRelease` bumps it on every
 * pull, including a re-pull from a source whose row already existed — which is load-bearing
 * for `newestPerCard`'s ordering: without that bump, a second pull from an OLD source would
 * keep that row's original, now-stale timestamp, and a pull from a different source made in
 * between would read as newer even though it happened first.
 *
 * Filtered on `userId` as well as `askingDeckId`/`oracleId`, found by Copilot's round-1
 * review: the table's only secondary index is `pull_releases_user_idx`, and the primary key
 * starts with `sourceDeckId` — neither covers a query on `(askingDeckId, oracleId)` alone,
 * which would scan every release row in the table as they accumulate across every player.
 * `userId` is already in hand (the page's own reader) and narrows the scan to the index.
 *
 * Batched over every oracle id the page's rows carry, not called per row: the asking deck is
 * one page's worth of cards, and this is read on every render.
 */
export async function latestReleaseSources(
  userId: string,
  askingDeckId: string,
  oracleIds: string[],
): Promise<Map<string, ReleaseSource>> {
  if (oracleIds.length === 0) return new Map();
  const rows = await db
    .select({
      oracleId: pullReleases.oracleId,
      sourceDeckId: pullReleases.sourceDeckId,
      sourceDeckName: decks.name,
    })
    .from(pullReleases)
    .innerJoin(decks, eq(decks.id, pullReleases.sourceDeckId))
    .where(and(
      eq(pullReleases.userId, userId),
      eq(pullReleases.askingDeckId, askingDeckId),
      inArray(pullReleases.oracleId, oracleIds),
    ))
    .orderBy(desc(pullReleases.createdAt));
  return newestPerCard(rows);
}
