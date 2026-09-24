/**
 * ONE swap in a deck's draft: cut one copy of a card and add one copy of another, and put both
 * back exactly as they were. Shared by deck tuning's Apply and the swap tools' Take, which brief
 * ruling 7 makes the same act, so a player learns one swap mechanism and the two tools cannot
 * drift into two.
 *
 * SERVER-ONLY. Each takes the caller's transaction, and the caller has already locked the deck row:
 * every deck write in this codebase locks the deck first, and deleting a deck locks it before
 * cascading, so taking any other lock first could deadlock against a delete.
 *
 * A cut is ONE copy, as `removeCardFromDeck` removes one; an add is one copy at `auto: false`,
 * because the player chose it. A basic already in the deck gains a copy; any other card it already
 * holds is refused, as the singleton rule requires.
 */
import { and, eq, inArray } from "drizzle-orm";

import type { db } from "../../db";
import { cards, deckCards, deckProxies, decks, type ApplySnapshot } from "../../db/schema";
import { validateCardForDeck } from "../decks/add-validation";
import { isBasicLand } from "../decks/grouping";
import { pruneOrphanProxies } from "../decks/prune-proxies";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Why a swap was refused. Every one means the deck moved after the list the player acted on was
 * read (another tab, another device), which is what the refusal copy tells them (audit F11): the
 * reason is returned rather than a bare null so a caller can tell a refusal from a failure, which
 * throws.
 */
export type SwapRefusal =
  /** The deck no longer holds the card being cut. */
  | "cutGone"
  /** The deck already holds the card being added, and it is not a basic. */
  | "addHeld"
  /** The add no longer fits the deck's commanders: not legal, or outside their identity. */
  | "addIllegal";

export type SwapPlan = { ok: true; snapshot: ApplySnapshot } | { ok: false; reason: SwapRefusal };

const rowOf = (deckId: string, oracleId: string) =>
  and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId));

async function readRow(tx: Tx, deckId: string, oracleId: string) {
  const [row] = await tx.select({ quantity: deckCards.quantity, auto: deckCards.auto })
    .from(deckCards).where(rowOf(deckId, oracleId)).for("update");
  return row ?? null;
}

/**
 * Check a swap against the deck as it is now, and snapshot the two rows it would move. Writes
 * nothing, so a caller can record the snapshot before the deck changes (tuning writes it onto the
 * suggestion first: an undo can only ever read the deck as it was before this very apply).
 */
export async function planSwap(tx: Tx, deckId: string, cutOracleId: string, addOracleId: string): Promise<SwapPlan> {
  const [deck] = await tx.select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId })
    .from(decks).where(eq(decks.id, deckId));
  const cut = await readRow(tx, deckId, cutOracleId);
  const add = await readRow(tx, deckId, addOracleId);
  if (!deck || !cut) return { ok: false, reason: "cutGone" };

  const facts = await tx.select({
    oracleId: cards.oracleId, typeLine: cards.typeLine,
    colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal,
  }).from(cards).where(inArray(cards.oracleId, [
    addOracleId, deck.commander, ...(deck.partner ? [deck.partner] : []),
  ]));
  const card = facts.find((f) => f.oracleId === addOracleId);
  const commander = facts.find((f) => f.oracleId === deck.commander);
  const partner = facts.find((f) => f.oracleId === deck.partner);
  if (!card || !commander) return { ok: false, reason: "addIllegal" };
  if (add && !isBasicLand(card.typeLine)) return { ok: false, reason: "addHeld" };
  const rejection = validateCardForDeck(
    { oracleId: addOracleId, commanderLegal: card.commanderLegal, colorIdentity: card.colorIdentity },
    {
      commanderOracleId: deck.commander,
      commanderColorIdentity: commander.colorIdentity,
      partnerOracleId: deck.partner,
      partnerColorIdentity: partner?.colorIdentity ?? null,
      built: 0,
    },
  );
  if (rejection) return { ok: false, reason: "addIllegal" };

  const [proxy] = await tx.select({ oracleId: deckProxies.oracleId }).from(deckProxies)
    .where(and(eq(deckProxies.deckId, deckId), eq(deckProxies.oracleId, cutOracleId)));
  return {
    ok: true,
    snapshot: {
      cut: { quantity: cut.quantity, auto: cut.auto, proxied: proxy !== undefined },
      add: { quantity: add?.quantity ?? 0, auto: add?.auto ?? false },
    },
  };
}

