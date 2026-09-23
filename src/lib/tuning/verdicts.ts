import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import {
  cards,
  deckCards,
  deckProxies,
  deckSuggestionItems,
  deckSuggestionRuns,
  decks,
  type ApplySnapshot,
} from "../../db/schema";
import { validateCardForDeck } from "../decks/add-validation";
import { isBasicLand } from "../decks/grouping";
import { pruneOrphanProxies } from "../decks/prune-proxies";
import { touchDeck } from "../decks/touch";

/**
 * A suggestion's four verdicts, as transactions. SERVER-ONLY. Each takes the reader's id and
 * checks it through the run, so `probe:tuning-run` calls the real writes and the actions in
 * `tuning-actions.ts` add only the session and the revalidation.
 *
 * APPLY AND UNDO ARE LIST MUTATIONS and do everything one does: the deck row's lock first — the
 * order every deck write here takes — then the `deck_cards` changes, `pruneOrphanProxies` when a
 * row left, and `touchDeck`. A cut is ONE copy, as `removeCardFromDeck` removes one; an add is one
 * copy at `auto: false`, because the player chose it.
 *
 * Every verdict is guarded on the verdict it expects, so a second press changes nothing.
 * Each returns the deck id to revalidate, or null when it refused.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The item and its run's deck, or null unless the reader owns the run. Locks the item. */
async function ownedItem(tx: Tx, itemId: string, userId: string) {
  const [row] = await tx
    .select({
      deckId: deckSuggestionRuns.deckId,
      addOracleId: deckSuggestionItems.addOracleId,
      cutOracleId: deckSuggestionItems.cutOracleId,
      verdict: deckSuggestionItems.verdict,
      undoSnapshot: deckSuggestionItems.undoSnapshot,
    })
    .from(deckSuggestionItems)
    .innerJoin(deckSuggestionRuns, eq(deckSuggestionRuns.id, deckSuggestionItems.runId))
    .where(and(eq(deckSuggestionItems.id, itemId), eq(deckSuggestionRuns.userId, userId)))
    .for("update", { of: deckSuggestionItems });
  return row ?? null;
}

async function lockDeck(tx: Tx, deckId: string): Promise<void> {
  await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
}

const rowOf = (deckId: string, oracleId: string) =>
  and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId));

async function readRow(tx: Tx, deckId: string, oracleId: string) {
  const [row] = await tx.select({ quantity: deckCards.quantity, auto: deckCards.auto })
    .from(deckCards).where(rowOf(deckId, oracleId)).for("update");
  return row ?? null;
}

/**
 * Cut one copy, add one, in one transaction, with the verdict and the snapshot undo reads.
 *
 * Refused when the deck no longer holds the cut, when the add is a non-basic it already holds,
 * or when the add no longer fits the deck's commanders — the deck may have moved since the run.
 */
