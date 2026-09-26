import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckCards, decks, fillPassCards, fillPasses } from "../../db/schema";

/** The transaction handle every caller here already holds. Taken as a parameter
 *  rather than reaching for `db`, because a pass must be recorded in the same
 *  transaction as the insert it describes: a fill that committed without its
 *  pass would leave auto rows the ledger cannot explain. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type FillPassKind = "seed" | "top_off";

export interface FillPassRow {
  id: string;
  kind: FillPassKind;
  ordinal: number;
  openSlots: number;
  createdAt: Date;
}

export interface FillPassMember {
  passId: string;
  oracleId: string;
  quantity: number;
}

export interface DeckCardState {
  oracleId: string;
  quantity: number;
  auto: boolean;
}

export interface FillPassSummary extends FillPassRow {
  /** Cards the pass placed that are still in the deck and still the app's.
      This is what `Undo these {n}` removes, and the count it states. */
  live: number;
  /** Cards the pass placed that the player has since claimed. A kept card has
      graduated out of provenance, so the undo cannot reach it. */
  kept: number;
  /** Cards the pass placed that are no longer in the deck at all. */
  removed: number;
  /** The live cards themselves, with the number of copies this pass still holds
      — which is not always the deck row's quantity, because a player can stack
      copies of their own on top of a basic the pass placed. The ledger needs the
      quantities to state what a pass costs, and the undo needs them to take back
      only what it put there. */
  liveCards: { oracleId: string; quantity: number }[];
}

/**
 * Turns the immutable membership record and the deck as it stands now into the
 * counts each ledger line states. Pure, because every interesting case here is
 * a question about overlapping passes rather than about the database.
 *
 * **One card can belong to two passes, and the newest one owns it.** Pass 1
 * places Shark Typhoon, the player removes it, pass 3 places it again: the
 * oracle id is in both membership records, and counting it live in both would
 * have two lines claiming one deck row — and `Undo these {n}` on pass 1 would
 * delete a card pass 3 put there. So a card still in the deck is attributed to
 * the newest pass that placed it, and every older pass counts it `removed
 * since`, which is what actually happened to it. The overlap can only arise
 * after a removal, because a card already in the deck is never a candidate.
 *
 * A pass with no live cards renders no line, so it is dropped here rather than
 * in the component.
 */
export function summariseFillPasses(args: {
  passes: FillPassRow[];
  members: FillPassMember[];
  deckCards: DeckCardState[];
}): FillPassSummary[] {
  const byOracleId = new Map(args.deckCards.map((r) => [r.oracleId, r]));

  // Newest first, so the first pass to claim an oracle id is the one that owns
  // it. Two passes committed inside the same millisecond are unlikely but not
  // impossible, and a coin flip there would be a real bug — attribution decides
  // what `Undo these {n}` deletes. So the ties are broken all the way down: a
  // seed is older than any top-off, ordinals are monotonic within a kind, and
  // the id is the last resort, arbitrary but stable across reads.
  const age = (p: FillPassRow) => (p.kind === "seed" ? 0 : 1);
  const newestFirst = [...args.passes].sort((a, b) =>
    b.createdAt.getTime() - a.createdAt.getTime()
    || age(b) - age(a)
    || b.ordinal - a.ordinal
    || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));

  const membersByPass = new Map<string, FillPassMember[]>();
  for (const m of args.members) {
    const list = membersByPass.get(m.passId);
    if (list) list.push(m);
    else membersByPass.set(m.passId, [m]);
  }

  const claimed = new Set<string>();
  const summaries = new Map<string, FillPassSummary>();

  for (const pass of newestFirst) {
    let live = 0;
    let kept = 0;
    let removed = 0;
    const liveCards: { oracleId: string; quantity: number }[] = [];

    for (const member of membersByPass.get(pass.id) ?? []) {
      const row = byOracleId.get(member.oracleId);
      if (row == null || claimed.has(member.oracleId)) {
        // Gone from the deck, or still here but a newer pass's to account for.
        // Either way this pass no longer holds it, which is what the line says.
        removed += member.quantity;
        continue;
      }
      claimed.add(member.oracleId);
      // Neither quantity alone is the answer for a stacked basic. The pass can
      // only still hold what it placed AND the deck still has, so the smaller of
      // the two is live: a seed of 30 Forests trimmed to 24 has 24 left and 6
      // gone, and copies the player added afterwards are the player's, not the
      // pass's — counting them would have `Undo these {n}` offering to take
      // cards the app never placed.
      const held = Math.min(row.quantity, member.quantity);
      removed += member.quantity - held;
      if (row.auto) {
        live += held;
        liveCards.push({ oracleId: member.oracleId, quantity: held });
      } else {
        kept += held;
      }
    }

    if (live > 0) summaries.set(pass.id, { ...pass, live, kept, removed, liveCards });
  }

  // Oldest first: the ledger is read top-down as the deck's history, so the
  // seed is always the first line and a new pass appends below it. Sorted here
  // rather than trusted from the caller — the order is the design's ruling, and
  // a caller that forgot its `order by` would silently invert the history.
  return [...newestFirst].reverse()
    .map((p) => summaries.get(p.id))
    .filter((s): s is FillPassSummary => s != null);
}

