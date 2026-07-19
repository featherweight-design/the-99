"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../db";
import { cards, collectionItems, deckCards, decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { getEdhrecData } from "../../lib/edhrec/client";
import { suggestDeck } from "../../lib/decks/suggest";
import { isCommanderCandidate, type PoolCard } from "../../lib/recs/score";

async function ownedColorLegalPool(userId: string, commander: PoolCard): Promise<PoolCard[]> {
  const owned = await db
    .selectDistinctOn([cards.oracleId], {
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords, colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri, manaCost: cards.manaCost,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(and(eq(collectionItems.userId, userId), eq(cards.commanderLegal, true)))
    // Postgres requires DISTINCT ON expressions to lead the ORDER BY.
    .orderBy(cards.oracleId);
  const identity = new Set(commander.colorIdentity);
  return owned.filter((c) => c.oracleId !== commander.oracleId && c.colorIdentity.every((x) => identity.has(x)));
}

export async function createDeck(commanderOracleId: string, name: string): Promise<void> {
  const userId = await requireUserId();
  const [commander] = await db.select().from(cards).where(eq(cards.oracleId, commanderOracleId));
  if (!commander) throw new Error("commander not found");
  // Server actions are reachable via crafted requests — re-validate that the
  // card can actually lead a deck, not just that it exists.
  if (!commander.commanderLegal || !isCommanderCandidate(commander)) {
    throw new Error("card is not a legal commander");
  }

  // Spec: suggestions are display-only — nothing is committed until the user adds it.
  // The deck starts empty; the deck page surfaces getDeckSuggestions.
  const [deck] = await db.insert(decks)
    .values({ userId, name, commanderOracleId }).returning({ id: decks.id });
  redirect(`/decks/${deck.id}`);
}

export type DeckSuggestion = { oracleId: string; name: string; reason: "edhrec" | "ramp" | "draw" | "removal" | "wipes" | "land" };

export async function getDeckSuggestions(deckId: string): Promise<DeckSuggestion[]> {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);
  const [commander] = await db.select().from(cards).where(eq(cards.oracleId, deck.commanderOracleId));
  if (!commander) return [];

  const pool = await ownedColorLegalPool(userId, commander);
  const inDeck = new Set(
    (await db.select({ oracleId: deckCards.oracleId }).from(deckCards)
      .where(eq(deckCards.deckId, deckId))).map((r) => r.oracleId),
  );
  const available = pool.filter((c) => !inDeck.has(c.oracleId));
  const edhrec = await getEdhrecData(commander.oracleId, commander.name);
  const byId = new Map(available.map((c) => [c.oracleId, c]));
  return suggestDeck({ commander, ownedPool: available, edhrecTopCards: edhrec?.topCards ?? null })
    .map((s) => ({ oracleId: s.oracleId, name: byId.get(s.oracleId)!.name, reason: s.reason }));
}

async function requireDeck(deckId: string, userId: string) {
  const [deck] = await db.select().from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck) throw new Error("deck not found");
  return deck;
}

export async function addCardToDeck(deckId: string, oracleId: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  const [card] = await db.select({ typeLine: cards.typeLine }).from(cards).where(eq(cards.oracleId, oracleId));
  if (!card) throw new Error("card not found");
  // Commander is singleton: only basic lands may run multiple copies, so a
  // repeat add increments quantity for basics and stays a no-op otherwise.
  if (/\bBasic\b/.test(card.typeLine)) {
    await db.insert(deckCards).values({ deckId, oracleId }).onConflictDoUpdate({
      target: [deckCards.deckId, deckCards.oracleId],
      set: { quantity: sql`${deckCards.quantity} + 1` },
    });
  } else {
    await db.insert(deckCards).values({ deckId, oracleId }).onConflictDoNothing();
  }
  revalidatePath(`/decks/${deckId}`);
}

export async function removeCardFromDeck(deckId: string, oracleId: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  // Decrement multiples (basics); delete the row once quantity would hit 0.
  const decremented = await db.update(deckCards)
    .set({ quantity: sql`${deckCards.quantity} - 1` })
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId), gt(deckCards.quantity, 1)))
    .returning({ oracleId: deckCards.oracleId });
  if (decremented.length === 0) {
    await db.delete(deckCards).where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId)));
  }
  revalidatePath(`/decks/${deckId}`);
}

export async function deleteDeck(deckId: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  await db.delete(decks).where(eq(decks.id, deckId));
  redirect("/decks");
}
