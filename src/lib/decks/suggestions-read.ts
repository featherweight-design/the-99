// The Consider panel's read, and the owned/unowned pools it is built from.
//
// It lives here rather than in `decks/actions.ts` because the page caches it,
// and a cached loader takes its reader as an argument: `unstable_cache` runs its
// callback outside the request, so a `requireUserId()` inside would throw. A
// `userId`-taking export in a `"use server"` module is a callable endpoint that
// answers for any reader, which is why the split is a move rather than an
// export: the builder page is the only caller, and it has the reader already.
// `requireDeck` below is the authorization, and it is the same guard the action
// wrapper this replaced went through.
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, deckCards } from "../../db/schema";
import { withinColorIdentity } from "../cards/identity-where";
import { ownedCardsWhere } from "../collection/owned-cards";
import { getEdhrecData } from "../edhrec/client";
import { mergeEdhrecData } from "../edhrec/merge";
import { type PoolCard } from "../recs/score";
import { deckBodySize } from "./deck-size";
import { cardTypeGroup, primaryRole, requireDeck } from "./read";
import { buildSuggestionPayload, suggestDeck, type DeckSuggestion } from "./suggest";

// The pool carries mana on top of PoolCard so a tile can draw cost pips and the
// Consider panel can sort by cost without a second round trip.
// `ownedQuantity` is the copies owned summed across printings — a basic is
// owned in quantity, and the fill stacks it to what the shelf actually holds.
// It rides on the pool rather than arriving from a second query because both
// reads scan the same join under the same predicate.
export type SuggestionPoolCard = PoolCard & { manaValue: number; ownedQuantity: number };

// Takes every commander rather than one: a pair's legal pool is the union of
// both identities, and neither commander belongs in its own deck's suggestions.
export async function ownedColorLegalPool(userId: string, commanders: Pick<PoolCard, "oracleId" | "colorIdentity">[]): Promise<SuggestionPoolCard[]> {
  const owned = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords, colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri, artCropUri: cards.artCropUri,
      manaCost: cards.manaCost, manaValue: cards.cmc,
      ownedQuantity: sql<number>`sum(${collectionItems.quantity})::int`,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(ownedCardsWhere(userId, { commanderLegalOnly: true }))
    // Grouping on the primary key makes every other `cards` column functionally
    // dependent, so Postgres accepts them ungrouped — one row per oracle id,
    // which is what the old DISTINCT ON produced.
    .groupBy(cards.oracleId);
  const identity = new Set(commanders.flatMap((c) => c.colorIdentity));
  const commanderIds = new Set(commanders.map((c) => c.oracleId));
  return owned.filter(
    (c) => !commanderIds.has(c.oracleId) && c.colorIdentity.every((x) => identity.has(x)),
  );
}

type UnownedStapleCard = {
  oracleId: string; name: string; typeLine: string;
  oracleText: string | null; keywords: string[];
  imageUri: string | null; manaCost: string | null; manaValue: number;
};

/** Unowned EDHREC staples, ordered by EDHREC rank, that fit the deck's colour
    identity. Takes every commander for the same reason `ownedColorLegalPool`
    does: a pair's legal identity is the union of both, and a staple legal under
    that union must not be dropped because the primary alone cannot cast it.
    Returns the full ranked list; callers bound it. */
export async function unownedStaples(
  commanders: Pick<PoolCard, "oracleId" | "colorIdentity">[],
  topCards: string[],
  ownedIds: Set<string>,
  excludeIds: Set<string>,
): Promise<UnownedStapleCard[]> {
  if (topCards.length === 0) return [];
  const lowerTopCards = topCards.slice(0, 100).map((n) => n.toLowerCase());
  const candidateCards = await db
    .select({
      oracleId: cards.oracleId,
      name: cards.name,
      colorIdentity: cards.colorIdentity,
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
        or(
          inArray(sql`lower(${cards.name})`, lowerTopCards),
          inArray(sql`lower(split_part(${cards.name}, ' // ', 1))`, lowerTopCards),
        ),
        eq(cards.commanderLegal, true),
        withinColorIdentity([...new Set(commanders.flatMap((c) => c.colorIdentity))]),
      ),
    );

  const eligible = candidateCards.filter(
    (c) => !ownedIds.has(c.oracleId) && !excludeIds.has(c.oracleId),
  );

  const topCardIndex = new Map(lowerTopCards.map((n, i) => [n, i]));
  const rankOf = (name: string): number => {
    const lower = name.toLowerCase();
    return topCardIndex.get(lower) ?? topCardIndex.get(lower.split(" // ")[0]) ?? Infinity;
  };
  eligible.sort((a, b) => rankOf(a.name) - rankOf(b.name));
  return eligible;
}

export type DeckSuggestionsPayload = {
  suggestions: DeckSuggestion[];
  degraded: boolean;
  shoppingFigures: Record<string, number> | null;
};

