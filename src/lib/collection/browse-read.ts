// The collection's database reads, split out of `browse.ts` (2026-10-13) so that module stays
// free of the database: client components import its pure helpers (`cssUrl`, the filters and
// sorts), and while these reads lived beside them, drizzle-orm's core shipped to the browser on
// every route, with the Neon driver and the schema as lazy chunks behind it.
// `client-imports.test.ts` keeps it that way.
import { cache } from "react";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  aggregateCollection,
  attachPrices,
  startPriceRead,
  toListCards,
  type BrowseCard,
  type BrowseListCard,
  type RawCollectionRow,
} from "./browse";
import type { OwnedSetMeta } from "./set-filter";
import type { PrintingPrices } from "../cards/price-lookup";
import { factsFor } from "../bracket/facts";
import type { CardBracketFlags } from "../bracket/flags-read";
import { recordSoftFailure } from "../cache/soft-failure";

/**
 * Server query — joins collection_items × cards for the user, optionally narrowed to one
 * oracle id or to a list of them. Untested-query pattern (see recommend.ts / summary.ts): thin, logic-free SQL,
 * pure aggregation covered by tests above.
 *
 * Rooted in collection_items, so a card the user does not own yields no rows at all —
 * card-detail.ts falls those through to the catalog rather than reporting "no such card".
 */
export async function selectCollectionRows(
  userId: string,
  // A list, for the deck route, which needs ~99 of them in one pass. Never pass
  // an empty array: `inArray` with no values is a SQL error in some drivers and
  // a full scan in others, so callers guard on length.
  oracleId?: string | string[],
  /** A transaction to read inside (a commit reading the copies its own start just wrote); the shared pool otherwise. */
  runner?: Pick<typeof import("../../db").db, "select">,
): Promise<RawCollectionRow[]> {
  const db = runner ?? (await import("../../db")).db;
  const { cardArtPreferences, cards, collectionItems, printings, sets } =
    await import("../../db/schema");
  const { alias } = await import("drizzle-orm/pg-core");
  // Two aliases of `printings`: the exact printing owned (tier 1) and the representative
  // printing for that (oracle, set) (tier 2). Both are LEFT joins — a missing row must fall
  // through to the next tier, and resolveImageUri falls through on a null image too.
  const exact = alias(printings, "exact_printing");
  const representative = alias(printings, "representative_printing");
  const rows = await db
    .select({
      oracleId: collectionItems.oracleId,
      quantity: collectionItems.quantity,
      // When the holding arrived, for the Date added sort (`aggregateCollection` folds it per card).
      addedAt: collectionItems.addedAt,
      addedExact: collectionItems.addedExact,
      setCode: collectionItems.setCode,
      collectorNumber: collectionItems.collectorNumber,
      finish: collectionItems.finish,
      setName: sets.name,
      releasedAt: sets.releasedAt,
      preferredSetCode: cardArtPreferences.setCode,
      preferredCollectorNumber: cardArtPreferences.collectorNumber,
      // The holding's own printing id, for readers that ask the catalog about this
      // exact printing rather than about the card. Null on a name-only import.
      scryfallId: collectionItems.scryfallId,
      name: cards.name,
      typeLine: cards.typeLine,
      manaCost: cards.manaCost,
      cmc: cards.cmc,
      oracleText: cards.oracleText,
      keywords: cards.keywords,
      rarity: cards.rarity,
      colorIdentity: cards.colorIdentity,
      gameChanger: cards.gameChanger,
      layout: cards.layout,
      backImageUri: cards.backImageUri,
      exactImageUri: exact.imageUri,
      exactArtCropUri: exact.artCropUri,
      representativeArtCropUri: representative.artCropUri,
      cardArtCropUri: cards.artCropUri,
      // The `exact` alias is the printing joined on `collection_items.scryfall_id`
      // — the printing the player physically owns, and the only one whose printed
      // name is theirs to show.
      flavorName: exact.flavorName,
      exactBackImageUri: exact.backImageUri,
      representativeImageUri: representative.imageUri,
      representativeFlavorName: representative.flavorName,
      representativeBackImageUri: representative.backImageUri,
      cardImageUri: cards.imageUri,
    })
    .from(collectionItems)
    .innerJoin(cards, eq(collectionItems.oracleId, cards.oracleId))
    .leftJoin(exact, eq(exact.scryfallId, collectionItems.scryfallId))
    .leftJoin(
      representative,
      and(
        eq(representative.oracleId, collectionItems.oracleId),
        // set_code is stored lowercase on both sides since 0008; lower() here keeps any row
        // written by an older build from silently dropping to tier 3.
        eq(representative.setCode, sql`lower(${collectionItems.setCode})`),
        eq(representative.isRepresentative, true),
      ),
    )
    // sets.code is the primary key, so this is at most 1:1 and multiplies no rows.
    .leftJoin(sets, eq(sets.code, sql`lower(${collectionItems.setCode})`))
    // The user's pick for this card, if any. Oracle-level, so it repeats across the card's rows.
    .leftJoin(
      cardArtPreferences,
      and(
        eq(cardArtPreferences.userId, collectionItems.userId),
        eq(cardArtPreferences.oracleId, collectionItems.oracleId),
      ),
    )
    .where(and(
      eq(collectionItems.userId, userId),
      oracleId === undefined
        ? undefined
        : Array.isArray(oracleId)
          ? inArray(collectionItems.oracleId, oracleId)
          : eq(collectionItems.oracleId, oracleId),
    ));
  return rows;
}

