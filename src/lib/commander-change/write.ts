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
import { pruneOrphanLocks } from "../decks/locks";
import { canPair, partnerAbility } from "../decks/partner";
import { pruneOrphanProxies } from "../decks/prune-proxies";
import { touchDeck } from "../decks/touch";
import { isCommanderCandidate } from "../recs/score";
import { commanderMoved, offerable, type CommanderPair } from "./pending";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ChangeCommanderRefusal =
  /** The switch is off, the deck is not the reader's, or the deck is gone. */
  | "unavailable"
  /** Not a legal commander, not a legal pair, or two of the same card. */
  | "illegal"
  /** A different color identity, or a single for a pair (rulings 2 and 3). */
  | "mismatch"
  /** The deck is already led by exactly this commander or pair. */
  | "unchanged";

export type ChangeCommanderResult = { ok: true } | { ok: false; reason: ChangeCommanderRefusal };

/** Sorted, so two identities compare as sets. */
function identity(rows: readonly { colorIdentity: string[] }[]): string[] {
  return [...new Set(rows.flatMap((r) => r.colorIdentity))].sort();
}

/** The whole write, inside the caller's transaction. Refuses, writing nothing, unless the deck is
 *  the user's, the new leader is legal, and it matches the deck's size and exact identity. */
export async function writeCommanderChange(
  tx: Tx, deckId: string, userId: string, to: CommanderPair,
): Promise<ChangeCommanderResult> {
  const [deck] = await tx.select({
    commanderOracleId: decks.commanderOracleId, partnerOracleId: decks.partnerOracleId,
  }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId))).for("update");
  if (!deck) return { ok: false, reason: "unavailable" };

  // Size first: a single leads a single, a pair leads a pair (ruling 3).
  if ((deck.partnerOracleId === null) !== (to.partnerOracleId === null)) {
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
  if (incoming.some((c) => !c || !c.commanderLegal || !isCommanderCandidate(c))) {
    return { ok: false, reason: "illegal" };
  }
  const [a, b] = incoming as NonNullable<(typeof incoming)[number]>[];
  if (b && !canPair(
    { name: a.name, ability: partnerAbility(a.oracleText) },
    { name: b.name, ability: partnerAbility(b.oracleText) },
  )) {
    return { ok: false, reason: "illegal" };
  }

  // Exactly this deck's identity, so not one card of the 99 changes legality (ruling 2).
  const current = fromIds.map((id) => byId.get(id)).filter((c) => c !== undefined);
  if (identity(current).join() !== identity(incoming as { colorIdentity: string[] }[]).join()) {
    return { ok: false, reason: "mismatch" };
  }

  // Locked before it is read: an edit to `deck_cards` does not take the deck row's lock.
  const body = await tx.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity })
    .from(deckCards).where(eq(deckCards.deckId, deckId)).for("update");
  const inBody = new Map(body.map((r) => [r.oracleId, r.quantity]));
  // The loader's hold-back, enforced where it cannot be skipped: a pair with a half in the 98.
  // A kept half leads already and is never a body row, so the whole new pair is what is tested.
  if (!offerable(toIds, new Set(inBody.keys()))) {
    return { ok: false, reason: "illegal" };
  }

  // The trade: each arriving half that comes out of the 99 frees one slot, and a departing
  // half takes it. A commander that arrives from outside the 99 opens no slot, so the one it
  // replaces simply leaves.
  const arrivingFromBody = toIds.filter((id) => !fromIds.includes(id) && inBody.has(id));
  const departing = fromIds.filter((id) => !toIds.includes(id));
  const gone: string[] = [];
  for (const [i, id] of arrivingFromBody.entries()) {
    const quantity = inBody.get(id)!;
    if (quantity > 1) {
      await tx.update(deckCards).set({ quantity: quantity - 1 })
        .where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, id)));
    } else {
      gone.push(id);
    }
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