export async function applyItem(itemId: string, userId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    const item = await ownedItem(tx, itemId, userId);
    if (!item || item.verdict !== "pending" || item.cutOracleId === null) return null;
    const { deckId, addOracleId, cutOracleId } = item;
    await lockDeck(tx, deckId);

    const [deck] = await tx.select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId })
      .from(decks).where(eq(decks.id, deckId));
    const cut = await readRow(tx, deckId, cutOracleId);
    const add = await readRow(tx, deckId, addOracleId);
    if (!deck || !cut) return null;

    const facts = await tx.select({
      oracleId: cards.oracleId, typeLine: cards.typeLine,
      colorIdentity: cards.colorIdentity, commanderLegal: cards.commanderLegal,
    }).from(cards).where(inArray(cards.oracleId, [
      addOracleId, deck.commander, ...(deck.partner ? [deck.partner] : []),
    ]));
    const card = facts.find((f) => f.oracleId === addOracleId);
    const commander = facts.find((f) => f.oracleId === deck.commander);
    const partner = facts.find((f) => f.oracleId === deck.partner);
    if (!card || !commander) return null;
    if (add && !isBasicLand(card.typeLine)) return null;
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
    if (rejection) return null;

    const [proxy] = await tx.select({ oracleId: deckProxies.oracleId }).from(deckProxies)
      .where(and(eq(deckProxies.deckId, deckId), eq(deckProxies.oracleId, cutOracleId)));
    const snapshot: ApplySnapshot = {
      cut: { quantity: cut.quantity, auto: cut.auto, proxied: proxy !== undefined },
      add: { quantity: add?.quantity ?? 0, auto: add?.auto ?? false },
    };

    // The verdict and the snapshot first, before the deck changes: undo can only ever read a
    // snapshot of the deck as it was before this very apply.
    await tx.update(deckSuggestionItems)
      .set({ verdict: "accepted", verdictAt: new Date(), undoSnapshot: snapshot })
      .where(and(eq(deckSuggestionItems.id, itemId), eq(deckSuggestionItems.verdict, "pending")));

    if (cut.quantity > 1) {
      await tx.update(deckCards).set({ quantity: cut.quantity - 1 }).where(rowOf(deckId, cutOracleId));
    } else {
      await tx.delete(deckCards).where(rowOf(deckId, cutOracleId));
      // The slot is gone, so the deck's statement about it goes with it.
      await pruneOrphanProxies(tx, deckId);
    }
    if (add) {
      await tx.update(deckCards).set({ quantity: add.quantity + 1 }).where(rowOf(deckId, addOracleId));
    } else {
      await tx.insert(deckCards).values({ deckId, oracleId: addOracleId, quantity: 1, auto: false });
    }
    await touchDeck(tx, deckId);
    return deckId;
  });
}

/**
 * The deck exactly as it was before the apply, for the two rows the apply moved: the cut at its
 * snapshotted quantity, `auto` flag and proxy mark, the add back to its snapshotted quantity —
 * gone when that was 0. The item returns to pending and its snapshot is cleared.
 */
export async function undoItem(itemId: string, userId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    const item = await ownedItem(tx, itemId, userId);
    if (!item || item.verdict !== "accepted" || !item.undoSnapshot || item.cutOracleId === null) return null;
    const { deckId, addOracleId, cutOracleId, undoSnapshot: snap } = item;
    await lockDeck(tx, deckId);

    // Only over the deck the apply left. If the player has since changed either card, the
    // snapshot no longer describes what to undo, and writing it would destroy their edit: the
    // item stays accepted and the deck is untouched.
    const add = await readRow(tx, deckId, addOracleId);
    const cut = await readRow(tx, deckId, cutOracleId);
    const cutLeft = snap.cut ? snap.cut.quantity - 1 : null;
    const addAsApplied = add?.quantity === snap.add.quantity + 1;
    const cutAsApplied = cutLeft === null || (cutLeft === 0 ? cut === null : cut?.quantity === cutLeft);
    if (!addAsApplied || !cutAsApplied) return null;

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
      // Its mark exactly as it was: back if it had one, and gone if it did not — a mark put on
      // the card after the apply is not part of the deck this restores.
      if (snap.cut.proxied) {
        await tx.insert(deckProxies).values({ deckId, oracleId: cutOracleId }).onConflictDoNothing();
      } else {
        await tx.delete(deckProxies)
          .where(and(eq(deckProxies.deckId, deckId), eq(deckProxies.oracleId, cutOracleId)));
      }
    }
    await tx.update(deckSuggestionItems)
      .set({ verdict: "pending", verdictAt: null, undoSnapshot: null })
      .where(and(eq(deckSuggestionItems.id, itemId), eq(deckSuggestionItems.verdict, "accepted")));
    await touchDeck(tx, deckId);
    return deckId;
  });
}

/** Dismiss or restore: the verdict alone, with the deck untouched. */
export async function setDismissed(itemId: string, userId: string, dismissed: boolean): Promise<string | null> {
  return db.transaction(async (tx) => {
    const item = await ownedItem(tx, itemId, userId);
    const from = dismissed ? "pending" : "dismissed";
    if (!item || item.verdict !== from) return null;
    await tx.update(deckSuggestionItems)
      .set({ verdict: dismissed ? "dismissed" : "pending", verdictAt: dismissed ? new Date() : null })
      .where(and(eq(deckSuggestionItems.id, itemId), eq(deckSuggestionItems.verdict, from)));
    return item.deckId;
  });
}
