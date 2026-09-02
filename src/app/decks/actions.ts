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
import { suggestDeck, buildSuggestionPayload, type DeckSuggestion } from "../../lib/decks/suggest";
import { cardTypeGroup, primaryRole } from "../../lib/decks/read";
import { isBasicLand } from "../../lib/decks/grouping";
import { validateDeckName } from "../../lib/decks/deck-name";
import { isCommanderCandidate, type PoolCard } from "../../lib/recs/score";
import { validateCardForDeck } from "../../lib/decks/add-validation";
import { deckAddRejectionMessage, type DeckMutationResult } from "../../lib/decks/mutation-result";
import { planFill, type FillPlan } from "../../lib/decks/fill";

// The pool carries mana on top of PoolCard so a tile can draw cost pips and the
// Consider panel can sort by cost without a second round trip.
// `ownedQuantity` is the copies owned summed across printings — a basic is
// owned in quantity, and the fill stacks it to what the shelf actually holds.
// It rides on the pool rather than arriving from a second query because both
// reads scan the same join under the same predicate.
type SuggestionPoolCard = PoolCard & { manaValue: number; ownedQuantity: number };

async function ownedColorLegalPool(userId: string, commander: Pick<PoolCard, "oracleId" | "colorIdentity">): Promise<SuggestionPoolCard[]> {
  const owned = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, keywords: cards.keywords, colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri, manaCost: cards.manaCost, manaValue: cards.cmc,
      ownedQuantity: sql<number>`sum(${collectionItems.quantity})::int`,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .where(ownedCardsWhere(userId, { commanderLegalOnly: true }))
    // Grouping on the primary key makes every other `cards` column functionally
    // dependent, so Postgres accepts them ungrouped — one row per oracle id,
    // which is what the old DISTINCT ON produced.
    .groupBy(cards.oracleId);
  const identity = new Set(commander.colorIdentity);
  return owned.filter((c) => c.oracleId !== commander.oracleId && c.colorIdentity.every((x) => identity.has(x)));
}

type UnownedStapleCard = {
  oracleId: string; name: string; typeLine: string;
  oracleText: string | null; keywords: string[];
  imageUri: string | null; manaCost: string | null; manaValue: number;
};

/** Unowned EDHREC staples, ordered by EDHREC rank, that fit the commander's
    colour identity. Returns the full ranked list; callers bound it. */
