// Undo of a partner add (#491), apart from `write.ts` so a lasting undo can replace it later.
//
// A pair that came in through `pairAdd` goes back to the single that stayed: the partner leaves
// the command zone (it was never in the 99), and the card the add cut comes back. Every fact is
// read from the live rows, locked, never from the toast: the toast is a minutes-old memory of one
// write, and the deck may have moved since (another tab, a second edit).
//
// Refused, writing nothing, unless the live pair is exactly the pair the toast wrote, the cut is
// not back in the 99 already, and the deck ends at 100 or under. Identity is not re-checked: it
// narrows back to the single's, and a card added in the partner's colors since stays in the deck
// where the deck's own legality read flags it, as it would for any commander change.

import { and, eq, sql } from "drizzle-orm";
import type { db } from "../../db";
import { cards, deckCards, decks } from "../../db/schema";
import { deckBodySize } from "../decks/deck-size";
import { pruneOrphanLocks } from "../decks/locks";
import { pruneOrphanProxies } from "../decks/prune-proxies";
import { touchDeck } from "../decks/touch";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type UndoPartnerAddRefusal =
  /** The deck is not the reader's, or the deck is gone. */
  | "unavailable"
  /** The deck is no longer as the add left it: another pair leads, or the cut is back in the 99. */
  | "changed"
  /** Putting the cut back would take the deck past 100. */
  | "full";

export type UndoPartnerAddResult = { ok: true } | { ok: false; reason: UndoPartnerAddRefusal };

/**
 * Whether the undo may land: the cut is not in the 99 already (unless it stacks, where the add took one copy), and the 99 with the cut back stays
 * within what a single leads (99), so the deck ends at 100 or under. Pure, so the rule has a unit test.
 */
export function undoRoom(
  bodyTotal: number, cut: string | null, inBody: ReadonlySet<string>,
  /** The cut card may be held in several copies (a basic land, an "any number" card): the add took one copy of a stack. */
  stacks = false,
): UndoPartnerAddRefusal | null {
  if (cut !== null && inBody.has(cut) && !stacks) return "changed";
  return bodyTotal + (cut === null ? 0 : 1) > deckBodySize(false) ? "full" : null;
}

/** The whole undo, inside the caller's transaction. `stays` is the single that led before the add
 *  and `partner` the one the add brought; `cutOracleId` is the card the add cut, if it cut one. */
export async function writeUndoPartnerAdd(
  tx: Tx, deckId: string, userId: string, stays: string, partner: string, cutOracleId: string | null,
): Promise<UndoPartnerAddResult> {
  const [deck] = await tx.select({
    commanderOracleId: decks.commanderOracleId, partnerOracleId: decks.partnerOracleId,
  }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId))).for("update");
  if (!deck) return { ok: false, reason: "unavailable" };

  // The pair the toast wrote, in either slot order, and nothing else.
  const live = [deck.commanderOracleId, deck.partnerOracleId];
  if (stays === partner || cutOracleId === stays || cutOracleId === partner
    || deck.partnerOracleId === null || !live.includes(stays) || !live.includes(partner)) {
    return { ok: false, reason: "changed" };
  }

  // Locked before it is read: an edit to `deck_cards` does not take the deck row's lock.
  const body = await tx.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity })
    .from(deckCards).where(eq(deckCards.deckId, deckId)).for("update");
  const total = body.reduce((n, r) => n + r.quantity, 0);
  // A request is a crafted one until proved otherwise: a card that is not in the catalog would
  // throw at the foreign key where the caller is owed the typed refusal.
  let stacks = false;
  if (cutOracleId !== null) {
    const [card] = await tx.select({ typeLine: cards.typeLine, oracleText: cards.oracleText })
      .from(cards).where(eq(cards.oracleId, cutOracleId));
    if (!card) return { ok: false, reason: "changed" };
    stacks = /\bBasic\b/.test(card.typeLine) || /any number of cards named/i.test(card.oracleText ?? "");
  }
  const refusal = undoRoom(total, cutOracleId, new Set(body.map((r) => r.oracleId)), stacks);
  if (refusal) return { ok: false, reason: refusal };

  if (cutOracleId !== null) {
    // An upsert: the add may have taken one copy of a stack, and an insert from another request can
    // land between the read and here (the lock above holds rows, not absences).
    await tx.insert(deckCards).values({ deckId, oracleId: cutOracleId, quantity: 1, auto: false })
      .onConflictDoUpdate({
        target: [deckCards.deckId, deckCards.oracleId],
        set: { quantity: sql`"deck_cards"."quantity" + 1` },
      });
  }
  await tx.update(decks).set({ commanderOracleId: stays, partnerOracleId: null }).where(eq(decks.id, deckId));
  // The partner's proxies and locks key on the columns just written.
  await pruneOrphanProxies(tx, deckId);
  await pruneOrphanLocks(tx, deckId);
  await touchDeck(tx, deckId);
  return { ok: true };
}
