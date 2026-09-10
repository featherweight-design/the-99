// Reading and writing a deck's committed versions.
//
// The vocabulary is deliberate: `committed.ts` in this same directory already
// means "which deck is this card already in", so nothing here says "committed
// cards". A VERSION is a snapshot; the DRAFT is `deck_cards`.

import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "../../db";
import { deckCards, deckVersionCards, deckVersions, decks } from "../../db/schema";
import type { CardQty } from "./draft-diff";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type DeckVersion = {
  id: string;
  number: number;
  committedAt: Date;
  note: string | null;
  commanderOracleId: string;
  partnerOracleId: string | null;
  commanderSince: Date;
  partnerSince: Date | null;
};

/**
 * The version a deck is currently sleeved as, or null for a brew.
 *
 * Ordered by `number` rather than `committed_at`. The unique key makes number
 * strictly increasing per deck, whereas two versions committed in the same
 * millisecond — reachable when a pull commits a source deck inside another
 * deck's commit — would tie on the timestamp.
 *
 * Pass `tx` to read inside a caller's transaction, so a decision made from
 * this row is taken under the same lock as the write it leads to.
 */
export async function newestVersion(deckId: string, tx?: Tx): Promise<DeckVersion | null> {
  const [row] = await (tx ?? db).select()
    .from(deckVersions)
    .where(eq(deckVersions.deckId, deckId))
    .orderBy(desc(deckVersions.number))
    .limit(1);
  return row ?? null;
}

/**
 * The version a deck was sleeved as at a given moment.
 *
 * A game can be logged with a `played_at` in the past, and the stamp is meant
 * to say which list was on the table that night — not which one is on it now.
 * Null when the deck had committed nothing yet, which is the accurate answer:
 * that game was played by a list nobody recorded.
 *
 * `number` breaks a `committed_at` tie for the same reason `newestVersion`
 * orders by it: two versions can share a millisecond.
 */
export async function versionLiveAt(deckId: string, at: Date): Promise<DeckVersion | null> {
  const [row] = await db.select()
    .from(deckVersions)
    .where(and(eq(deckVersions.deckId, deckId), lte(deckVersions.committedAt, at)))
    .orderBy(desc(deckVersions.committedAt), desc(deckVersions.number))
    .limit(1);
  return row ?? null;
}

export async function versionCards(versionId: string, tx?: Tx): Promise<CardQty[]> {
  return (tx ?? db).select({
    oracleId: deckVersionCards.oracleId,
    quantity: deckVersionCards.quantity,
  }).from(deckVersionCards).where(eq(deckVersionCards.versionId, versionId));
}

/**
 * Freeze the draft as the next version.
 *
 * One transaction, because a version row without its cards is a deck that
 * claims nothing — every copy it holds would read as free across the whole
 * application until someone noticed.
 *
 * The commander columns are read inside the transaction rather than passed in,
 * so a commander swap committed concurrently cannot be snapshotted stale.
 *
 * The deck row is locked `for update` before the number is computed. `max + 1`
 * is otherwise a read-then-write race, and a pull commits a source deck INSIDE
 * another deck's flow — two commits landing together would collide on
 * `deck_versions_deck_number_key` with a 23505 nobody catches.
 *
 * Every `since` is inherited from the predecessor when it held the same card,
 * and set to this version's committed_at when it did not. This is the one place
 * card-level seniority is decided; see the column comment in schema.ts.
 *
 * Pass `tx` to run inside a caller's transaction. A pull edits `deck_cards` and
 * then commits the result: those two must land or fail together, or the source
 * deck loses the card from its draft while its version still claims it.
 */
export async function commitVersion(
  deckId: string,
  note: string | null,
  tx?: Tx,
): Promise<{ version: DeckVersion }> {
  return tx
    ? commitVersionIn(tx, deckId, note)
    : db.transaction((t) => commitVersionIn(t, deckId, note));
}