async function unownedStaples(
  commander: Pick<PoolCard, "oracleId" | "colorIdentity">,
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
        arrayContained(cards.colorIdentity, commander.colorIdentity),
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

/** Gathers the pool (quantities included) and the unowned EDHREC staples, then
    plans the fill. The EDHREC call is not the failure to guard: `getEdhrecData`
    degrades an unreachable upstream to `{ data: null }` and the fill goes ahead
    on the collection alone. The database reads are what can throw, so callers
    still guard this. */
export async function buildFillPlan(
  userId: string,
  commander: { oracleId: string; name: string; colorIdentity: string[] },
): Promise<FillPlan> {
  const pool = await ownedColorLegalPool(userId, commander);
  const { data } = await getEdhrecData(commander.oracleId, commander.name);
  const inclusionByName = data?.inclusionByName ?? {};
  const inclusionOf = (name: string): number | null => {
    const lower = name.toLowerCase();
    const raw = inclusionByName[lower] ?? inclusionByName[lower.split(" // ")[0]];
    return Number.isFinite(raw) ? raw : null;
  };

  const ownedIds = new Set(pool.map((c) => c.oracleId));
  const staples = data?.topCards
    ? await unownedStaples(commander, data.topCards, ownedIds, new Set([commander.oracleId]))
    : [];

  return planFill([
    ...pool.map((c) => ({
      oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
      oracleText: c.oracleText, keywords: c.keywords,
      owned: true, ownedQuantity: c.ownedQuantity,
      inclusionPct: inclusionOf(c.name),
    })),
    ...staples.map((c) => ({
      oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
      oracleText: c.oracleText, keywords: c.keywords,
      owned: false, ownedQuantity: 0,
      inclusionPct: inclusionOf(c.name),
    })),
  ]);
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

  const deckName = validateDeckName(name);
  let deckId: string;
  try {
    const plan = await buildFillPlan(userId, {
      oracleId: commanderOracleId,
      name: commander.name,
      colorIdentity: commander.colorIdentity,
    });
    deckId = await db.transaction(async (tx) => {
      const [deck] = await tx.insert(decks)
        .values({ userId, name: deckName, commanderOracleId, filled: true })
        .returning({ id: decks.id });
      if (plan.rows.length > 0) {
        await tx.insert(deckCards).values(
          plan.rows.map((r) => ({ deckId: deck.id, oracleId: r.oracleId, quantity: r.quantity, auto: true })),
        );
      }
      return deck.id;
    });
  } catch (err) {
    // State 15: the deck is here, the cards aren't. The player keeps the deck
    // and the banner offers the fill again — losing the deck too would cost
    // them the one thing they actually asked for.
    console.error("buildFillPlan failed — falling back to empty deck", err);
    const [deck] = await db.insert(decks)
      .values({ userId, name: deckName, commanderOracleId, filled: false })
      .returning({ id: decks.id });
    deckId = deck.id;
  }
  // Outside the try: redirect() signals by throwing, and a catch here would
  // read that throw as a failed fill.
  redirect(`/decks/${deckId}`);
}

export async function getDeckSuggestions(deckId: string): Promise<{ suggestions: DeckSuggestion[]; degraded: boolean; shoppingFigures: Record<string, number> }> {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);
  const [commander] = await db.select().from(cards).where(eq(cards.oracleId, deck.commanderOracleId));
  if (!commander) return { suggestions: [], degraded: false, shoppingFigures: {} };

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
    // unownedStaples returns the full ranked list; getDeckSuggestions caps at 5.
    const excludeIds = new Set([commander.oracleId, ...inDeck]);
    const eligible = await unownedStaples(commander, topCards, ownedByOracleId, excludeIds);

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

  // Build shoppingFigures: EDHREC inclusion % for each unowned card in the deck.
  // Uses the same name lookup as buildFillPlan (actions.ts:117-120): lowercase,
  // then fall back to the front face of a double-faced card name. Cards with no
  // figure are omitted — absence and "0% of decks" are different states.
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
    if (Number.isFinite(raw)) {
      shoppingFigures[row.oracleId] = raw as number;
    }
  }

  return { suggestions, degraded, shoppingFigures };
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
    revalidatePath(`/decks/${deckId}`);
    revalidatePath(`/decks`);
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
  // /decks shows derived stats (built / to-buy) — keep the index fresh too.
  revalidatePath(`/decks/${deckId}`);
  revalidatePath(`/decks`);
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
  revalidatePath(`/decks/${deckId}`);
  revalidatePath(`/decks`);
}

export async function deleteDeck(deckId: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  await db.delete(decks).where(eq(decks.id, deckId));
  revalidatePath(`/decks`);
  redirect("/decks");
}

/** The retry behind the fill-failed banner. Re-runs Task 5's gathering against a
    deck that already exists. Refuses a deck that already holds cards — a retry
    must not double a deck the player has since added to by hand. */
export async function fillDeck(deckId: string): Promise<void> {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);
  const [commander] = await db.select().from(cards).where(eq(cards.oracleId, deck.commanderOracleId));
  if (!commander) return;
  const existing = await db.select({ oracleId: deckCards.oracleId })
    .from(deckCards).where(eq(deckCards.deckId, deckId)).limit(1);
  if (existing.length > 0) return;

  const plan = await buildFillPlan(userId, commander);
  await db.transaction(async (tx) => {
    // Re-read inside the transaction. buildFillPlan reaches out to EDHREC, so
    // the check above is seconds stale by now and the player may have added a
    // card by hand in the meantime — filling on top of it would double a deck
    // they had already started.
    const existingNow = await tx.select({ oracleId: deckCards.oracleId })
      .from(deckCards).where(eq(deckCards.deckId, deckId)).limit(1);
    if (existingNow.length > 0) return;
    if (plan.rows.length > 0) {
      await tx.insert(deckCards).values(
        plan.rows.map((r) => ({ deckId, oracleId: r.oracleId, quantity: r.quantity, auto: true })),
      );
    }
    await tx.update(decks).set({ filled: true }).where(eq(decks.id, deckId));
  });
  revalidatePath(`/decks/${deckId}`);
}

