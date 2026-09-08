"use server";

import { and, eq, gt, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../db";
import {
  cards, collectionItems, deckCards, deckGameAxes, deckGames, decks,
  fillPassCards, fillPasses,
} from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { ownedCardsWhere } from "../../lib/collection/owned-cards";
import { withinColorIdentity } from "../../lib/cards/identity-where";
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
import { dedupeSelectionFromPool, planFill, type FillPlan } from "../../lib/decks/fill";
import { sanitizeSelection } from "../../lib/decks/selection-param";
import { readSynergyCards } from "../commanders/[slug]/synergy-read";
import { planLastSlots } from "../../lib/decks/last-slots";
import { recordFillPass } from "../../lib/decks/fill-passes";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { GAME_AXIS_KEYS, isGameAxisKey, type GameAxisKey } from "../../lib/decks/game-axes";
import { gameLogCopy } from "../../lib/copy/game-log";

export type LastSlotsFillResult =
  | { ok: true; added: number; total: number; shortfall: number }
  | { ok: false; message: string };

export type LastSlotsTopUpResult =
  | { ok: true; added: number; total: number; bought: number }
  | { ok: false; message: string };

export type TopOffResult =
  | { ok: true; passId: string | null; added: number; total: number; boughtDelta: number }
  | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
        withinColorIdentity(commander.colorIdentity),
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
  // The cards a selection has already placed. Defaults to empty, so `fillDeck`
  // and the no-selection `createDeck` are unchanged.
  excludeOracleIds: Set<string> = new Set(),
): Promise<FillPlan> {
  const pool = dedupeSelectionFromPool(
    await ownedColorLegalPool(userId, commander),
    excludeOracleIds,
  );
  const { data } = await getEdhrecData(commander.oracleId, commander.name);
  // Sparse: EDHREC reports a figure only for the cards it knows.
  const inclusionByName: Record<string, number | undefined> = data?.inclusionByName ?? {};
  const inclusionOf = (name: string): number | null => {
    const lower = name.toLowerCase();
    const raw = inclusionByName[lower] ?? inclusionByName[lower.split(" // ")[0]];
    return raw != null && Number.isFinite(raw) ? raw : null;
  };

  // Built from the deduped pool, so a selected card the player owns is absent
  // from it and `unownedStaples` may well offer that card back as a staple. The
  // separate dedupe below is what settles it — for that card and for a selected
  // card the player does not own, which only ever reaches the plan through the
  // staples list. Filtering the pool alone would let either be placed twice.
  const ownedIds = new Set(pool.map((c) => c.oracleId));
  const staples = dedupeSelectionFromPool(
    data?.topCards
      ? await unownedStaples(commander, data.topCards, ownedIds, new Set([commander.oracleId]))
      : [],
    excludeOracleIds,
  );

  return planFill([
    ...pool.map((c) => ({
      oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
      oracleText: c.oracleText, keywords: c.keywords, manaCost: c.manaCost,
      owned: true, ownedQuantity: c.ownedQuantity,
      inclusionPct: inclusionOf(c.name),
    })),
    ...staples.map((c) => ({
      oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
      oracleText: c.oracleText, keywords: c.keywords, manaCost: c.manaCost,
      owned: false, ownedQuantity: 0,
      inclusionPct: inclusionOf(c.name),
    })),
  ]);
}

/** `selectedOracleIds` are the synergy picks the player carried across the
    navigation in `?select=`. They are untrusted twice over — a server action
    answers any crafted request, and the ids rode in on a URL — so each is
    re-checked here against the same legality pass `addCardToDeck` runs.

    Unlike `restoreAutoCards`, an id that fails is **skipped, not thrown**: that
    action's input is a receipt the server itself just issued, whereas this one
    is a URL, and refusing the whole create would cost the player the commander
    choice as well as the picks. */
