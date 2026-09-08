import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { deckCards, fillPassCards, fillPasses } from "../../db/schema";

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
  liveOracleIds: string[];
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
  // it. Ties on the timestamp fall back to the ordinal, which is monotonic
  // within a kind — two passes committed inside the same millisecond are
  // unlikely but not impossible, and a coin flip there would be a real bug.
  const newestFirst = [...args.passes].sort((a, b) =>
    b.createdAt.getTime() - a.createdAt.getTime() || b.ordinal - a.ordinal);

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
    const liveOracleIds: string[] = [];

    for (const member of membersByPass.get(pass.id) ?? []) {
      const row = byOracleId.get(member.oracleId);
      if (row == null || claimed.has(member.oracleId)) {
        // Gone from the deck, or still here but a newer pass's to account for.
        // Either way this pass no longer holds it, which is what the line says.
        removed += member.quantity;
        continue;
      }
      claimed.add(member.oracleId);
      // The deck's own quantity, not the membership's: a stacked basic the
      // player has since trimmed should report what would actually leave.
      if (row.auto) {
        live += row.quantity;
        liveOracleIds.push(member.oracleId);
      } else {
        kept += row.quantity;
      }
    }

    if (live > 0) summaries.set(pass.id, { ...pass, live, kept, removed, liveOracleIds });
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
  const existing = await tx.select({ ordinal: fillPasses.ordinal })
    .from(fillPasses)
    .where(and(eq(fillPasses.deckId, args.deckId), eq(fillPasses.kind, args.kind)));
  const ordinal = existing.reduce((n, r) => Math.max(n, r.ordinal), 0) + 1;

  const [pass] = await tx.insert(fillPasses)
    .values({ deckId: args.deckId, kind: args.kind, ordinal, openSlots: args.openSlots })
    .returning({ id: fillPasses.id });

  await tx.insert(fillPassCards).values(
    args.rows.map((r) => ({ passId: pass.id, oracleId: r.oracleId, quantity: r.quantity })),
  ).onConflictDoNothing();

  return pass.id;
}

/** The ledger's lines for one deck, oldest first, passes with no live cards
    already dropped. Reads only — nothing in this feature writes to a pass after
    it is created. */
export async function readFillPasses(deckId: string): Promise<FillPassSummary[]> {
  const passes = await db.select({
    id: fillPasses.id,
    kind: fillPasses.kind,
    ordinal: fillPasses.ordinal,
    openSlots: fillPasses.openSlots,
    createdAt: fillPasses.createdAt,
  }).from(fillPasses)
    .where(eq(fillPasses.deckId, deckId))
    .orderBy(asc(fillPasses.createdAt), asc(fillPasses.ordinal));
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
