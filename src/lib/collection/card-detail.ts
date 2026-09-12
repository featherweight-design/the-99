// One card's full detail, for surfaces that hold nothing but an oracle id — the decklist,
// the Add panel and the builder spine (#127, #91). loadBrowseCards cannot serve them: it is
// rooted in collection_items, and a deck routinely lists cards the user does not own.

import { cache } from "react";
import type { PrintingPrices } from "../cards/price-lookup";
import type { BrowseCard, BrowsePrinting } from "./browse";
import {
  aggregateCollection,
  coerceRarity,
  comparePrintings,
  resolveImageUri,
  resolvedPrinting,
  selectCollectionRows,
} from "./browse";

/** The `cards` columns the modal reads. */
export type CatalogCardRow = {
  oracleId: string;
  /** The printing `cards.imageUri` was ingested from — see `catalogCard`. */
  scryfallId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  cmc: number;
  oracleText: string | null;
  keywords: string[];
  rarity: string;
  colorIdentity: string[];
  imageUri: string | null;
  layout: string;
  backImageUri: string | null;
};

/** One `printings` row joined to its `sets` row. */
export type CatalogPrintingRow = {
  scryfallId: string;
  setCode: string;
  setName: string | null;
  collectorNumber: string;
  releasedAt: string | null;
  imageUri: string | null;
  flavorName: string | null;
};

/**
 * A BrowseCard for a card nobody owns: every printing the catalog knows, at quantity 0.
 *
 * The empty `finishes` is the honest answer rather than `{nonfoil: 0}` — the picker captions
 * a breakdown only when copies exist, and a zeroed finish would caption one that does not.
 */
export function catalogCard(
  card: CatalogCardRow,
  printingRows: CatalogPrintingRow[],
): BrowseCard {
  const entries = printingRows
    .map((p) => ({
      scryfallId: p.scryfallId,
      printing: {
        setCode: p.setCode.toUpperCase(),
        // This row IS the printing, so its id is never inferred here.
        scryfallId: p.scryfallId,
        setName: p.setName,
        collectorNumber: p.collectorNumber,
        releasedAt: p.releasedAt,
        quantity: 0,
        finishes: {},
        // Same tier order as an owned printing, minus the representative tier: this row IS the
        // exact printing, so tier 2 could only ever repeat it.
        imageUri: resolveImageUri({
          exactImageUri: p.imageUri,
          representativeImageUri: null,
          cardImageUri: card.imageUri,
        }),
        flavorName: p.flavorName,
      } satisfies BrowsePrinting,
    }))
    .sort((a, b) => comparePrintings(a.printing, b.printing));
  const printings: BrowsePrinting[] = entries.map((e) => e.printing);

  const result: BrowseCard = {
    oracleId: card.oracleId,
    name: card.name,
    typeLine: card.typeLine,
    cmc: card.cmc,
    manaCost: card.manaCost,
    oracleText: card.oracleText,
    keywords: card.keywords,
    rarity: coerceRarity(card.rarity),
    colorIdentity: card.colorIdentity,
    imageUri: card.imageUri,
    // Locked decision 2: a card the player does not own keeps its oracle name.
    // There is no printing in hand to print one, and choosing among the
    // catalog's printings would assert a copy they do not have.
    printedName: null,
    layout: card.layout,
    backImageUri: card.backImageUri,
    quantity: 0,
    printings,
    setCodes: [...new Set(printings.map((p) => p.setCode))],
    primarySetCode: "",
    preferredPrinting: null,
  };

  // Art and caption come from the same printing, exactly as aggregateCollection insists.
  // A card whose printings never ingested keeps the oracle-level image and an empty set code.
  //
  // For a card nobody owns there is no preference to honour, so the primary is the printing
  // `cards.imageUri` was ingested from — `cards.scryfallId` names it exactly, and every surface
  // that shows an unowned card off the oracle row (the Consider tile, the suggestion list) is
  // already showing that art. Without this the primary fell out of `comparePrintings`, which
  // sorts by set code alphabetically: the modal opened on a different printing from the tile
  // the user had just tapped. The fallback covers the ~6% of oracle rows whose default printing
  // is not itself in `printings`.
  const primary =
    entries.find((e) => e.scryfallId === card.scryfallId)?.printing ?? resolvedPrinting(result);
  if (primary) {
    result.primarySetCode = primary.setCode;
    result.imageUri = primary.imageUri;
  }
  return result;
}

