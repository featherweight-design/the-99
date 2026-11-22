// The commander write's transaction (plan decision 6; audit F2), apart from the Server Action
// so a probe can call it without a request. `actions.ts` is the only production caller.
//
// It writes the deck's LIVE commander columns, which are the draft's commander: the newest
// version still holds the old one, so every pending surface sees the move, a commit freezes it
// with a fresh tenure, and Discard puts the version's back. When a new commander comes out of the
// 99, the old one takes its slot in the same transaction (the three-entry trade), so the body
// stays whole.

import { and, eq, inArray } from "drizzle-orm";
import type { db } from "../../db";
import { cards, deckCards, decks } from "../../db/schema";
import { deckBodySize } from "../decks/deck-size";
import { liveLockedIds, pruneOrphanLocks } from "../decks/locks";
import { backgroundPairs, canAddSecond } from "../decks/partner";
import { pruneOrphanProxies } from "../decks/prune-proxies";
import { touchDeck } from "../decks/touch";
import { isCommanderCandidate } from "../recs/score";
import { commanderMoved, tradeShape, type CommanderPair } from "./pending";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ChangeCommanderRefusal =
  /** The deck is not the reader's, or the deck is gone. */
  | "unavailable"
  /** Not a legal commander, not a legal pair, or two of the same card. */
  | "illegal"
  /** A different color identity, or a single for a pair (rulings 2 and 3). */
  | "mismatch"
  /** The deck is already led by exactly this commander or pair. */
  | "unchanged";

export type ChangeCommanderResult = { ok: true } | { ok: false; reason: ChangeCommanderRefusal };

/**
 * The cut a `pairAdd` needs (#491). A pair leads 98, so a deck whose body holds more than 98 must
 * lose exactly the excess, and a body already at 98 or under loses nothing. Over 99 is refused: no
 * single cut brings it to 98 (the sheet hides the add for such a deck, and this refuses a request that skips the sheet). The cut is a card of the
 * body, never a commander half, and never a locked one.
 */
export function cutAllowed(
  bodyTotal: number, cut: string | null, inBody: ReadonlySet<string>,
  commanders: readonly string[], locked: ReadonlySet<string>,
): boolean {
  const excess = bodyTotal - deckBodySize(true);
  if (excess <= 0) return cut === null;
  if (excess > 1 || cut === null) return false;
  return inBody.has(cut) && !commanders.includes(cut) && !locked.has(cut);
}

/** Sorted, so two identities compare as sets. */
function identity(rows: readonly { colorIdentity: string[] }[]): string[] {
  return [...new Set(rows.flatMap((r) => r.colorIdentity))].sort();
}

type Half = { name: string; typeLine: string; oracleText: string | null; manaCost: string | null; layout: string | null };

/**
 * The legality of the cards a change would lead the deck with: each half a commander candidate and
 * a second half one that `canAddSecond` pairs. A Background is only ever the second half beside a
 * commander that chooses one: it never leads, so `isCommanderCandidate` still gates the first half,
 * and the second unless it is such a Background.
 */
export function pairLegal(a: Half, b: Half | undefined): boolean {
  if (!isCommanderCandidate(a)) return false;
  if (b === undefined) return true;
  return (backgroundPairs(a, b) || isCommanderCandidate(b)) && canAddSecond(a, b);
}

/** Whether the new leader's identity (both sorted) fits the deck's: equal, or a superset when a
 *  single becomes a pair. */
export function identityFits(from: readonly string[], to: readonly string[], growing: boolean): boolean {
  if (!growing) return from.join() === to.join();
  return from.every((c) => to.includes(c));
}

/** Takes one copy of a card out of the 99. A copy beyond the first drops the quantity and returns
 *  false; a last copy returns true and the caller deletes the row, in the block that prunes the
 *  proxies and locks the removal leaves behind. */
async function takeOne(tx: Tx, deckId: string, oracleId: string, quantity: number): Promise<boolean> {
  if (quantity <= 1) return true;
  await tx.update(deckCards).set({ quantity: quantity - 1 })
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId)));
  return false;
}

/** The whole write, inside the caller's transaction. Refuses, writing nothing, unless the deck is
 *  the user's, the new leader is legal, and it matches the deck's size and exact identity. */