export async function createDeck(
  commanderOracleId: string,
  name: string,
  selectedOracleIds: string[] = [],
): Promise<void> {
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
    // A malformed id would otherwise reach Postgres as a failed uuid cast, and
    // the whole create would fall back to an empty deck. Sanitizing here rather
    // than trusting the URL layer: this action is directly callable, so the
    // shape filter, the dedupe, and the 99 bound all have to hold on its own
    // argument. Dedupe also keeps one repeated id from conflicting with itself
    // inside the insert's own VALUES list.
    const requested = sanitizeSelection(selectedOracleIds);
    const candidates = requested.length > 0
      ? await db
          .select({
            oracleId: cards.oracleId,
            commanderLegal: cards.commanderLegal,
            colorIdentity: cards.colorIdentity,
          })
          .from(cards)
          .where(inArray(cards.oracleId, requested))
      : [];
    // `built: 0` asks about legality alone, exactly as restoreAutoCards does —
    // the cap is enforced by the loop inside the transaction below.
    const selected = candidates
      .filter((card) => !validateCardForDeck(card, {
        commanderOracleId,
        commanderColorIdentity: commander.colorIdentity,
        built: 0,
      }))
      .map((card) => card.oracleId);
    const selectedSet = new Set(selected);

    const plan = await buildFillPlan(userId, {
      oracleId: commanderOracleId,
      name: commander.name,
      colorIdentity: commander.colorIdentity,
    }, selectedSet);
    deckId = await db.transaction(async (tx) => {
      const [deck] = await tx.insert(decks)
        .values({ userId, name: deckName, commanderOracleId, filled: true })
        .returning({ id: decks.id });
      // The selection first, then as much of the fill as fits under 99. The cap
      // sums quantity rather than counting rows, because planFill stacks basics
      // (a single row can be thirty Forests).
      const rows = [
        ...selected.map((oracleId) => ({ deckId: deck.id, oracleId, quantity: 1, auto: true })),
        ...plan.rows.map((r) => ({ deckId: deck.id, oracleId: r.oracleId, quantity: r.quantity, auto: true })),
      ];
      const capped: typeof rows = [];
      let built = 0;
      for (const row of rows) {
        const remaining = 99 - built;
        if (remaining <= 0) break;
        // A stack that overruns the cap is truncated, not dropped. Skipping it
        // would leave the deck short of 99 with room still on the table — two
        // slots left and a stack of four Forests next would spend neither.
        const quantity = Math.min(row.quantity, remaining);
        capped.push({ ...row, quantity });
        built += quantity;
      }
      if (capped.length > 0) {
        await tx.insert(deckCards).values(capped).onConflictDoNothing();
        // The seed pass — the ledger's first line, and the only one whose
        // reversal is the sweep rather than an undo of its own. Recorded in the
        // same transaction as the rows it describes; a deck that got its cards
        // and not its pass would show auto rows the ledger cannot account for.
        // openSlots is 99 because the deck did not exist a statement ago.
        await recordFillPass(tx, {
          deckId: deck.id, kind: "seed", openSlots: 99,
          rows: capped.map((r) => ({ oracleId: r.oracleId, quantity: r.quantity })),
        });
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
  // The redirect renders the new deck's own page, but /decks and the home
  // dashboard both list decks and are held in the client cache for a window
  // now — without this the deck you just made is missing when you navigate back.
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  // Outside the try: redirect() signals by throwing, and a catch here would
  // read that throw as a failed fill.
  redirect(`/decks/${deckId}`);
}

/** `shoppingFigures` is null when EDHREC is unreachable, and a map otherwise. An
    empty map says "we asked and these cards have no figure"; null says "we could
    not ask". The Shopping rows print an absence for the first and nothing at all
    for the second — an outage is not a fact about any one card. */
export async function getDeckSuggestions(deckId: string): Promise<{ suggestions: DeckSuggestion[]; degraded: boolean; shoppingFigures: Record<string, number> | null }> {
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
  // Sparse: EDHREC reports a figure only for the cards it knows.
  const inclusionByName: Record<string, number | undefined> = data?.inclusionByName ?? {};
  const synergyByName: Record<string, number | undefined> = data?.synergyByName ?? {};

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
    if (raw != null && Number.isFinite(raw)) {
      shoppingFigures[row.oracleId] = raw;
    }
  }

  return { suggestions, degraded, shoppingFigures: degraded ? null : shoppingFigures };
}

async function requireDeck(deckId: string, userId: string) {
  const [deck] = await db.select().from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  // The predicate above is defence in depth at the query layer. The explicit
  // comparison below is the authorization the tests constrain — it fires even
  // when the stub or ORM ignores the WHERE clause.
  if (!deck || deck.userId !== userId) throw new Error("deck not found");
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
    // Lock the deck row before re-reading, the same way addCardToDeck does.
    // Without it the read sees a snapshot: a hand-add that commits between the
    // read and the insert would slip past the check, and the fill would land on
    // top of a deck the player had already started.
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
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
      // The retry's fill is still the seed. openSlots is 99 because this path
      // refuses a deck that already holds cards.
      await recordFillPass(tx, {
        deckId, kind: "seed", openSlots: 99,
        rows: plan.rows.map((r) => ({ oracleId: r.oracleId, quantity: r.quantity })),
      });
    }
    await tx.update(decks).set({ filled: true }).where(eq(decks.id, deckId));
  });
  for (const path of claimSurfaces(deckId)) revalidatePath(path);
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

