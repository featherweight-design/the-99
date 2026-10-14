import { eq } from "drizzle-orm";
import { db } from "../../db";
import { tokenPrintings, tokens } from "../../db/schema";
import type { BrowseCard } from "../collection/browse";
import { deckTokensEnabled } from "../decks/tokens-flag";
import { loadHeldTokenPrintings, orderHeld, type HeldTokenPrinting } from "./deck-printings";
import { manapoolAddDeckUrl } from "../manapool/links";
import { loadTokenPrices, type TokenPriceFact } from "./price";
import { tokenManapoolLine } from "./price-line";

/**
 * A token's card details (bug batch 2026-10-12, item 5, ruled by the orchestrator as Hugh's proxy):
 * the card modal opens for a token the same way it opens for a card, drawing only what a token has.
 * Art, zoom, name, type line, rules text, set and number, and the price and buy link when Mana Pool
 * lists it. Rarity, identity, owned copies and the in-deck proxy box are omitted, not drawn
 * empty: the modal reads `kind: "token"` for the first three, and the last has nothing to draw
 * (a token id is in no deck's card list). Prev/Next pages through the deck's tokens when a token is
 * opened from the Tokens group, which hands the modal that list as its siblings (`TokensGroup`); a
 * token opened with no list has none.
 *
 * Reached from `loadCardDetail`, which asks it only for an id the card catalog does not hold, so the
 * press, the prefetch and every re-read take one path.
 */
