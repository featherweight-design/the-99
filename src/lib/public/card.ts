import { asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderSupport, printings } from "../../db/schema";
import { loadBracketFlags, NO_BRACKET_FLAGS, type CardBracketFlags } from "../bracket/flags-read";
import { frontFaceName, frontFaceTypeLine } from "../recs/faces";
import { resolvePublicSlug } from "./resolve";
import { publicSlug } from "./slug";

/**
 * The public card page's data (launch epic F3 groundwork). CATALOG ONLY: `cards`, `printings` and `card_bracket_flags`, nothing
 * about a person, no request API, no clock. The same address gives the same data to every visitor, which is what lets a page
 * be cached once for all of them. `check:public-reads` holds that. NOT WIRED to any route yet; the pages wait for Design's F2
 * handoff. Prices are deliberately absent (decided 2026-10-18).
 */
export type PublicPrinting = { scryfallId: string; setCode: string; collectorNumber: string; imageUriSmall: string | null };

export type PublicCard = {
  oracleId: string;
  name: string;
  slug: string;
  manaCost: string | null;
  cmc: number;
  colorIdentity: string[];
  typeLine: string;
  oracleText: string | null;
  keywords: string[];
  /** A yes or no; the catalog does not say why a card is not legal. */
  commanderLegal: boolean;
  rarity: string;
  gameChanger: boolean;
  imageUri: string | null;
  /**
   * The printing the card's image is drawn from (`cards.scryfall_id`; on staging every card whose printing row exists
   * shares its image). `is_representative` is NOT that: it marks many printings of one card and names a different one
   * than the image for about half the catalog.
   */
  scryfallId: string;
  artCropUri: string | null;
  /** Null for every layout with one face or one image. The catalog holds no separate back-face text. */
  backImageUri: string | null;
  layout: string;
  /** The names and type lines split on ` // `, front first. One entry for a one-faced card. */
  faces: { name: string; typeLine: string }[];
  bracket: CardBracketFlags;
  printings: PublicPrinting[];
  /** The card has more printings than `PRINTINGS_LIMIT`: the chips are the first of them, not all. */
  printingsCapped: boolean;
  /**
   * The card's public commander page, or null when it has none: the address `loadPublicCommander` answers, which is
   * exactly a card with a `commander_support` row (any state). The card page links to it only when it is set.
   */
  commanderSlug: string | null;
};

export type PublicCardResult =
  | { kind: "ok"; card: PublicCard; canonicalSlug: string }
  | { kind: "not-found" }
  | { kind: "ambiguous" };

export const PRINTINGS_LIMIT = 40;

/**
 * Exported so the emitted SQL can be asserted without a database. The card's own printing (the one its image is drawn
 * from) comes FIRST, so it is never cut by the limit and the page can mark it; then by set and number, the order the
 * boards draw (A2, A3). The number orders by its leading digits as a number (`9` before `10`), then as written (`114` before
 * `114s`). One row past the limit is read: see `printingsCapped`.
 */
export function printingsQuery(oracleId: string, pictured: string) {
  return db.select({
    scryfallId: printings.scryfallId, setCode: printings.setCode, collectorNumber: printings.collectorNumber,
    imageUriSmall: printings.imageUriSmall,
  }).from(printings).where(eq(printings.oracleId, oracleId))
    .orderBy(
      sql`${printings.scryfallId} = ${pictured} desc`, asc(printings.setCode),
      sql`nullif(regexp_replace(${printings.collectorNumber}, '[^0-9].*$', ''), '')::int nulls last`, asc(printings.collectorNumber),
    )
    .limit(PRINTINGS_LIMIT + 1);
}

/** Whether the card has a commander page: one indexed lookup on `commander_support`'s key, nothing read from the row. */
export function commanderPageQuery(oracleId: string) {
  return db.select({ oracleId: commanderSupport.commanderOracleId }).from(commanderSupport)
    .where(eq(commanderSupport.commanderOracleId, oracleId)).limit(1);
}

export function splitFaces(name: string, typeLine: string): { name: string; typeLine: string }[] {
  const names = name.split(" // ");
  const types = typeLine.split(" // ");
  if (names.length === 1) return [{ name: frontFaceName(name), typeLine: frontFaceTypeLine(typeLine) }];
  return names.map((n, i) => ({ name: n, typeLine: types[i] ?? types[0] }));
}

export async function loadPublicCard(slug: string): Promise<PublicCardResult> {
  const hit = await resolvePublicSlug(slug);
  if (hit.kind !== "ok") return hit;
  const [row] = await db.select().from(cards).where(eq(cards.oracleId, hit.oracleId));
  if (!row) return { kind: "not-found" };
  const [flags, rows, commander] = await Promise.all([
    loadBracketFlags([row.oracleId]), printingsQuery(row.oracleId, row.scryfallId), commanderPageQuery(row.oracleId),
  ]);
  const canonical = publicSlug(row.name, row.oracleId);
  const card: PublicCard = {
    oracleId: row.oracleId, name: row.name, slug: canonical,
    manaCost: row.manaCost, cmc: row.cmc, colorIdentity: row.colorIdentity, typeLine: row.typeLine,
    oracleText: row.oracleText, keywords: row.keywords, commanderLegal: row.commanderLegal, rarity: row.rarity,
    gameChanger: row.gameChanger, imageUri: row.imageUri, scryfallId: row.scryfallId, artCropUri: row.artCropUri, backImageUri: row.backImageUri,
    layout: row.layout, faces: splitFaces(row.name, row.typeLine),
    bracket: flags.get(row.oracleId) ?? NO_BRACKET_FLAGS,
    // One row past the limit is read so a card with exactly the limit is not called capped.
    printings: rows.slice(0, PRINTINGS_LIMIT), printingsCapped: rows.length > PRINTINGS_LIMIT,
    commanderSlug: commander.length > 0 ? canonical : null,
  };
  return { kind: "ok", card, canonicalSlug: card.slug };
}