/** `shoppingFigures` is null when EDHREC is unreachable, and a map otherwise. An
    empty map says "we asked and these cards have no figure"; null says "we could
    not ask". The Shopping rows print an absence for the first and nothing at all
    for the second — an outage is not a fact about any one card. */
export async function loadDeckSuggestions(deckId: string, userId: string): Promise<DeckSuggestionsPayload> {
  const deck = await requireDeck(deckId, userId);
  const [commander] = await db.select().from(cards).where(eq(cards.oracleId, deck.commanderOracleId));
  if (!commander) return { suggestions: [], degraded: false, shoppingFigures: {} };

  // The partner is a second commander for every purpose below: the pool it
  // legalises and the advice it contributes.
  const [partner] = deck.partnerOracleId
    ? await db.select().from(cards).where(eq(cards.oracleId, deck.partnerOracleId))
    : [];
  const commanders = partner ? [commander, partner] : [commander];
  const hasPartner = partner != null;

  const pool = await ownedColorLegalPool(userId, commanders);
  const inDeckRows = await db.select({ oracleId: deckCards.oracleId }).from(deckCards)
    .where(eq(deckCards.deckId, deckId));
  const inDeck = new Set(inDeckRows.map((r) => r.oracleId));
  const available = pool.filter((c) => !inDeck.has(c.oracleId));

  // `unreachable` reflects real service outage (5xx/network/timeout with no
  // cache). If EDHREC just doesn't index this commander (4xx), data === null
  // but the deck-suggestions panel should NOT flag "degraded" — user's normal
  // pool/role suggestions are unaffected.
  const results = await Promise.all(commanders.map((c) => getEdhrecData(c.oracleId, c.name)));

  // A pair's advice is the union of both lists, scored by the better of the two:
  // a card the partner loves is not made worse by the primary not knowing it.
  const data = mergeEdhrecData(results.map((r) => r.data));
  // Either commander being unreachable leaves the list knowably incomplete.
  const degraded = results.some((r) => r.unreachable);
  const topCards = data?.topCards ?? null;
  // Sparse: EDHREC reports a figure only for the cards it knows.
  const inclusionByName: Record<string, number | undefined> = data?.inclusionByName ?? {};
  const synergyByName: Record<string, number | undefined> = data?.synergyByName ?? {};

  // Build a map for name lookups
  const byId = new Map(available.map((c) => [c.oracleId, c]));
  const ownedByOracleId = new Set(pool.map((c) => c.oracleId));

  // Compute owned pool suggestions
  const raw = suggestDeck({ commander, ownedPool: available, edhrecTopCards: topCards, hasPartner });

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
      hasPartner,
    );
  });

  // Unowned EDHREC staples: up to 5
  let unownedSuggestions: DeckSuggestion[] = [];
  if (topCards && topCards.length > 0) {
    // unownedStaples returns the full ranked list; this loader caps at 5.
    const excludeIds = new Set([...commanders.map((c) => c.oracleId), ...inDeck]);
    const eligible = await unownedStaples(commanders, topCards, ownedByOracleId, excludeIds);

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
        hasPartner,
      ),
    );
  }

  // Combine and truncate to the deck's body — 99, or 98 for a pair.
  const combined = [...ownedSuggestions, ...unownedSuggestions].slice(0, deckBodySize(hasPartner));

  // No availability on these tiles: a claim is point-in-time and another deck
  // committing changes it, so it belongs to the request rather than to this
  // payload, which the builder page caches. Its caller reads availability for
  // the owned tiles and attaches it there — in the same query it already makes
  // for the top-off candidates, since both want it from this deck's vantage.
  const suggestions = combined;

  // Build shoppingFigures: EDHREC inclusion % for each unowned card in the deck.
  // Uses the same name lookup as buildFillPlan: lowercase, then fall back to the
  // front face of a double-faced card name. Cards with no figure are omitted —
  // absence and "0% of decks" are different states.
  const unownedDeckRows = await db
    .select({ oracleId: cards.oracleId, name: cards.name })
    .from(deckCards)
    .innerJoin(cards, eq(deckCards.oracleId, cards.oracleId))
    .where(
      and(
        eq(deckCards.deckId, deckId),
        sql<boolean>`not exists (
          select 1 from ${collectionItems}
          where ${collectionItems.oracleId} = ${cards.oracleId}
          and ${collectionItems.userId} = ${userId}
        )`,
      ),
    );

  const shoppingFigures: Record<string, number> = {};
  for (const row of unownedDeckRows) {
    const lower = row.name.toLowerCase();
    const raw = inclusionByName[lower] ?? inclusionByName[lower.split(" // ")[0]];
    if (raw != null && Number.isFinite(raw)) {
      shoppingFigures[row.oracleId] = raw;
    }
  }

  return { suggestions, degraded, shoppingFigures: degraded ? null : shoppingFigures };
}