/** The same claim as `keepAutoCard`, made once for every row the fill placed.
    Returns how many cards it cleared, for the one spoken receipt.

    One statement, like the sweep: forty rows must not be forty round trips, and
    a partial pass would leave the toolbar counting one thing and the tags
    another. No lock, for the sweep's reason — under Read Committed an UPDATE
    that meets a row a concurrent DELETE holds waits for that transaction and
    then finds no row, so a sweep landing mid-keep simply takes those cards and
    this write reports what survived it.

    Only the deck path is revalidated, not `claimSurfaces`. The marker says who
    put a card here; an availability claim says who holds a copy. Those are
    different facts, this writes only the first, and no card moves — so the
    availability surfaces have nothing to re-read. `keepAutoCard` revalidates the
    same one path for the same reason. */
export async function keepAllAutoCards(deckId: string): Promise<number> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  const kept = await db.update(deckCards).set({ auto: false })
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.auto, true)))
    .returning({ quantity: deckCards.quantity });
  revalidatePath(`/decks/${deckId}`);
  // Cards, not rows — a stacked basic is one row and several cards, and the
  // count in the button's own label is summed the same way.
  return kept.reduce((n, r) => n + r.quantity, 0);
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

/** One removed row, carried so Undo can restore a stacked basic at the exact
    quantity it was swept at rather than guessing 1. */
export type SweptRow = { oracleId: string; quantity: number };

/** The whole sweep in one statement — 58 rows must not be 58 round trips, and a
    partial sweep would leave a receipt that lies about what it removed. Returns
    the rows so Undo can put back exactly what went, and nothing the player kept.

    No lock, deliberately: under Read Committed a DELETE that meets a row an
    uncommitted UPDATE holds waits for that transaction, then re-evaluates its
    own WHERE against the updated row. A keep that lands mid-sweep therefore
    turns `auto` false before the delete re-reads it, and the sweep passes the
    card by. Serialising these two by hand would buy nothing Postgres is not
    already doing. */
export async function clearAutoCards(deckId: string): Promise<SweptRow[]> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  const removed = await db.delete(deckCards)
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.auto, true)))
    .returning({ oracleId: deckCards.oracleId, quantity: deckCards.quantity });
  for (const path of claimSurfaces(deckId)) revalidatePath(path);
  return removed;
}

/** Re-inserts the swept rows with auto: true. Uses onConflictDoNothing so a
    double-undo is harmless. The quantity comes from the delete's returning
    clause rather than a fresh read, so a stacked basic comes back at the count
    it was swept at even if the shelf changed in between.

    The rows arrive from the client, and a server action answers any crafted
    request that reaches it — so they are re-checked here rather than trusted.
    A malformed oracle id would otherwise reach Postgres as a failed uuid cast,
    a forged quantity would write a deck past the 99 the add path enforces, and
    a substituted oracle id would put a card in the deck that the add path would
    have refused as illegal, off-identity, or the commander itself.

    Returns how many cards actually landed, which is not the receipt's total: a
    card the player re-added by hand is skipped by the conflict clause, and the
    announcement must not claim to have restored it. */