/**
 * Records one act of the app placing cards in a deck. Must be called inside the
 * caller's transaction, under the deck row lock every caller already takes —
 * that lock is what makes the ordinal allocation below safe.
 *
 * Returns null and writes nothing when the act placed no cards: a pass that
 * placed nothing is not a pass, and an empty one would render no line anyway.
 */
export async function recordFillPass(tx: Tx, args: {
  deckId: string;
  kind: FillPassKind;
  openSlots: number;
  rows: { oracleId: string; quantity: number }[];
}): Promise<string | null> {
  if (args.rows.length === 0) return null;

  // Per deck AND per kind, so "top-off 3" keeps its name after "top-off 1" is
  // undone, and the seed is always ordinal 1 of its own kind. max() rather than
  // count(): an undone pass keeps its row precisely so its ordinal is never
  // handed out twice.
  const [{ highest }] = await tx
    .select({ highest: sql<number>`coalesce(max(${fillPasses.ordinal}), 0)`.mapWith(Number) })
    .from(fillPasses)
    .where(and(eq(fillPasses.deckId, args.deckId), eq(fillPasses.kind, args.kind)));
  const ordinal = highest + 1;

  const [pass] = await tx.insert(fillPasses)
    .values({ deckId: args.deckId, kind: args.kind, ordinal, openSlots: args.openSlots })
    .returning({ id: fillPasses.id });

  // Deduplicated rather than left to `on conflict do nothing`, because the pass
  // id is new and so the only conflict possible is the caller handing the same
  // oracle id twice — and swallowing that silently would leave the membership
  // describing a fill that did not happen. Keeping the first occurrence is not a
  // choice made here: `deck_cards` has the same primary key and the same
  // `on conflict do nothing`, so the deck itself already holds only the first.
  const byOracleId = new Map<string, number>();
  for (const r of args.rows) if (!byOracleId.has(r.oracleId)) byOracleId.set(r.oracleId, r.quantity);

  await tx.insert(fillPassCards).values(
    [...byOracleId].map(([oracleId, quantity]) => ({ passId: pass.id, oracleId, quantity })),
  );

  return pass.id;
}

/** The owner-scoped first read of `readFillPasses`, apart so a test can render its SQL. */
export function fillPassesQuery(deckId: string, userId: string) {
  return db.select({
    id: fillPasses.id,
    kind: fillPasses.kind,
    ordinal: fillPasses.ordinal,
    openSlots: fillPasses.openSlots,
    createdAt: fillPasses.createdAt,
  }).from(fillPasses)
    .innerJoin(decks, eq(decks.id, fillPasses.deckId))
    .where(and(eq(fillPasses.deckId, deckId), eq(decks.userId, userId)))
    .orderBy(asc(fillPasses.createdAt), asc(fillPasses.ordinal));
}

/** The ledger's lines for one deck, oldest first, passes with no live cards
    already dropped. Reads only — nothing in this feature writes to a pass after
    it is created.

    OWNER-SCOPED IN ITS OWN SQL: the first read joins `decks` on the reader, so a
    deck they do not own reads as no passes and nothing further is asked. The deck
    page starts this beside its ownership guard rather than after it, and
    authorization has to come before data access either way. */
export async function readFillPasses(deckId: string, userId: string): Promise<FillPassSummary[]> {
  const passes = await fillPassesQuery(deckId, userId);
  if (passes.length === 0) return [];

  const [members, rows] = await Promise.all([
    db.select({
      passId: fillPassCards.passId,
      oracleId: fillPassCards.oracleId,
      quantity: fillPassCards.quantity,
    }).from(fillPassCards).where(inArray(fillPassCards.passId, passes.map((p) => p.id))),
    db.select({
      oracleId: deckCards.oracleId,
      quantity: deckCards.quantity,
      auto: deckCards.auto,
    }).from(deckCards).where(eq(deckCards.deckId, deckId)),
  ]);

  return summariseFillPasses({
    passes: passes.map((p) => ({ ...p, kind: p.kind as FillPassKind })),
    members,
    deckCards: rows,
  });
}