/**
 * Server query — the owned view of a card when the user has one, else the catalog view.
 * Returns null only when the oracle id is not in `cards` at all.
 *
 * Availability rides along because the modal renders it and every other surface that opens
 * the modal holds only an oracle id: `/collection` joins it onto its own rows, so without
 * this the same card showed its claims there and hid them everywhere else. The vantage is
 * the default one — `free = owned − hard`, card-availability row 1.5 — with no deck
 * excluded, because the modal is off any deck's own decklist even when opened from one.
 *
 * Quiet failure matches `/collection`: a failed read leaves availability null and the modal
 * simply omits the block, rather than losing the card.
 *
 * Untested-query pattern: the SQL is logic-free and the synthesis lives in `catalogCard`,
 * which is covered by tests.
 */
export const loadCardDetail = cache(async function loadCardDetail(
  userId: string,
  oracleId: string,
): Promise<BrowseCard | null> {
  const owned = aggregateCollection(await selectCollectionRows(userId, oracleId));
  // Only for a card the user owns: the availability query is driven by the collection, so
  // an unowned card has no row there and nothing to report.
  if (owned.length > 0) {
    // The import is inside the guard so an unowned card never pays for it, and inside the
    // catch because a module that fails to resolve is as quiet a failure as a query that
    // fails to run — either way the modal omits the block rather than losing the card.
    const availability = await (async () => {
      const { loadAvailability } = await import("../decks/availability-query");
      return (await loadAvailability(userId, { oracleIds: [oracleId] })).get(oracleId) ?? null;
    })().catch(() => null);
    return { ...owned[0], availability, prices: await pricesFor(oracleId) };
  }

  const { db } = await import("../../db");
  const { cards, printings, sets } = await import("../../db/schema");
  const { eq } = await import("drizzle-orm");
  const [card] = await db
    .select({
      oracleId: cards.oracleId,
      scryfallId: cards.scryfallId,
      name: cards.name,
      typeLine: cards.typeLine,
      cmc: cards.cmc,
      manaCost: cards.manaCost,
      oracleText: cards.oracleText,
      keywords: cards.keywords,
      rarity: cards.rarity,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
      layout: cards.layout,
      backImageUri: cards.backImageUri,
    })
    .from(cards)
    .where(eq(cards.oracleId, oracleId));
  if (!card) return null;

  const printingRows = await db
    .select({
      scryfallId: printings.scryfallId,
      setCode: printings.setCode,
      setName: sets.name,
      collectorNumber: printings.collectorNumber,
      releasedAt: sets.releasedAt,
      imageUri: printings.imageUri,
      flavorName: printings.flavorName,
    })
    .from(printings)
    // sets.code is the primary key, so this is at most 1:1 and multiplies no rows.
    .leftJoin(sets, eq(sets.code, printings.setCode))
    .where(eq(printings.oracleId, oracleId));
  return { ...catalogCard(card, printingRows), prices: await pricesFor(oracleId) };
});

/**
 * The card's prices, or null. Swallowed for the same reason the availability read
 * above is: a feed that cannot be reached costs the reader a figure, never the
 * card. Null and "the feed has never carried this printing" are different states
 * and the modal draws both as silence — the distinction matters only in that
 * neither may ever be drawn as a price of nothing.
 */
async function pricesFor(oracleId: string): Promise<PrintingPrices | null> {
  return (async () => {
    const { loadPrintingPrices } = await import("../cards/prices");
    return loadPrintingPrices(oracleId);
  })().catch(() => null);
}