export async function writeCommanderChange(
  tx: Tx, deckId: string, userId: string, to: CommanderPair,
  /** A half-trade's choice: the old half that takes the freed slot. Refused anywhere else. */
  staysOracleId: string | null = null,
  /** A `pairAdd`'s cut: the card that leaves so the deck stays at 100. Refused anywhere else. */
  cutOracleId: string | null = null,
): Promise<ChangeCommanderResult> {
  const [deck] = await tx.select({
    commanderOracleId: decks.commanderOracleId, partnerOracleId: decks.partnerOracleId,
  }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId))).for("update");
  if (!deck) return { ok: false, reason: "unavailable" };

  // Size first: a single leads a single, a pair leads a pair (ruling 3), except that a single may
  // become a pair (Hugh, 2026-10-26): a precon or an imported list can arrive with its partner in
  // the 99. A pair never becomes a single.
  const growing = deck.partnerOracleId === null && to.partnerOracleId !== null;
  if (deck.partnerOracleId !== null && to.partnerOracleId === null) {
    return { ok: false, reason: "mismatch" };
  }
  if (to.partnerOracleId === to.commanderOracleId) return { ok: false, reason: "illegal" };
  if (!commanderMoved(deck, to)) return { ok: false, reason: "unchanged" };

  const fromIds = [deck.commanderOracleId, ...(deck.partnerOracleId ? [deck.partnerOracleId] : [])];
  const toIds = [to.commanderOracleId, ...(to.partnerOracleId ? [to.partnerOracleId] : [])];
  const facts = await tx.select({
    oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
    oracleText: cards.oracleText, manaCost: cards.manaCost, layout: cards.layout,
    commanderLegal: cards.commanderLegal, colorIdentity: cards.colorIdentity,
  }).from(cards).where(inArray(cards.oracleId, [...fromIds, ...toIds]));
  const byId = new Map(facts.map((f) => [f.oracleId, f]));

  // The same legality `createDeck` applies: a request is a crafted one until proved otherwise.
  const incoming = toIds.map((id) => byId.get(id));
  if (incoming.some((c) => !c || !c.commanderLegal)) return { ok: false, reason: "illegal" };
  const [a, b] = incoming as NonNullable<(typeof incoming)[number]>[];
  if (!pairLegal(a, b)) return { ok: false, reason: "illegal" };

  // Exactly this deck's identity, so not one card of the 99 changes legality (ruling 2). A single
  // becoming a pair may widen it instead: a wider identity makes no card illegal, and a partner
  // that sat in the 99 is often the reason the deck reads as not legal.
  const current = fromIds.map((id) => byId.get(id)).filter((c) => c !== undefined);
  if (!identityFits(identity(current), identity(incoming as { colorIdentity: string[] }[]), growing)) {
    return { ok: false, reason: "mismatch" };
  }

  // Locked before it is read: an edit to `deck_cards` does not take the deck row's lock.
  const body = await tx.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity })
    .from(deckCards).where(eq(deckCards.deckId, deckId)).for("update");
  const inBody = new Map(body.map((r) => [r.oracleId, r.quantity]));
  // The loader's rule, enforced where it cannot be skipped: a change no design draws is refused.
  const shape = tradeShape(toIds, fromIds, new Set(inBody.keys()));
  if (shape === null) return { ok: false, reason: "illegal" };
  // A half-trade names the old half that stays in the 98; nothing else takes a choice, so a stray
  // one is refused rather than ignored (a stale sheet must not write a choice nobody made).
  const leaving = fromIds.filter((id) => !toIds.includes(id));
  if (shape === "halfTrade" ? staysOracleId === null || !leaving.includes(staysOracleId) : staysOracleId !== null) {
    return { ok: false, reason: "illegal" };
  }

  // The partner from outside the 99 opens no slot, so the deck's size is the write's to check:
  // the cut is validated against the rows locked above and the live locks, never the client's view.
  const gone: string[] = [];
  if (shape === "pairAdd") {
    const total = [...inBody.values()].reduce((a, b) => a + b, 0);
    const locked = await liveLockedIds(tx, deckId);
    if (!cutAllowed(total, cutOracleId, new Set(inBody.keys()), toIds, locked)) {
      return { ok: false, reason: "illegal" };
    }
    if (cutOracleId !== null && await takeOne(tx, deckId, cutOracleId, inBody.get(cutOracleId)!)) gone.push(cutOracleId);
  } else if (cutOracleId !== null) {
    return { ok: false, reason: "illegal" };
  }

  // The trade: each arriving half that comes out of the 99 frees one slot, and a departing
  // half takes it. A commander that arrives from outside the 99 opens no slot, so the one it
  // replaces simply leaves.
  const arrivingFromBody = toIds.filter((id) => !fromIds.includes(id) && inBody.has(id));
  // The staying half first, so it takes the freed slot and the other leaves the deck.
  // A `pairUp` brings one half out of the 99, and a pair leads 98, so no old card takes its slot.
  const departing = shape === "pairUp" ? []
    : staysOracleId ? [staysOracleId, ...leaving.filter((id) => id !== staysOracleId)] : leaving;
  for (const [i, id] of arrivingFromBody.entries()) {
    if (await takeOne(tx, deckId, id, inBody.get(id)!)) gone.push(id);
    const slot = departing[i];
    if (slot !== undefined) {
      await tx.insert(deckCards).values({ deckId, oracleId: slot, quantity: 1, auto: false })
        .onConflictDoUpdate({
          target: [deckCards.deckId, deckCards.oracleId],
          set: { quantity: (inBody.get(slot) ?? 0) + 1 },
        });
    }
  }
  // In this function's own block, so the two prunes below reconcile what it removed.
  if (gone.length > 0) await tx.delete(deckCards).where(and(eq(deckCards.deckId, deckId), inArray(deckCards.oracleId, gone)));

  await tx.update(decks).set({
    commanderOracleId: to.commanderOracleId, partnerOracleId: to.partnerOracleId,
  }).where(eq(decks.id, deckId));
  // Commander proxies key on the columns just written, and a lock names a card that may have
  // just left the 99 for the command zone.
  await pruneOrphanProxies(tx, deckId);
  await pruneOrphanLocks(tx, deckId);
  await touchDeck(tx, deckId);
  return { ok: true };
}