export async function restoreAutoCards(deckId: string, rows: SweptRow[]): Promise<number> {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);
  if (rows.length === 0) {
    revalidatePath(`/decks/${deckId}`);
    return 0;
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

  // Every id gets the same legality pass addCardToDeck runs. The cap lives with
  // the write below, so `built: 0` here asks about legality alone.
  const ids = [...byId.keys()];
  const [[commander], candidates] = await Promise.all([
    db.select({ colorIdentity: cards.colorIdentity })
      .from(cards).where(eq(cards.oracleId, deck.commanderOracleId)),
    db.select({ oracleId: cards.oracleId, commanderLegal: cards.commanderLegal, colorIdentity: cards.colorIdentity })
      .from(cards).where(inArray(cards.oracleId, ids)),
  ]);
  if (!commander) throw new Error("commander not found");
  const byOracleId = new Map(candidates.map((c) => [c.oracleId, c]));
  for (const oracleId of ids) {
    const card = byOracleId.get(oracleId);
    if (!card) throw new Error("card not found");
    const rejection = validateCardForDeck(card, {
      commanderOracleId: deck.commanderOracleId,
      commanderColorIdentity: commander.colorIdentity,
      built: 0,
    });
    if (rejection) throw new Error(rejection);
  }

  // Locking the deck row keeps the read and the write atomic, the same way
  // addCardToDeck does — the returned count is what the Undo toast reports, and
  // a hand-add racing it would otherwise make that number a guess.
  return await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    // Only the ids being restored. The read exists to say which of them the
    // insert's conflict clause will skip, and with the cap gone the rest of the
    // deck is an unbounded scan answering nothing.
    const present = await tx.select({ oracleId: deckCards.oracleId })
      .from(deckCards)
      .where(and(eq(deckCards.deckId, deckId), inArray(deckCards.oracleId, ids)));
    // A card the player re-added by hand before clicking Undo is skipped by the
    // conflict clause, so it is not part of what this restore put back.
    const here = new Set(present.map((r) => r.oracleId));
    const restored = [...byId]
      .filter(([oracleId]) => !here.has(oracleId))
      .reduce((n, [, quantity]) => n + quantity, 0);
    await tx.insert(deckCards)
      .values([...byId].map(([oracleId, quantity]) => ({ deckId, oracleId, quantity, auto: true })))
      .onConflictDoNothing();
    for (const path of claimSurfaces(deckId)) revalidatePath(path);
    return restored;
  });
}

// ---------------------------------------------------------------------------
// Last-slots fill actions
// ---------------------------------------------------------------------------

/** Shared logic for both fill controls. The only difference between owned-only
 *  and top-up is `ownedOnly`. Both follow the restoreAutoCards locking pattern:
 *  for-update, re-read inside the lock, legality pass per card (skipping rather
 *  than throwing), insert with onConflictDoNothing, revalidate claim surfaces. */
