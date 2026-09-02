"use server";

import { and, arrayContained, eq, gt, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../db";
import { cards, collectionItems, deckCards, decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { ownedCardsWhere } from "../../lib/collection/owned-cards";
import { getEdhrecData } from "../../lib/edhrec/client";
import { loadAvailability } from "../../lib/decks/availability-query";
import { claimSurfaces, deckSurfaces } from "../../lib/decks/revalidate";
import { suggestDeck, buildSuggestionPayload, type DeckSuggestion } from "../../lib/decks/suggest";
import { cardTypeGroup, primaryRole } from "../../lib/decks/read";
import { isBasicLand } from "../../lib/decks/grouping";
import { validateDeckName } from "../../lib/decks/deck-name";
import { isCommanderCandidate, type PoolCard } from "../../lib/recs/score";
import { validateCardForDeck } from "../../lib/decks/add-validation";
import { deckAddRejectionMessage, type DeckMutationResult } from "../../lib/decks/mutation-result";

// The pool carries mana on top of PoolCard so a tile can draw cost pips and the
// Consider panel can sort by cost without a second round trip.
type SuggestionPoolCard = PoolCard & { manaValue: number };

async function ownedColorLegalPool(userId: string, commander: PoolCard): Promise<SuggestionPoolCard[]> {
  const owned = await db
    .selectDistinctOn([cards.oracleId], {
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords, colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri, manaCost: cards.manaCost, manaValue: cards.cmc,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(ownedCardsWhere(userId, { commanderLegalOnly: true }))
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
    .values({ userId, name: validateDeckName(name), commanderOracleId }).returning({ id: decks.id });
  // The redirect renders the new deck's own page, but /decks and the home
  // dashboard both list decks and are held in the client cache for a window
  // now — without this the deck you just made is missing when you navigate back.
  for (const path of deckSurfaces(deck.id)) revalidatePath(path);
  redirect(`/decks/${deck.id}`);
}

export async function getDeckSuggestions(deckId: string): Promise<{ suggestions: DeckSuggestion[]; degraded: boolean }> {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);
  const [commander] = await db.select().from(cards).where(eq(cards.oracleId, deck.commanderOracleId));
  if (!commander) return { suggestions: [], degraded: false };

  const pool = await ownedColorLegalPool(userId, commander);
  const inDeckRows = await db.select({ oracleId: deckCards.oracleId }).from(deckCards)
    .where(eq(deckCards.deckId, deckId));
  const inDeck = new Set(inDeckRows.map((r) => r.oracleId));
  const available = pool.filter((c) => !inDeck.has(c.oracleId));

  // `unreachable` reflects real service outage (5xx/network/timeout with no
  // cache). If EDHREC just doesn't index this commander (4xx), data === null
  // but the deck-suggestions panel should NOT flag "degraded" — user's normal
  // pool/role suggestions are unaffected.
  const { data, unreachable } = await getEdhrecData(commander.oracleId, commander.name);
  const degraded = unreachable;
  const topCards = data?.topCards ?? null;
  const inclusionByName = data?.inclusionByName ?? {};
  const synergyByName = data?.synergyByName ?? {};

  // Build a map for name lookups
  const byId = new Map(available.map((c) => [c.oracleId, c]));
  const ownedByOracleId = new Set(pool.map((c) => c.oracleId));

  // Compute owned pool suggestions
  const raw = suggestDeck({ commander, ownedPool: available, edhrecTopCards: topCards });

  // Enrich owned suggestions
  const ownedSuggestions: DeckSuggestion[] = raw.map((s) => {
    const c = byId.get(s.oracleId)!;
    return buildSuggestionPayload(
      {
        ...s,
        name: c.name,
        owned: true,
        typeLine: c.typeLine,
        cardTypeGroup: cardTypeGroup(c.typeLine),
        role: primaryRole(c),
        imageUri: c.imageUri,
        manaCost: c.manaCost,
        manaValue: c.manaValue,
      },
      inclusionByName,
      synergyByName,
    );
  });

  // Unowned EDHREC staples: up to 5
  let unownedSuggestions: DeckSuggestion[] = [];
  if (topCards && topCards.length > 0) {
    // Query cards by name (case-insensitive), commander_legal, and color identity.
    // Cap the IN list — only 5 unowned staples are surfaced, so the top of
    // EDHREC's ranking is more than enough candidates.
    const lowerTopCards = topCards.slice(0, 100).map((n) => n.toLowerCase());
    const candidateCards = await db
      .select({
        oracleId: cards.oracleId,
        name: cards.name,
        colorIdentity: cards.colorIdentity,
        // Only needed to classify the card for an optimistic decklist row.
        typeLine: cards.typeLine,
        oracleText: cards.oracleText,
        keywords: cards.keywords,
        imageUri: cards.imageUri,
        manaCost: cards.manaCost,
        manaValue: cards.cmc,
      })
      .from(cards)
      .where(
        and(
          // EDHREC keys DFCs/MDFCs by front face while cards.name stores
          // "Front // Back" — match either the full name or the front face.
          or(
            inArray(sql`lower(${cards.name})`, lowerTopCards),
            inArray(sql`lower(split_part(${cards.name}, ' // ', 1))`, lowerTopCards),
          ),
          eq(cards.commanderLegal, true),
          arrayContained(cards.colorIdentity, commander.colorIdentity),
        ),
      );

    // Filter: not owned, not in deck, not the commander
    const eligible = candidateCards.filter(
      (c) => !ownedByOracleId.has(c.oracleId) && !inDeck.has(c.oracleId) && c.oracleId !== commander.oracleId,
    );

    // Order by position in topCards (front-face fallback for DFCs).
    const topCardIndex = new Map(lowerTopCards.map((n, i) => [n, i]));
    const rankOf = (name: string): number => {
      const lower = name.toLowerCase();
      return topCardIndex.get(lower) ?? topCardIndex.get(lower.split(" // ")[0]) ?? Infinity;
    };
    eligible.sort((a, b) => rankOf(a.name) - rankOf(b.name));

    unownedSuggestions = eligible.slice(0, 5).map((c) =>
      buildSuggestionPayload(
        {
          oracleId: c.oracleId,
          name: c.name,
          reason: "edhrec",
          owned: false,
          typeLine: c.typeLine,
          cardTypeGroup: cardTypeGroup(c.typeLine),
          role: primaryRole(c),
          imageUri: c.imageUri,
          manaCost: c.manaCost,
          manaValue: c.manaValue,
        },
        inclusionByName,
        synergyByName,
      ),
    );
  }

  // Combine and truncate to 99
  const combined = [...ownedSuggestions, ...unownedSuggestions].slice(0, 99);

  // Scoped to the tiles actually returned, and read from this deck's vantage so
  // a card the deck already claims does not count against itself. Swallowed:
  // Consider is a panel of recommendations, and a failed rollup must cost it its
  // chips, not its tiles. `degraded` is EDHREC's flag and stays untouched — the
  // availability model has no degraded surface at all (design 5.7).
  // Owned tiles only. Consider carries unowned staples since #176, and
  // `loadAvailability` is driven by the collection — an unowned oracle id can
  // never come back from it, so including it only widens the array parameter.
  const ownedIds = combined.filter((s) => s.owned).map((s) => s.oracleId);
  const availability =
    ownedIds.length > 0
      ? await loadAvailability(userId, { excludeDeckId: deckId, oracleIds: ownedIds }).catch(
          () => null,
        )
      : null;
  const suggestions = combined.map((s) => ({
    ...s,
    availability: availability?.get(s.oracleId) ?? null,
  }));

  return { suggestions, degraded };
}

async function requireDeck(deckId: string, userId: string) {
  const [deck] = await db.select().from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck) throw new Error("deck not found");
  return deck;
}

export async function addCardToDeck(deckId: string, oracleId: string): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);

  // Fetch commander color identity in the same round-trip as the card lookup.
  const [[commander], [card], [existingRow]] = await Promise.all([
    db.select({ colorIdentity: cards.colorIdentity })
      .from(cards).where(eq(cards.oracleId, deck.commanderOracleId)),
    db.select({ typeLine: cards.typeLine, commanderLegal: cards.commanderLegal, colorIdentity: cards.colorIdentity })
      .from(cards).where(eq(cards.oracleId, oracleId)),
    db.select({ oracleId: deckCards.oracleId })
      .from(deckCards).where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId))),
  ]);

  if (!card) throw new Error("card not found");
  if (!commander) throw new Error("commander not found");

  // Re-adding a non-basic that's already in the deck is a no-op (singleton) —
  // return before validation so a full deck doesn't spuriously reject it.
  // Still revalidate: the click means this page's HTML disagreed with the row
  // that exists, and without a fresh render the optimistic "✓ In deck" would
  // flash back to "+ Add" when the transition ends.
  if (existingRow && !isBasicLand(card.typeLine)) {
    for (const path of deckSurfaces(deckId)) revalidatePath(path);
    return { ok: true };
  }

  // Lock the deck row so the 99-card cap check and the write are atomic —
  // concurrent adds serialize here instead of both passing the cap at 98.
  const rejection = await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    const [builtRow] = await tx.select({ total: sql<number>`coalesce(sum(${deckCards.quantity}), 0)::int` })
      .from(deckCards).where(eq(deckCards.deckId, deckId));
    const built = builtRow?.total ?? 0;
    const error = validateCardForDeck(
      { commanderLegal: card.commanderLegal, colorIdentity: card.colorIdentity, oracleId },
      { commanderOracleId: deck.commanderOracleId, commanderColorIdentity: commander.colorIdentity, built },
    );
    if (error) return error;

    // Commander is singleton apart from the multi-copy exception (see
    // isBasicLand), so a repeat add increments quantity there and stays a
    // no-op otherwise.
    if (isBasicLand(card.typeLine)) {
      await tx.insert(deckCards).values({ deckId, oracleId }).onConflictDoUpdate({
        target: [deckCards.deckId, deckCards.oracleId],
        set: { quantity: sql`${deckCards.quantity} + 1` },
      });
    } else {
      await tx.insert(deckCards).values({ deckId, oracleId }).onConflictDoNothing();
    }
    return null;
  });
  if (rejection) return { ok: false, message: deckAddRejectionMessage(rejection) };
  // /decks shows derived stats (built / to-buy) — keep the index fresh too, and
  // the two surfaces that draw availability off deck rows with it.
  for (const path of claimSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
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
  for (const path of claimSurfaces(deckId)) revalidatePath(path);
}

export async function deleteDeck(deckId: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  await db.delete(decks).where(eq(decks.id, deckId));
  // Deleting a deck releases every claim it held, so the availability markers
  // on /collection and /commanders are wrong until they are told.
  for (const path of claimSurfaces(deckId)) revalidatePath(path);
  redirect("/decks");
}

export async function renameDeck(deckId: string, name: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  const trimmed = validateDeckName(name);
  await db.update(decks).set({ name: trimmed }).where(eq(decks.id, deckId));
  // No claim changes, so the availability surfaces are untouched — but the home
  // dashboard names the three most recent decks and would keep the old one.
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
}