export async function loadTokenDetail(oracleId: string, userId: string, env: NodeJS.ProcessEnv): Promise<BrowseCard | null> {
  // No schema probe first: every open and every prefetch would pay it as extra round trips ahead
  // of the read. A database the token migration has not reached throws on the read itself, which
  // the catches below turn into no token (and, for the price table alone, no price).
  try {
    const [token] = await db
      .select({
        oracleId: tokens.oracleId, name: tokens.name, typeLine: tokens.typeLine, colors: tokens.colors,
        oracleText: tokens.oracleText, layout: tokens.layout,
      })
      .from(tokens)
      .where(eq(tokens.oracleId, oracleId));
    if (!token) return null;
    // Each read fails on its own, as the card's side reads do: a failed printing read costs the art
    // and the set line, a failed price read costs the price and the link, and neither costs the token.
    const [printings, priced, held] = await Promise.all([
      db
        .select({
          scryfallId: tokenPrintings.scryfallId, setCode: tokenPrintings.setCode,
          collectorNumber: tokenPrintings.collectorNumber, imageUri: tokenPrintings.imageUri,
          backImageUri: tokenPrintings.backImageUri,
        })
        .from(tokenPrintings)
        .where(eq(tokenPrintings.tokenOracleId, oracleId))
        .catch((err: unknown) => {
          console.error("[tokens] token detail printings failed", err instanceof Error ? err.message : err);
          return [] as TokenDetailPrinting[];
        }),
      loadTokenPrices([oracleId])
        .catch((err: unknown) => {
          console.error("[tokens] token detail price failed", err instanceof Error ? err.message : err);
          return { prices: new Map<string, TokenPriceFact>(), newestAsOf: null };
        }),
      // The printings the player holds, which a deck's picker chooses between (token printings TP2), behind the
      // deck tokens switch. A failed read costs the list, never the token: the sheet shows the catalog's one.
      deckTokensEnabled(env)
        ? loadHeldTokenPrintings(userId, [oracleId])
          .then((m) => m.get(oracleId) ?? [])
          .catch((err: unknown) => {
            console.error("[tokens] token detail holdings failed", err instanceof Error ? err.message : err);
            return [] as HeldTokenPrinting[];
          })
        : Promise.resolve([] as HeldTokenPrinting[]),
    ]);
    return assembleTokenDetail(token, printings, priced.prices.get(oracleId) ?? null, priced.newestAsOf, held);
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
 * The pure half. The printing shown is the one a deck's token row pictures with no pick of its own
 * (`assembleDeckTokens`, `chooseTokenPrinting`): the player's most-held printing with art, else the catalog's
 * (the priced one when Mana Pool lists any, else the first by set and number), else a held one with no art.
 *
 * When the player holds printings of the token (`held`, token printings TP2), those are listed, most copies
 * first, each with its count: the choice a deck's picker offers, and only from a deck (the modal draws no
 * picker for a token without the deck's `save`), followed by the shown printing at no copies when it is not one
of them. Otherwise only the shown printing is listed, at no copies,
 * and the modal draws no picker: a printing the player does not hold is not a choice the app keeps.
 */
export function assembleTokenDetail(
  token: TokenDetailRow,
  printings: TokenDetailPrinting[],
  price: TokenPriceFact | null,
  newestAsOf: Date | null,
  held: readonly HeldTokenPrinting[] = [],
): BrowseCard {
  const byId = new Map(printings.map((p) => [p.scryfallId, p]));
  // One row per set and number, the key the picker's tiles carry: sibling variants sharing one would otherwise
  // draw two tiles under one key. The most-held of them WITH ART stands for the pair, else the most-held
  // (`heldPrintingByNumber` writes that same printing), with the pair's copies summed.
  const heldRows: { p: TokenDetailPrinting; quantity: number }[] = [];
  const byPair = new Map<string, { p: TokenDetailPrinting; quantity: number }>();
  for (const h of orderHeld(held)) {
    const p = byId.get(h.tokenPrintingId);
    if (!p) continue;
    const pair = `${p.setCode.toLowerCase()}|${p.collectorNumber}`;
    const at = byPair.get(pair);
    if (at) {
      at.quantity += h.quantity;
      if (at.p.imageUri === null && p.imageUri !== null) at.p = p;
      continue;
    }
    const row = { p, quantity: h.quantity };
    byPair.set(pair, row);
    heldRows.push(row);
  }
  const catalog = (price && printings.find((p) => p.scryfallId === price.printing.scryfallId))
    ?? [...printings].sort((a, b) =>
      a.setCode.localeCompare(b.setCode) || a.collectorNumber.localeCompare(b.collectorNumber, "en", { numeric: true })
      || a.scryfallId.localeCompare(b.scryfallId))[0];
  // `chooseTokenPrinting`'s order: a held printing with art, else the catalog's, else a held one with none.
  const chosen = heldRows.find((h) => h.p.imageUri !== null)?.p
    ?? catalog
    ?? heldRows[0]?.p
    // The printings read failed and the price read did not: the price names its own printing, so the
    // price, the set line and the link survive with no art.
    ?? (price
      ? { scryfallId: price.printing.scryfallId, setCode: price.printing.setCode, collectorNumber: price.printing.collectorNumber, imageUri: null, backImageUri: null }
      : undefined);
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
    // The held rows, and after them the shown printing at no copies when it is not one of them (no held
    // printing has art): the modal's resolver then finds the same art, and its picker still lists only the
    // held rows (it offers the printings with copies).
    printings: [
      ...heldRows.map((h) => tokenPrinting(h.p, h.quantity)),
      ...(chosen && !heldRows.some((h) => h.p.scryfallId === chosen.scryfallId) ? [tokenPrinting(chosen, 0)] : []),
    ],
    setCodes: heldRows.length > 0 ? [...new Set(heldRows.map((h) => h.p.setCode.toUpperCase()))] : set ? [set] : [],
    primarySetCode: set,
    preferredPrinting: null,
  };
}

function tokenPrinting(p: TokenDetailPrinting, quantity: number): BrowseCard["printings"][number] {
  return {
    setCode: p.setCode.toUpperCase(), scryfallId: p.scryfallId, setName: null, collectorNumber: p.collectorNumber,
    releasedAt: null, quantity, finishes: {}, imageUri: p.imageUri, backImageUri: p.backImageUri,
    flavorName: null,
    // The back is this printing's own (a double-faced or reversible token), so the modal's turn
    // and its zoom can show it; the token layouts are not two-faced by layout alone.
    hasOwnBack: Boolean(p.backImageUri),
  };
}