async function fillLastSlots(deckId: string, ownedOnly: boolean) {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);
  const [commander] = await db.select({ colorIdentity: cards.colorIdentity })
    .from(cards).where(eq(cards.oracleId, deck.commanderOracleId));
  if (!commander) throw new Error("commander not found");

  // The exclusion input is empty: the panel's role-coverage exclusion is a
  // commander-page concern, and on the deck surface every ranked card is a
  // candidate. planLastSlots does the in-deck filtering.
  const ranked = await readSynergyCards(userId, deck.commanderOracleId, []);

  return await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    // Re-read inside the lock. openSlots computed before it is a number another
    // tab may already have spent.
    const present = await tx.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity })
      .from(deckCards).where(eq(deckCards.deckId, deckId));
    const built = present.reduce((n, r) => n + r.quantity, 0);
    const inDeck = new Set(present.map((r) => r.oracleId));

    const { place } = planLastSlots({
      ranked, openSlots: 99 - built, inDeckOracleIds: inDeck, ownedOnly,
    });

    // Read card rows for the legality pass — same inArray shape as restoreAutoCards.
    const byOracleId = place.length > 0
      ? new Map(
          (await tx.select({
            oracleId: cards.oracleId,
            commanderLegal: cards.commanderLegal,
            colorIdentity: cards.colorIdentity,
          }).from(cards).where(inArray(cards.oracleId, place)))
            .map((c) => [c.oracleId, c]),
        )
      : new Map<string, { oracleId: string; commanderLegal: boolean; colorIdentity: string[] }>();

    // Same legality pass the add path runs; a refusal skips one card rather
    // than failing the fill, because a fill is a bulk act and one off-identity
    // row is not a reason to place nothing.
    const legal = place.filter((oracleId) => {
      const card = byOracleId.get(oracleId);
      return card != null && !validateCardForDeck(card, {
        commanderOracleId: deck.commanderOracleId,
        commanderColorIdentity: commander.colorIdentity,
        built: 0,
      });
    });

    if (legal.length > 0) {
      await tx.insert(deckCards)
        .values(legal.map((oracleId) => ({ deckId, oracleId, quantity: 1, auto: true })))
        .onConflictDoNothing();
    }
    for (const path of claimSurfaces(deckId)) revalidatePath(path);
    // finalCounts: copies per oracle id after the write — what was already in the
    // deck at its stacked quantity, plus one copy for each card that just landed.
    // The wrapper scopes its collection read to these ids and counts `bought` by
    // copies, because `bought` is a card count everywhere else it appears
    // (planFill sums quantities, and the announcement pairs it with a total that
    // does), so a deck holding four unowned basics has to report four.
    const finalCounts = new Map(present.map((r) => [r.oracleId, r.quantity]));
    // `?? 1` rather than an unconditional 1: an id already present lost its
    // insert to onConflictDoNothing and keeps the quantity it had.
    for (const oracleId of legal) finalCounts.set(oracleId, finalCounts.get(oracleId) ?? 1);
    // shortfall: derived from what actually landed (post-legality-filter) so the
    // reported numbers add up to 99. Pre-filter shortfall could read "0 short"
    // while the deck is one card light if the legality pass dropped a card.
    // Clamped at zero: a deck that somehow holds more than 99 is corrupt state,
    // not a negative shortfall, and "−1 short" is a worse answer than "none".
    const shortfall = Math.max(0, 99 - (built + legal.length));
    return { added: legal.length, total: built + legal.length, shortfall, userId, finalCounts };
  });
}

export async function fillLastSlotsOwned(deckId: string): Promise<LastSlotsFillResult> {
  try {
    const r = await fillLastSlots(deckId, true);
    return { ok: true, added: r.added, total: r.total, shortfall: r.shortfall };
  } catch (err) {
    console.error("fillLastSlotsOwned failed", err);
    return { ok: false, message: synergyCopy.lastSlots.fillFailed };
  }
}

export async function fillLastSlotsUnowned(deckId: string): Promise<LastSlotsTopUpResult> {
  try {
    const r = await fillLastSlots(deckId, false);
    // `bought` is the whole deck's unowned count after the write — ownership lives
    // in collection_items, not the ranked list, so a deck card EDHREC never ranked
    // still counts. This read is outside the transaction: collection_items is not
    // touched by the deck write and needs no row lock.
    const finalIds = [...r.finalCounts.keys()];
    // Gated on a non-empty list like every other inArray in this file: a deck
    // holding nothing, whose fill placed nothing, would otherwise ask for
    // `in ()`. It has no answer to give either — nothing in the deck is nothing
    // bought.
    const owned = finalIds.length === 0
      ? new Set<string>()
      : new Set(
          (await db.select({ oracleId: collectionItems.oracleId })
            .from(collectionItems)
            .where(and(
              eq(collectionItems.userId, r.userId),
              inArray(collectionItems.oracleId, finalIds),
            )))
            .map((c) => c.oracleId),
        );
    const bought = [...r.finalCounts].reduce(
      (n, [oracleId, quantity]) => (owned.has(oracleId) ? n : n + quantity),
      0,
    );
    return { ok: true, added: r.added, total: r.total, bought };
  } catch (err) {
    console.error("fillLastSlotsUnowned failed", err);
    return { ok: false, message: synergyCopy.lastSlots.topUpFailed };
  }
}

