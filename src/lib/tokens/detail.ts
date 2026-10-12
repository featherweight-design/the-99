import { eq } from "drizzle-orm";
import { db } from "../../db";
import { tokenPrintings, tokens } from "../../db/schema";
import type { BrowseCard } from "../collection/browse";
import { manapoolAddDeckUrl } from "../manapool/links";
import { loadTokenPrices, type TokenPriceFact } from "./price";
import { tokenManapoolLine } from "./price-line";
import { tokenPriceTablesExist, tokenTablesExist } from "./publish";

/**
 * A token's card details (bug batch 2026-10-12, item 5, ruled by the orchestrator as Hugh's proxy):
 * the card modal opens for a token the same way it opens for a card, drawing only what a token has.
 * Art, zoom, name, type line, rules text, set and number, and the price and buy link when Mana Pool
 * lists it. Rarity, identity, owned copies, the in-deck proxy box and Prev/Next are omitted, not drawn
 * empty: the modal reads `kind: "token"` for the first three, and the last two have nothing to draw
 * (a token id is in no deck's card list, and a token opens with no siblings).
 *
 * Reached from `loadCardDetail`, which asks it only for an id the card catalog does not hold, so the
 * press, the prefetch and every re-read take one path.
 */
export async function loadTokenDetail(oracleId: string): Promise<BrowseCard | null> {
  try {
    if (!(await tokenTablesExist())) return null;
    const [token] = await db
      .select({
        oracleId: tokens.oracleId, name: tokens.name, typeLine: tokens.typeLine, colors: tokens.colors,
        oracleText: tokens.oracleText, layout: tokens.layout,
      })
      .from(tokens)
      .where(eq(tokens.oracleId, oracleId));
    if (!token) return null;
    const [printings, priced] = await Promise.all([
      db
        .select({
          scryfallId: tokenPrintings.scryfallId, setCode: tokenPrintings.setCode,
          collectorNumber: tokenPrintings.collectorNumber, imageUri: tokenPrintings.imageUri,
          backImageUri: tokenPrintings.backImageUri,
        })
        .from(tokenPrintings)
        .where(eq(tokenPrintings.tokenOracleId, oracleId)),
      (await tokenPriceTablesExist()) ? loadTokenPrices([oracleId]) : Promise.resolve({ prices: new Map(), newestAsOf: null }),
    ]);
    return assembleTokenDetail(token, printings, priced.prices.get(oracleId) ?? null, priced.newestAsOf);
  } catch (err) {
    console.error("[tokens] loadTokenDetail failed", err instanceof Error ? err.message : err);
    return null;
  }
}

export type TokenDetailRow = {
  oracleId: string;
  name: string;
  typeLine: string;
  colors: string[];
  oracleText: string | null;
  layout: string;
};

export type TokenDetailPrinting = {
  scryfallId: string;
  setCode: string;
  collectorNumber: string;
  imageUri: string | null;
  backImageUri: string | null;
};

/**
 * The pure half. The printing shown is the one a deck's token row pictures (`assembleDeckTokens`):
 * the priced one when Mana Pool lists any, else the first by set and number. Only that printing is
 * listed, so the modal draws no printing picker: a token's other printings are not a choice the app
 * keeps for it.
 */
export function assembleTokenDetail(
  token: TokenDetailRow,
  printings: TokenDetailPrinting[],
  price: TokenPriceFact | null,
  newestAsOf: Date | null,
): BrowseCard {
  const chosen = (price && printings.find((p) => p.scryfallId === price.printing.scryfallId))
    ?? [...printings].sort((a, b) =>
      a.setCode.localeCompare(b.setCode) || a.collectorNumber.localeCompare(b.collectorNumber, "en", { numeric: true })
      || a.scryfallId.localeCompare(b.scryfallId))[0];
  const set = chosen ? chosen.setCode.toUpperCase() : "";
  const shownPrice = price && chosen && price.printing.scryfallId === chosen.scryfallId ? price : null;
  return {
    kind: "token",
    oracleId: token.oracleId,
    name: token.name,
    typeLine: token.typeLine,
    manaCost: null,
    cmc: 0,
    oracleText: token.oracleText,
    keywords: [],
    // Never drawn for a token (`kind`); the type requires one of the four.
    rarity: "common",
    // Feeds the modal's wash while the art loads; a token's colors are its identity's stand-in.
    colorIdentity: token.colors,
    imageUri: chosen?.imageUri ?? null,
    printedName: null,
    layout: token.layout,
    backImageUri: chosen?.backImageUri ?? null,
    quantity: 0,
    availability: null,
    commanderLegal: false,
    hasDecks: false,
    prices: shownPrice
      ? {
        byScryfallId: { [shownPrice.printing.scryfallId]: shownPrice },
        byPrintingKey: {},
        ambiguousKeys: [],
        catalogIds: [shownPrice.printing.scryfallId],
        catalogKeys: [],
        newestAsOf,
      }
      : null,
    // What Mana Pool sells for this price: its own product, placed by the line a token row's link sends.
    tokenBuyUrl: shownPrice ? manapoolAddDeckUrl([tokenManapoolLine(token.name, 1, shownPrice)]) : null,
    printings: chosen
      ? [{
        setCode: set, scryfallId: chosen.scryfallId, setName: null, collectorNumber: chosen.collectorNumber,
        releasedAt: null, quantity: 0, finishes: {}, imageUri: chosen.imageUri, backImageUri: chosen.backImageUri,
        flavorName: null,
      }]
      : [],
    setCodes: set ? [set] : [],
    primarySetCode: set,
    preferredPrinting: null,
  };
}
