// The `/collection` row query, apart from running it (`selectCollectionRows` in `browse-read.ts`
// imports this lazily, so that module stays free of the database schema: `client-imports.test.ts`).
import { and, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cardArtPreferences, cards, collectionItems, printings, sets } from "../../db/schema";

/**
 * The query itself, apart from running it, so a test can read its SQL (`.toSQL()`) without a
 * database. The ids ride as bound parameters (`inArray`), and the reader's own `user_id` predicate
 * is always there, whatever ids are asked: an id the reader does not hold yields no row.
 */
export function collectionRowsQuery(
  db: Pick<typeof import("../../db").db, "select">,
  userId: string,
  oracleId?: string | string[],
) {
  // Two aliases of `printings`: the exact printing owned (tier 1) and the representative
  // printing for that (oracle, set) (tier 2). Both are LEFT joins — a missing row must fall
  // through to the next tier, and resolveImageUri falls through on a null image too.
  const exact = alias(printings, "exact_printing");
  const representative = alias(printings, "representative_printing");
  return db
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
}