/** Places exactly the cards the player ticked, as one act.
 *
 *  Unlike the two fill controls, nothing here is planned server-side: the list
 *  is the plan, and this writes the selection it produced. That difference is
 *  why an illegal card refuses the whole commit rather than being skipped — the
 *  player chose these cards specifically, and placing all but one of them would
 *  make the receipt lie about what they asked for.
 *
 *  The refusal is a race guard and not the surface for a ticked row going
 *  illegal: the list recounts that client-side before any request leaves, so a
 *  refusal here means the two views disagree, and it renders as the generic
 *  failure the top-up already ships. */
async function runTopOff(deckId: string, oracleIds: string[]) {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);

  // A duplicate would make the insert's own values conflict, which
  // onConflictDoNothing does not cover — Postgres rejects the statement whole.
  const ids = [...new Set(oracleIds)];
  if (ids.length !== oracleIds.length) throw new Error("duplicate oracle id");
  for (const oracleId of ids) {
    if (!UUID_RE.test(oracleId)) throw new Error("invalid oracle id");
  }
  if (ids.length === 0) throw new Error("nothing selected");

  const [commander] = await db.select({ colorIdentity: cards.colorIdentity })
    .from(cards).where(eq(cards.oracleId, deck.commanderOracleId));
  if (!commander) throw new Error("commander not found");

  const landedIds = await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    // Re-read inside the lock. The open-slot count the player ticked against is
    // a number another tab may already have spent.
    const present = await tx.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity })
      .from(deckCards).where(eq(deckCards.deckId, deckId));
    const built = present.reduce((n, r) => n + r.quantity, 0);
    // A refusal, not a truncation: a caller past the cap is working from a stale
    // view of the deck and should be told rather than silently given less.
    if (ids.length > 99 - built) throw new Error("more cards than open slots");

    const byOracleId = new Map(
      (await tx.select({
        oracleId: cards.oracleId,
        commanderLegal: cards.commanderLegal,
        colorIdentity: cards.colorIdentity,
      }).from(cards).where(inArray(cards.oracleId, ids)))
        .map((c) => [c.oracleId, c]),
    );
    for (const oracleId of ids) {
      const card = byOracleId.get(oracleId);
      if (!card) throw new Error("card not found");
      // `built: 0` asks about legality alone — the cap is enforced above,
      // against the deck as the lock found it.
      const rejection = validateCardForDeck(card, {
        commanderOracleId: deck.commanderOracleId,
        commanderColorIdentity: commander.colorIdentity,
        built: 0,
      });
      if (rejection) throw new Error(rejection);
    }

    // A card the player added by hand between opening the list and committing
    // loses its insert to the conflict clause, so it is not part of this pass.
    const here = new Set(present.map((r) => r.oracleId));
    const landed = ids.filter((oracleId) => !here.has(oracleId));
    await tx.insert(deckCards)
      .values(ids.map((oracleId) => ({ deckId, oracleId, quantity: 1, auto: true })))
      .onConflictDoNothing();
    // Only the rows that landed. A pass claiming a card it did not place would
    // offer to undo one the player put there themselves.
    const passId = await recordFillPass(tx, {
      deckId, kind: "top_off", openSlots: 99 - built,
      rows: landed.map((oracleId) => ({ oracleId, quantity: 1 })),
    });
    for (const path of claimSurfaces(deckId)) revalidatePath(path);
    return { passId, landed, total: built + landed.length, userId };
  });

  return landedIds;
}