/**
 * Attach the stored bracket facts that are NOT on a card row: mass land denial, extra turns and
 * tutor.
 *
 * `game_changer` is already aggregated — it rides `cards` — so this asks only about
 * mass land denial, extra turns and tutor, which live in `card_bracket_flags`. One query for
 * the whole collection rather than one per card.
 *
 * NULL-SAFE BY OMISSION, in the one direction this is allowed to fail: a card with no
 * row carries none of the three, and a read that comes back empty leaves every card exactly
 * as `aggregateCollection` left it. The surface then draws fewer marks than it might
 * have, which is silence — never a claim that a card is clear.
 *
 * QUIET ON FAILURE, for the same reason and with the same shape as the availability
 * read on this page (`/collection/page.tsx`, "Quiet failure"). A mark is an annotation
 * on a list that is useful without it, so a flags outage costs the marks and must not
 * cost the collection: rejecting here would take the whole route down to hide four
 * glyphs. The cards come back exactly as they went in.
 */
export async function attachBracketFacts(
  cards: BrowseCard[],
  /**
   * The flags read, injected so this is testable without a database. `loadBrowseCards`
   * passes nothing and gets the real one — the seam exists because the alternative is
   * an untested attachment path, and deleting every line here would otherwise leave the
   * suite green while two of the three facts silently vanished from the list.
   */
  read?: (ids: readonly string[]) => Promise<Map<string, CardBracketFlags>>,
): Promise<BrowseCard[]> {
  const loadBracketFlags = read ?? (await import("../bracket/flags-read")).loadBracketFlags;
  const flags = await loadBracketFlags(cards.map((c) => c.oracleId)).catch(() => {
    recordSoftFailure();
    return null;
  });
  if (!flags) return cards;
  if (flags.size === 0) return cards;
  for (const card of cards) {
    // One assembly for every surface (`factsFor`), rather than a second copy of the rule
    // here: the ORDER is part of the contract — gameChanger, massLandDenial, extraTurns, tutor,
    // which is what the key lists and every surface draws — and two implementations of an
    // ordering is how it drifts. `gameChanger` is already on the card from the row query,
    // so it is re-derived from the list rather than re-read.
    const facts = factsFor(card.facts?.includes("gameChanger") ?? false, flags.get(card.oracleId));
    if (facts) card.facts = facts;
  }
  return cards;
}

