import { and, eq, inArray } from "drizzle-orm";

import type { db } from "../../db";
import { deckCards, decks } from "../../db/schema";
import { liveLockedIds, pruneOrphanLocks } from "../decks/locks";
import { pruneOrphanProxies } from "../decks/prune-proxies";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Writes a guided run's swaps to its deck, inside the outcome's own transaction (`finishGuided`), so the pairs a run keeps and the
 * list they change commit together. Not Upgrade's `applyUpgradeOnDeck`: that one is gated on the deck still being a precon box and
 * snapshots it for Undo, and a guided deck has no box. Like that Apply it commits NO version: the swaps land as ordinary changes
 * the player commits in Review. The deck row is locked first, as every deck writer does, so the list is read as the last writer
 * left it. A pair is skipped, never forced, when the deck has moved under the run: its cut is gone or locked ("never cut this"),
 * or its add is already in. Returns the pairs applied.
 */
export async function applyGuidedPairsIn(tx: Tx, userId: string, deckId: string, pairs: readonly { cutId: string; addId: string }[]): Promise<number> {
  if (pairs.length === 0) return 0;
  const [deck] = await tx.select({ id: decks.id }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId))).for("update");
  if (!deck) return 0;
  const live = new Set((await tx.select({ oracleId: deckCards.oracleId }).from(deckCards).where(eq(deckCards.deckId, deckId))).map((r) => r.oracleId));
  const locked = await liveLockedIds(tx, deckId);
  const cuts: string[] = [];
  const adds: string[] = [];
  for (const p of pairs) {
    if (!live.has(p.cutId) || locked.has(p.cutId) || live.has(p.addId) || adds.includes(p.addId) || cuts.includes(p.cutId)) continue;
    cuts.push(p.cutId);
    adds.push(p.addId);
  }
  if (cuts.length === 0) return 0;
  await tx.delete(deckCards).where(and(eq(deckCards.deckId, deckId), inArray(deckCards.oracleId, cuts)));
  await tx.insert(deckCards).values(adds.map((oracleId) => ({ deckId, oracleId, quantity: 1, auto: false })));
  // A cut card keeps no proxy mark, printing pick or lock: the prune every `deck_cards` delete takes.
  await pruneOrphanProxies(tx, deckId);
  await pruneOrphanLocks(tx, deckId);
  return cuts.length;
}