/** Make a planned swap: one copy of the cut out, one copy of the add in. Does not touch the deck stamp. */
export async function applySwap(
  tx: Tx, deckId: string, cutOracleId: string, addOracleId: string, snapshot: ApplySnapshot,
): Promise<void> {
  const cut = snapshot.cut!;
  if (cut.quantity > 1) {
    await tx.update(deckCards).set({ quantity: cut.quantity - 1 }).where(rowOf(deckId, cutOracleId));
  } else {
    await tx.delete(deckCards).where(rowOf(deckId, cutOracleId));
    // The slot is gone, so the deck's statement about it goes with it.
    await pruneOrphanProxies(tx, deckId);
  }
  if (snapshot.add.quantity > 0) {
    await tx.update(deckCards).set({ quantity: snapshot.add.quantity + 1 }).where(rowOf(deckId, addOracleId));
  } else {
    await tx.insert(deckCards).values({ deckId, oracleId: addOracleId, quantity: 1, auto: false });
  }
}

/**
 * The deck exactly as it was before the swap, for the two rows it moved: the cut at its snapshotted
 * quantity, `auto` flag and proxy mark, the add back to its snapshotted quantity, gone when that
 * was 0.
 *
 * ONLY OVER THE DECK THE SWAP LEFT. If the player has since changed either card, the snapshot no
 * longer describes what to undo, and writing it would destroy their edit: returns false and writes
 * nothing. Does not touch the deck stamp.
 */
export async function restoreSwap(
  tx: Tx, deckId: string, cutOracleId: string, addOracleId: string, snap: ApplySnapshot,
): Promise<boolean> {
  const add = await readRow(tx, deckId, addOracleId);
  const cut = await readRow(tx, deckId, cutOracleId);
  // Quantity AND provenance: the swap inserts a new add at `auto: false` and leaves an existing
  // row's flag alone, and a `keep` pressed since is an edit like any other.
  const cutLeft = snap.cut ? snap.cut.quantity - 1 : null;
  const addAuto = snap.add.quantity === 0 ? false : snap.add.auto;
  const addAsApplied = add?.quantity === snap.add.quantity + 1 && add.auto === addAuto;
  const cutAsApplied = !snap.cut || (cutLeft === 0
    ? cut === null
    : cut?.quantity === cutLeft && cut.auto === snap.cut.auto);
  if (!addAsApplied || !cutAsApplied) return false;

  if (snap.add.quantity === 0) {
    await tx.delete(deckCards).where(rowOf(deckId, addOracleId));
    // A proxy mark put on the add while it was in the deck leaves with it.
    await pruneOrphanProxies(tx, deckId);
  } else {
    await tx.insert(deckCards)
      .values({ deckId, oracleId: addOracleId, quantity: snap.add.quantity, auto: snap.add.auto })
      .onConflictDoUpdate({
        target: [deckCards.deckId, deckCards.oracleId],
        set: { quantity: snap.add.quantity, auto: snap.add.auto },
      });
  }
  if (snap.cut) {
    await tx.insert(deckCards)
      .values({ deckId, oracleId: cutOracleId, quantity: snap.cut.quantity, auto: snap.cut.auto })
      .onConflictDoUpdate({
        target: [deckCards.deckId, deckCards.oracleId],
        set: { quantity: snap.cut.quantity, auto: snap.cut.auto },
      });
    // Its mark exactly as it was: back if it had one, and gone if it did not. A mark put on the
    // card after the swap is not part of the deck this restores.
    if (snap.cut.proxied) {
      await tx.insert(deckProxies).values({ deckId, oracleId: cutOracleId }).onConflictDoNothing();
    } else {
      await tx.delete(deckProxies)
        .where(and(eq(deckProxies.deckId, deckId), eq(deckProxies.oracleId, cutOracleId)));
    }
  }
  return true;
}