async function commitVersionIn(
  tx: Tx,
  deckId: string,
  note: string | null,
): Promise<{ version: DeckVersion }> {
  const [deck] = await tx.select().from(decks)
    .where(eq(decks.id, deckId))
    .for("update");
  if (!deck) throw new Error("deck not found");

  const [previous] = await tx.select()
    .from(deckVersions)
    .where(eq(deckVersions.deckId, deckId))
    .orderBy(desc(deckVersions.number))
    .limit(1);

  // What the predecessor held, and since when. Empty on a first commit, which
  // is what makes every `since` fall through to the new committed_at.
  const inherited = new Map<string, Date>(
    previous
      ? (await tx.select({
          oracleId: deckVersionCards.oracleId,
          since: deckVersionCards.since,
        }).from(deckVersionCards).where(eq(deckVersionCards.versionId, previous.id)))
          .map((r) => [r.oracleId, r.since] as const)
      : [],
  );

  const [inserted] = await tx.insert(deckVersions).values({
    deckId,
    number: (previous?.number ?? 0) + 1,
    note,
    commanderOracleId: deck.commanderOracleId,
    partnerOracleId: deck.partnerOracleId,
  }).returning();

  // committed_at is defaulted by the database, so the inheritance below reads
  // it back off the inserted row rather than guessing at a client clock.
  const now = inserted.committedAt;
  const commanderSince =
    previous && previous.commanderOracleId === deck.commanderOracleId
      ? previous.commanderSince
      : now;
  const partnerSince = deck.partnerOracleId === null
    ? null
    : previous && previous.partnerOracleId === deck.partnerOracleId
      ? previous.partnerSince
      : now;
  await tx.update(deckVersions)
    .set({ commanderSince, partnerSince })
    .where(eq(deckVersions.id, inserted.id));

  // `for update` on the draft rows, not merely the deck row above. Most of the
  // paths that edit `deck_cards` — a quantity decrement, an auto-fill sweep —
  // never touch the deck row, so its lock does not serialize them. A row lock
  // does, because their own UPDATE takes the same one.
  const rows = await tx.select({
    oracleId: deckCards.oracleId,
    quantity: deckCards.quantity,
  }).from(deckCards).where(eq(deckCards.deckId, deckId)).for("update");

  if (rows.length > 0) {
    await tx.insert(deckVersionCards).values(
      rows.map((r) => ({
        versionId: inserted.id,
        oracleId: r.oracleId,
        quantity: r.quantity,
        since: inherited.get(r.oracleId) ?? now,
      })),
    );
  }
  return { version: { ...inserted, commanderSince, partnerSince } };
}

/**
 * Throw the draft away and put the version's list back.
 *
 * Destructive and unrecoverable: the draft is not itself versioned, so what
 * this deletes is gone. The confirmation belongs at the call site, on the same
 * bar the bulk keep took in #476.
 *
 * `auto` is deliberately reset to false on every restored row. A version is a
 * list the player committed to, so nothing in it is an unclaimed suggestion,
 * and leaving the flag set would let a later sweep delete cards out of a
 * committed deck.
 */
export async function restoreDraftFromVersion(deckId: string, versionId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // The same `for update` commitVersion takes, and for the same reason: this
    // reads a list and then replaces `deck_cards` wholesale, so an add landing
    // from another tab in between is thrown away without a trace.
    const [deck] = await tx.select().from(decks).where(eq(decks.id, deckId)).for("update");
    // Checked rather than discarded: a deck deleted underneath this would
    // otherwise fail as "version not found", which sends the reader looking
    // for a missing version of a deck that is itself gone.
    if (!deck) throw new Error("deck not found");

    const [version] = await tx.select().from(deckVersions)
      .where(and(eq(deckVersions.id, versionId), eq(deckVersions.deckId, deckId)));
    if (!version) throw new Error("version not found");

    const rows = await tx.select({
      oracleId: deckVersionCards.oracleId,
      quantity: deckVersionCards.quantity,
    }).from(deckVersionCards).where(eq(deckVersionCards.versionId, versionId));

    await tx.delete(deckCards).where(eq(deckCards.deckId, deckId));
    if (rows.length > 0) {
      await tx.insert(deckCards).values(
        rows.map((r) => ({
          deckId, oracleId: r.oracleId, quantity: r.quantity, auto: false,
        })),
      );
    }
  });
}