export async function commitTopOff(deckId: string, oracleIds: string[]): Promise<TopOffResult> {
  try {
    const r = await runTopOff(deckId, oracleIds);
    // The shopping figure the commit row promised: cards this act placed that
    // the player does not own, not the deck's whole unowned count. Read outside
    // the transaction — collection_items is untouched by the deck write.
    const owned = r.landed.length === 0
      ? new Set<string>()
      : new Set(
          (await db.select({ oracleId: collectionItems.oracleId })
            .from(collectionItems)
            .where(and(
              eq(collectionItems.userId, r.userId),
              inArray(collectionItems.oracleId, r.landed),
            )))
            .map((c) => c.oracleId),
        );
    const boughtDelta = r.landed.filter((oracleId) => !owned.has(oracleId)).length;
    return { ok: true, passId: r.passId, added: r.landed.length, total: r.total, boughtDelta };
  } catch (err) {
    console.error("commitTopOff failed", err);
    return { ok: false, message: synergyCopy.lastSlots.topUpFailed };
  }
}

/** The inverse of one top-off, at any age.
 *
 *  Deletes only the pass's *live* rows — still in the deck, still the app's. A
 *  card the player kept has graduated out of provenance and cannot be reached
 *  by this, which is the design's ruling stated as a `where` clause.
 *
 *  Neither the pass row nor its membership is deleted. The membership record is
 *  immutable, and the line goes on its own: with no live rows left the pass
 *  summarises to nothing and drops out of the ledger. Keeping the row also keeps
 *  the ordinals stable — an undone `top-off 1` never lets its number be handed
 *  out again — and keeps "has this deck ever had a pass?" answerable, which is
 *  the condition the legacy line turns on.
 *
 *  Returns the number of cards actually removed, which is what the announcement
 *  states: a second undo of the same pass finds nothing live and removes none. */
export async function undoFillPass(deckId: string, passId: string): Promise<number> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);
  if (!UUID_RE.test(passId)) throw new Error("invalid pass id");

  const [pass] = await db.select({ deckId: fillPasses.deckId, kind: fillPasses.kind })
    .from(fillPasses).where(eq(fillPasses.id, passId));
  // The explicit deck comparison is the authorization: a pass id from another
  // deck is unknown here, not a licence to delete that deck's cards.
  if (!pass || pass.deckId !== deckId) throw new Error("pass not found");
  // The seed line grows no undo of its own — it names the sweep as its reversal,
  // and `clearAutoCards` is the control that performs it. The guard exists so a
  // hand-made call cannot do what the UI declines to offer.
  if (pass.kind === "seed") throw new Error("a seed pass is reversed by the sweep");

  const members = await db.select({ oracleId: fillPassCards.oracleId })
    .from(fillPassCards).where(eq(fillPassCards.passId, passId));
  if (members.length === 0) return 0;

  const removed = await db.delete(deckCards)
    .where(and(
      eq(deckCards.deckId, deckId),
      eq(deckCards.auto, true),
      inArray(deckCards.oracleId, members.map((m) => m.oracleId)),
    ))
    .returning({ quantity: deckCards.quantity });
  // The shopping list is derived from deck membership, so this is also what
  // gives the player their money back — nothing separate restores it.
  for (const path of claimSurfaces(deckId)) revalidatePath(path);
  return removed.reduce((n, r) => n + r.quantity, 0);
}

export type LogGameInput = {
  result: "win" | "loss" | "draw";
  podSize: number;
  /** When the game was played. Defaults to now. Never in the future. */
  playedAt?: Date;
  worked: string[];
  hurt: string[];
};

const GAME_RESULTS: readonly string[] = ["win", "loss", "draw"];

/** How far ahead of the server a player's clock may run before a log is refused. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * Record one game against a deck.
 *
 * Every refusal the form can act on is returned as { ok: false, message }
 * rather than thrown: the form renders it through the shipped MutationError and
 * keeps every value the player typed, which a thrown error would destroy along
 * with the form. Auth and ownership still throw, from requireUserId and
 * requireDeck — a player who cannot reach the deck has no form to preserve.
 *
 * There is no `for update` here, unlike addCardToDeck. That lock exists to keep
 * two concurrent adds from both seeing 98 cards and pushing the deck to 100.
 * A game log has no such ceiling — two concurrent logs are simply two games.
 */