/**
 * STATE 1 of combo awareness, attached to a PAGE of cards.
 *
 * Modelled on `attachBracketFacts` deliberately, down to the injected read: the alternative is
 * an untested attachment path, where deleting every line here leaves the suite green while the
 * clause silently vanishes from the list.
 *
 * THE WHOLE COLLECTION, in one set-based read — 492ms on staging for 2,805 cards. This surface
 * has no server page to scope to: it ships every card in one payload and windows client-side.
 *
 * A separate pass rather than a join, because the list query is already the largest payload in
 * the app and this touches 65 rows of it on the reference collection.
 *
 * DEGRADES TO SILENCE. A failed read leaves every card without a clause, which is the same
 * thing the absence of a combo looks like, and is the honest outcome — nothing here is load
 * bearing for choosing a card, and a list that refused to draw because Spellbook was
 * unreachable would be worse than one that says less.
 */
export async function attachComboPartners(
  userId: string,
  cards: BrowseCard[],
  read?: (args: {
    userId: string;
    oracleIds?: readonly string[];
  }) => Promise<
    Map<string, { partnerOracleId: string; partnerName: string; otherPartners?: number }>
  >,
): Promise<BrowseCard[]> {
  if (cards.length === 0) return cards;
  const load = read ?? (await import("../combos/near-miss")).loadOwnBothPartners;
  // NO ID WINDOW. `/collection` ships every card in one payload and windows client-side, so
  // there is no server page to scope to and any card can scroll into view — and passing all
  // 2,805 ids is the SLOWER of the two forms, not the faster one (913ms against 492ms on
  // staging, for the same 65 answers).
  const partners = await load({ userId }).catch(() => {
    recordSoftFailure();
    return null;
  });
  if (!partners || partners.size === 0) return cards;
  for (const card of cards) {
    const hit = partners.get(card.oracleId);
    if (hit) {
      card.comboPartner = { oracleId: hit.partnerOracleId, name: hit.partnerName };
      if (hit.otherPartners) card.comboOtherPartners = hit.otherPartners;
    }
  }
  return cards;
}

export const loadBrowseCards = cache(async function loadBrowseCards(
  userId: string,
  /** The price read, injected for tests, as `attachBracketFacts`' flags read is. */
  readPrices?: (oracleIds: readonly string[]) => Promise<Map<string, PrintingPrices>>,
): Promise<{ cards: BrowseListCard[]; pricesFailed: boolean }> {
  const aggregated = aggregateCollection(await selectCollectionRows(userId));
  // STARTED BEFORE THE TWO PASSES AND AWAITED AFTER THEM, keyed on the cards of the snapshot just
  // read rather than on the user: a second read of the collection could see a card this one does
  // not, or miss one it has, and that card would ship silent and be cached so. A failure is
  // reported rather than swallowed, because the page says so (F1) and the list must not be cached.
  const prices = startPriceRead(
    aggregated,
    readPrices ?? (await import("../cards/prices")).loadOwnedPrintingPrices,
  );
  // SEQUENTIAL, and the order is not arbitrary: both passes mutate the same card objects, and
  // running them together would be two concurrent writers to one array for no gain — the combo
  // read is 492ms of database time that does not overlap with the flags read's own round trip
  // in any way this function can express.
  const attached = await attachComboPartners(userId, await attachBracketFacts(aggregated));
  const read = await prices;
  const cards = toListCards(attached);
  attachPrices(attached, cards, read);
  return { cards, pricesFailed: read === null };
});

/**
 * Server query — the `sets` catalog rows for the sets this user owns, for the
 * Set ▾ panel's names and release-date ordering (#86).
 *
 * Same untested-query pattern as above: an inner join over the user's distinct
 * owned set codes, no logic. A code with no `sets` row simply does not come
 * back; buildSetOptions falls the option back to the uppercased code.
 */
export const loadOwnedSetMeta = cache(async function loadOwnedSetMeta(
  userId: string,
): Promise<OwnedSetMeta[]> {
  const { db } = await import("../../db");
  const { collectionItems, sets } = await import("../../db/schema");
  const rows = await db
    .selectDistinct({ code: sets.code, name: sets.name, releasedAt: sets.releasedAt })
    .from(collectionItems)
    // set_code is stored lowercase on both sides since 0008; lower() keeps a row
    // written by an older build from dropping out of the join.
    .innerJoin(sets, eq(sets.code, sql`lower(${collectionItems.setCode})`))
    .where(eq(collectionItems.userId, userId));
  return rows;
});