/** Clears the fill's marker on one row. The card stays in the deck — the marker
    is a claim about who put it there, and keeping it is the player saying "mine". */
export async function keepAutoCard(deckId: string, oracleId: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  await db.update(deckCards).set({ auto: false })
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId)));
  revalidatePath(`/decks/${deckId}`);
}

export async function renameDeck(deckId: string, name: string): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  const trimmed = validateDeckName(name);
  await db.update(decks).set({ name: trimmed }).where(eq(decks.id, deckId));
  revalidatePath(`/decks/${deckId}`);
  revalidatePath(`/decks`);
}

/** One removed row, carried so Undo can restore a stacked basic at the exact
    quantity it was swept at rather than guessing 1. */
export type SweptRow = { oracleId: string; quantity: number };

/** The whole sweep in one statement — 58 rows must not be 58 round trips, and a
    partial sweep would leave a receipt that lies about what it removed. Returns
    the rows so Undo can put back exactly what went, and nothing the player kept. */
export async function clearAutoCards(deckId: string): Promise<SweptRow[]> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  const removed = await db.delete(deckCards)
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.auto, true)))
    .returning({ oracleId: deckCards.oracleId, quantity: deckCards.quantity });
  revalidatePath(`/decks/${deckId}`);
  return removed;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Re-inserts the swept rows with auto: true. Uses onConflictDoNothing so a
    double-undo is harmless. The quantity comes from the delete's returning
    clause rather than a fresh read, so a stacked basic comes back at the count
    it was swept at even if the shelf changed in between.

    The rows arrive from the client, and a server action answers any crafted
    request that reaches it — so they are re-checked here rather than trusted.
    A malformed oracle id would otherwise reach Postgres as a failed uuid cast,
    and a forged quantity would write a deck past the 99 the add path enforces. */
export async function restoreAutoCards(deckId: string, rows: SweptRow[]): Promise<void> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  if (rows.length === 0) {
    revalidatePath(`/decks/${deckId}`);
    return;
  }
  // A duplicated oracle id would make the insert's own values conflict, which
  // onConflictDoNothing does not cover — Postgres rejects the statement whole.
  const byId = new Map<string, number>();
  for (const r of rows) {
    if (!UUID_RE.test(r.oracleId)) throw new Error("invalid oracle id");
    if (!Number.isInteger(r.quantity) || r.quantity < 1 || r.quantity > 99) {
      throw new Error("invalid quantity");
    }
    byId.set(r.oracleId, r.quantity);
  }

  // Locking the deck row makes the cap check and the write atomic, the same way
  // addCardToDeck does — an Undo racing a hand-add must not slip past 99.
  await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    // The deck holds 99 rows at most, so reading it whole costs no more than a
    // sum would and also answers which rows the insert is going to skip.
    const present = await tx.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity })
      .from(deckCards).where(eq(deckCards.deckId, deckId));
    const built = present.reduce((n, r) => n + r.quantity, 0);
    // Only the rows that will actually land count against the cap. A card the
    // player re-added by hand before clicking Undo is skipped by the conflict
    // clause, and counting it would refuse a restore that fits.
    const here = new Set(present.map((r) => r.oracleId));
    const restored = [...byId]
      .filter(([oracleId]) => !here.has(oracleId))
      .reduce((n, [, quantity]) => n + quantity, 0);
    if (built + restored > 99) throw new Error("deck full");
    await tx.insert(deckCards)
      .values([...byId].map(([oracleId, quantity]) => ({ deckId, oracleId, quantity, auto: true })))
      .onConflictDoNothing();
  });
  revalidatePath(`/decks/${deckId}`);
}