export async function logGame(
  deckId: string,
  input: LogGameInput,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);

  const refuse = { ok: false as const, message: gameLogCopy.form.refused };

  // A server action is a public endpoint, so the input's declared type is a
  // claim and not a guarantee. Everything below is shape-checked before it is
  // used, or a crafted payload would throw where the contract promises a refusal.
  if (!input || typeof input !== "object") return refuse;
  if (!GAME_RESULTS.includes(input.result)) return refuse;
  if (!Number.isInteger(input.podSize) || input.podSize < 2 || input.podSize > 8) return refuse;

  const sent = input.playedAt ?? new Date();
  if (!(sent instanceof Date) || Number.isNaN(sent.getTime())) return refuse;
  // The instant comes off the player's own clock, which routinely runs a little
  // ahead of the server's. A game logged tonight would then be refused as a
  // future one, so the skew window is tolerated and then clamped away: what is
  // stored never runs ahead of the server, and a genuinely future date — the
  // only thing this rule exists to refuse — is still refused.
  const now = Date.now();
  if (sent.getTime() > now + CLOCK_SKEW_MS) return refuse;
  const playedAt = new Date(Math.min(sent.getTime(), now));

  // The vocabulary is eight axes, so any longer list is a crafted payload rather
  // than a game. Length is checked before the keys are, or a public endpoint
  // would walk an arbitrarily long array to reach the same refusal.
  const marksFit = (marks: unknown): marks is GameAxisKey[] =>
    Array.isArray(marks) && marks.length <= GAME_AXIS_KEYS.length && marks.every(isGameAxisKey);
  if (!marksFit(input.worked)) return refuse;
  if (!marksFit(input.hurt)) return refuse;

  // Dedupe within a list before checking across them, so ['mana','mana'] is a
  // single mark rather than a primary-key collision, while ['mana'] on both
  // sides is still the contradiction the composite key exists to forbid.
  const worked = [...new Set(input.worked)] as GameAxisKey[];
  const hurt = [...new Set(input.hurt)] as GameAxisKey[];
  if (worked.some((key) => hurt.includes(key))) return refuse;

  try {
    await db.transaction(async (tx) => {
      const [game] = await tx
        .insert(deckGames)
        .values({ deckId, userId, result: input.result, podSize: input.podSize, playedAt })
        .returning({ id: deckGames.id });

      const marks = [
        ...worked.map((axis) => ({ gameId: game.id, axis, polarity: "worked" })),
        ...hurt.map((axis) => ({ gameId: game.id, axis, polarity: "hurt" })),
      ];
      // Drizzle rejects an empty values array, and no marks is a valid log.
      if (marks.length > 0) await tx.insert(deckGameAxes).values(marks);
    });
  } catch (err) {
    // The player sees one generic refusal by design, so the underlying failure
    // has nowhere else to surface.
    console.error("logGame failed", err);
    return refuse;
  }

  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}

/**
 * Remove one logged game. The axis rows follow through ON DELETE CASCADE.
 *
 * There is no edit action by design, so this is the whole correction path: a
 * game logged wrong is deleted and logged again. That is why the history row's
 * confirm is inline and one step rather than a dialog — it is a routine
 * operation, not an exceptional one.
 */
export async function deleteGame(
  deckId: string,
  gameId: string,
): Promise<DeckMutationResult> {
  const userId = await requireUserId();
  await requireDeck(deckId, userId);

  const refuse = { ok: false as const, message: gameLogCopy.history.deleteRefused };

  // requireDeck above proves the caller owns this deck. It does not prove this
  // game is on it, so the pairing is part of the delete's own predicate rather
  // than a separate read: a check-then-delete would report success for a row
  // another tab removed in between, and the player would watch a game they
  // thought they had just deleted stay on the page.
  let deleted: { id: string }[];
  try {
    deleted = await db
      .delete(deckGames)
      .where(
        and(eq(deckGames.id, gameId), eq(deckGames.deckId, deckId), eq(deckGames.userId, userId)),
      )
      .returning({ id: deckGames.id });
  } catch (err) {
    console.error("deleteGame failed", err);
    return refuse;
  }
  if (deleted.length === 0) return refuse;

  for (const path of deckSurfaces(deckId)) revalidatePath(path);
  return { ok: true };
}
