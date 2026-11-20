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
import { resolveOwnedPrintings } from "../collection/owned-printings";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, deckCards } from "../../db/schema";
import { withinColorIdentity } from "../cards/identity-where";
import { ownedCardsWhere } from "../collection/owned-cards";
import { getEdhrecData } from "../edhrec/client";
import type { EdhrecData } from "../edhrec/parse";
import { byInclusion, inclusionLookup } from "../edhrec/inclusion-rank";
import { loadBuildSupport, readBuild } from "../edhrec/build-support";
import { focusThemeSlugs } from "../strategy/edhrec-themes";
import { parseStrategyKey } from "../strategy/focus";
import { mergeEdhrecData } from "../edhrec/merge";
import { readPairSupport, resolvePairEdhrecData } from "../edhrec/pair-read";
import { type PoolCard } from "../recs/score";
import { deckBodySize } from "./deck-size";
import { cardTypeGroup, primaryRole, requireDeck } from "./read";
import { BASIC_NAMES, isBasicLand } from "./grouping";
import { recommendedMix, type RecommendedMix } from "./mix";
import { loadSkeletonForCommanders } from "../profile/load";
import { loadPoolRoleBasis } from "../recs/pool-role-basis";
import { buildSuggestionPayload, suggestDeck, type DeckSuggestion } from "./suggest";
import { SHELF_CAP } from "./shelf-cap";

// The pool carries mana on top of PoolCard so a tile can draw cost pips and the
// Consider panel can sort by cost without a second round trip.
// `ownedQuantity` is the copies owned summed across printings — a basic is
// owned in quantity, and the fill stacks it to what the shelf actually holds.
// It rides on the pool rather than arriving from a second query because both
// reads scan the same join under the same predicate.
/**
 * What the owned pool selects, named so a test can assert it rather than trusting a type.
 *
 * `layout` is the column worth pinning. Nothing in the fill reads it yet — the land sweeps
 * adopt it in a later change — but a column that is absent from the projection resolves to
 * `undefined` on every row rather than failing, so the day it IS read the land count would
 * simply be zero everywhere with no test able to see it. The required field on
 * `FillCandidate` catches a dropped MAPPING; this catches a dropped COLUMN.
 */
export const OWNED_POOL_PROJECTION = {
  oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
  oracleText: cards.oracleText, keywords: cards.keywords, colorIdentity: cards.colorIdentity,
  imageUri: cards.imageUri, artCropUri: cards.artCropUri,
  manaCost: cards.manaCost, manaValue: cards.cmc, layout: cards.layout,
} as const;

/** What the unowned-staples query selects. Same reasoning as `OWNED_POOL_PROJECTION`. */
export const STAPLE_PROJECTION = {
  oracleId: cards.oracleId, name: cards.name, colorIdentity: cards.colorIdentity,
  typeLine: cards.typeLine, oracleText: cards.oracleText, keywords: cards.keywords,
  imageUri: cards.imageUri, manaCost: cards.manaCost, manaValue: cards.cmc,
  layout: cards.layout,
} as const;

/** Narrows `PoolCard.layout` to a non-null string: the deck-building path reads it to tell a
 *  playable land back from one that merely flips, and every row it builds carries one. */
export type SuggestionPoolCard = PoolCard & {
  manaValue: number; ownedQuantity: number; layout: string;
};

// Takes every commander rather than one: a pair's legal pool is the union of
// both identities, and neither commander belongs in its own deck's suggestions.
export async function ownedColorLegalPool(userId: string, commanders: Pick<PoolCard, "oracleId" | "colorIdentity">[]): Promise<SuggestionPoolCard[]> {
  const owned = await db
    .select({
      ...OWNED_POOL_PROJECTION,
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
  imageUri: string | null; manaCost: string | null; manaValue: number; layout: string;
};

/**
 * The names `unownedTopCards` looks up: the first 100 of `topCards`, lowercased, never a basic land.
 * EDHREC lists the basics at 90%+ inclusion, so a ranked list leads with them: a player whose
 * collection holds no basics was offered Forest as a Top pick (#2975), and each basic took one of the
 * 100 slots from a real card. They go BEFORE the cut. The fill places basics from the catalog on its
 * own (`loadCatalogBasics`), never from this list.
 */
export function topCardCut(topCards: readonly string[]): string[] {
  return topCards
    .map((n) => n.toLowerCase())
    .filter((n) => !BASIC_LOWER.has(n.replace(/^snow-covered /, "")))
    .slice(0, 100);
}
const BASIC_LOWER = new Set(BASIC_NAMES.map((n) => n.toLowerCase()));

/** Unowned EDHREC top cards for this commander, in the order of `topCards`, that fit the deck's colour
    identity. Takes every commander for the same reason `ownedColorLegalPool`
    does: a pair's legal identity is the union of both, and a staple legal under
    that union must not be dropped because the primary alone cannot cast it.
    Returns the full ranked list; callers bound it. */
export async function unownedTopCards(
  commanders: Pick<PoolCard, "oracleId" | "colorIdentity">[],
  topCards: string[],
  ownedIds: Set<string>,
  excludeIds: Set<string>,
): Promise<UnownedStapleCard[]> {
  if (topCards.length === 0) return [];
  const lowerTopCards = topCardCut(topCards);
  const candidateCards = await db
    .select(STAPLE_PROJECTION)
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

  // The type-line check backs up `topCardCut`'s name check, for a basic printed under a name it
  // does not list.
  const eligible = candidateCards.filter(
    (c) => !ownedIds.has(c.oracleId) && !excludeIds.has(c.oracleId) && !isBasicLand(c.typeLine),
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
  /** The chosen build's read failed and the commander page ranked Top picks instead: a fallback the
      deck page's cache must not store as the focused shelf (`readChosenBuild`). */
  buildFellBack?: boolean;
  degraded: boolean;
  shoppingFigures: Record<string, number> | null;
  /** What this deck is compared to. Carried on the payload rather than resolved again by the
      deck page, which loads this anyway: the shelf headers here and the strip there are the
      same five cells about the same deck, and a second read is a second chance to disagree. */
  mix: RecommendedMix;
};

/**
 * The order the Top picks shelf ranks EDHREC's names in: by inclusion, highest first. EDHREC's
 * page lists New Cards first, so list order led Windgrace's shelf with Through the Forest Gate
 * (5.6%) ahead of The Gitrog Monster (78%). Ranked BEFORE `unownedTopCards`, which keeps only
 * the first 100 names: ranking after that cut would still lose a well-played card listed late.
 * The same ranking every buy pool in `buildFillPlan` is cut from.
 */
export function topPickNames(
  topCards: readonly string[],
  inclusionByName: Readonly<Record<string, number | undefined>>,
): string[] {
  return byInclusion(topCards, inclusionLookup(inclusionByName));
}

/**
 * The build a deck's strategy focus chose, for the Top picks shelf (engine plan A4, ruling 1): the
 * commander's stored theme pages for the focus's EDHREC slugs, best figure per card (`any`: the slugs
 * are synonyms). None for a pair (pairs are not themed), no focus, no tags or no stored page. A failed
 * read is no build too, and says so (`fellBack`), so the deck page never caches it as the focused shelf.
 */
export function readChosenBuild(
  args: { hasPartner: boolean; focus: string | null; commanderOracleId: string; tags: EdhrecData["tags"] | null },
  load: typeof loadBuildSupport = loadBuildSupport,
): ReturnType<typeof readBuild> {
  return readBuild({
    pair: args.hasPartner, commanderOracleId: args.commanderOracleId, tags: args.tags,
    choices: focusThemeSlugs(parseStrategyKey(args.focus)), join: "any",
  }, load);
}

/**
 * The unowned staples the Top picks shelf is offered: the ranked list trimmed to one
 * shelf. The same `SHELF_CAP` as every other shelf, so the sixth pick is not dropped
 * here before the panel's cap ever sees it (#391).
 */
export function unownedAppend<T>(eligible: readonly T[]): T[] {
  return eligible.slice(0, SHELF_CAP);
}

/**
 * The mix a deck's shelves are counted against and the label sets they are counted by, as ONE
 * basis (labels-everywhere PR 6). The labels are read first: the mix's targets follow the basis
 * they come back under, so a failed read is the classifier on BOTH sides and never labels'
 * targets against classifier counts.
 */
export async function resolveSuggestionBasis(
  commander: { oracleId: string; colorIdentity?: string[] | null },
  partner: { oracleId: string; colorIdentity?: string[] | null } | null,
  hasPartner: boolean,
  available: readonly { oracleId: string }[],
): Promise<{ mix: RecommendedMix; roleSets: Awaited<ReturnType<typeof loadPoolRoleBasis>>["roleSets"] }> {
  const { basis: roleBasis, roleSets } = await loadPoolRoleBasis(available);
  let mix = recommendedMix(null, hasPartner, roleBasis);
  try {
    const { skeleton } = await loadSkeletonForCommanders(
      commander.oracleId,
      partner?.oracleId ?? null,
      [...new Set([...commander.colorIdentity ?? [], ...(partner?.colorIdentity ?? [])])],
      undefined,
      // The strip counts by label (LABEL_ROLE_COUNTS retired, Hugh 2026-10-31), so its targets are the
      // label ones, unless the label read fell back.
      { roleBasis },
    );
    mix = recommendedMix(skeleton, hasPartner, roleBasis);
  } catch (err) {
    console.warn("loadDeckSuggestions: no skeleton — the panel quotes the asserted targets", err);
  }
  return { mix, roleSets };
}

/** `shoppingFigures` is null when EDHREC is unreachable, and a map otherwise. An
    empty map says "we asked and these cards have no figure"; null says "we could
    not ask". The Shopping rows print an absence for the first and nothing at all
    for the second — an outage is not a fact about any one card. */
export async function loadDeckSuggestions(
  deckId: string,
  userId: string,
): Promise<DeckSuggestionsPayload> {
  const deck = await requireDeck(deckId, userId);
  const [commander] = await db.select().from(cards).where(eq(cards.oracleId, deck.commanderOracleId));
  if (!commander) {
    return { suggestions: [], degraded: false, shoppingFigures: {}, mix: recommendedMix(null, false, "labels") };
  }

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
  // A PAIR'S OWN PAGE FIRST, where one has been indexed.
  //
  // `mergeEdhrecData` takes the union of two single-commander lists scored by the better of
  // the two, which is an approximation of what people play with the PAIR. EDHREC publishes
  // the real thing — the Kratos/Atreus page carries its own composition, its own
  // `bracket_counts`, 13,332 decks and rank 159 — so where the monthly index has stored it,
  // that is the better source for the same question. The merge stays as the fallback for a
  // pair EDHREC has no page for; deleting it would silently regress those decks.
  // Stored first, then the DEMAND path, then the merge. The index only fetches pairs present
  // in `decks`, so the first deck to use a new pairing has no stored row — and without the
  // demand fetch it would sit on the approximation until the next monthly run, which is up to
  // a month for exactly the deck whose owner just built something new.
  const stored = hasPartner
    ? (await readPairSupport(commander.oracleId, partner!.oracleId).catch(() => null)) ??
      (await resolvePairEdhrecData(
        commander.oracleId, partner!.oracleId, commander.name, partner!.name,
      ).catch(() => null))
    : null;

  const results = stored
    ? []
    : await Promise.all(commanders.map((c) => getEdhrecData(c.oracleId, c.name)));

  // A pair's advice is the union of both lists, scored by the better of the two:
  // a card the partner loves is not made worse by the primary not knowing it.
  const data = stored ?? mergeEdhrecData(results.map((r) => r.data));
  // Either commander being unreachable leaves the list knowably incomplete. Stored index data
  // is never degraded — it is the same standing the single-commander support the scoring
  // engine reads already has.
  const degraded = stored ? false : results.some((r) => r.unreachable);
  const topCards = data?.topCards ?? null;
  // THE BUILD THE PLAYER CHOSE (engine plan A4, ruling 1), read beside the owned-pool work below and
  // awaited at the Top picks shelf.
  const buildRead = readChosenBuild({
    hasPartner, focus: deck.strategyFocus, commanderOracleId: commander.oracleId, tags: data?.tags ?? null,
  });
  // Sparse: EDHREC reports a figure only for the cards it knows.
  const inclusionByName: Record<string, number | undefined> = data?.inclusionByName ?? {};
  const synergyByName: Record<string, number | undefined> = data?.synergyByName ?? {};

  // Build a map for name lookups
  const byId = new Map(available.map((c) => [c.oracleId, c]));
  const ownedByOracleId = new Set(pool.map((c) => c.oracleId));

  // Compute owned pool suggestions
  // THE SAME MIX THE DECK PAGE DRAWS. The Add panel's shelf headers count against these and
  // its tiles quote them; two sources would disagree by construction on any commander whose
  // measured ramp is not ten.
  const { mix, roleSets } = await resolveSuggestionBasis(commander, partner ?? null, hasPartner, available);

  const raw = suggestDeck({ commander, ownedPool: available, edhrecTopCards: topCards, hasPartner, mix, roleSets });

  // Enrich owned suggestions. Each draws the copy the reader owns, the one its card details will
  // (Hugh, 2026-10-05); fail-soft through `resolveOwnedPrintings`, which keeps the oracle-level art.
  const ownedArt = await resolveOwnedPrintings(userId, raw.map((s) => s.oracleId));
  const ownedSuggestions: DeckSuggestion[] = raw.map((s) => {
    const c = byId.get(s.oracleId)!;
    return buildSuggestionPayload(
      {
        ...s,
        name: c.name,
        printedName: ownedArt.get(s.oracleId)?.printedName ?? null,
        owned: true,
        typeLine: c.typeLine,
        cardTypeGroup: cardTypeGroup(c.typeLine),
        role: primaryRole(c),
        imageUri: ownedArt.get(s.oracleId)?.imageUri ?? c.imageUri,
        manaCost: c.manaCost,
        manaValue: c.manaValue,
      },
      inclusionByName,
      synergyByName,
      mix,
    );
  });

  // Unowned EDHREC staples: one shelf's worth.
  let unownedSuggestions: DeckSuggestion[] = [];
  let buildFellBack = false;
  if (topCards && topCards.length > 0) {
    // unownedTopCards returns the full ranked list; this loader trims it to the
    // Top picks shelf, which draws SHELF_CAP like every other shelf (#391).
    const excludeIds = new Set([...commanders.map((c) => c.oracleId), ...inDeck]);
    // With a strategy focus, the shelf ranks the commander's stored theme page for it in place of the
    // commander page. Order and selection only: each tile's figure stays the commander page's, which
    // is what its copy says it is. Single commanders only (pairs are not themed); no focus or no stored
    // page is today's shelf.
    const { build, fellBack } = await buildRead;
    buildFellBack = fellBack;
    const eligible = await unownedTopCards(
      commanders,
      build ? topPickNames(build.topCards, build.inclusionByName) : topPickNames(topCards, inclusionByName),
      ownedByOracleId, excludeIds,
    );

    unownedSuggestions = unownedAppend(eligible).map((c) =>
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
        mix,
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
  const inclusionOf = inclusionLookup(inclusionByName);
  for (const row of unownedDeckRows) {
    const figure = inclusionOf(row.name);
    if (figure !== null) shoppingFigures[row.oracleId] = figure;
  }

  return { suggestions, degraded, shoppingFigures: degraded ? null : shoppingFigures, mix, buildFellBack };
}
