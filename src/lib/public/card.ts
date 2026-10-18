import { asc, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { cards, printings } from "../../db/schema";
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
  artCropUri: string | null;
  /** Null for every layout with one face or one image. The catalog holds no separate back-face text. */
  backImageUri: string | null;
  layout: string;
  /** The names and type lines split on ` // `, front first. One entry for a one-faced card. */
  faces: { name: string; typeLine: string }[];
  bracket: CardBracketFlags;
  printings: PublicPrinting[];
};

export type PublicCardResult =
  | { kind: "ok"; card: PublicCard; canonicalSlug: string }
  | { kind: "not-found" }
  | { kind: "ambiguous" };

export const PRINTINGS_LIMIT = 40;

/** Exported so the emitted SQL can be asserted without a database. */
export function printingsQuery(oracleId: string) {
  return db.select({
    scryfallId: printings.scryfallId, setCode: printings.setCode, collectorNumber: printings.collectorNumber,
    imageUriSmall: printings.imageUriSmall,
  }).from(printings).where(eq(printings.oracleId, oracleId))
    .orderBy(desc(printings.isRepresentative), asc(printings.setCode), asc(printings.collectorNumber)).limit(PRINTINGS_LIMIT);
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
  const [flags, rows] = await Promise.all([loadBracketFlags([row.oracleId]), printingsQuery(row.oracleId)]);
  const card: PublicCard = {
    oracleId: row.oracleId, name: row.name, slug: publicSlug(row.name, row.oracleId),
    manaCost: row.manaCost, cmc: row.cmc, colorIdentity: row.colorIdentity, typeLine: row.typeLine,
    oracleText: row.oracleText, keywords: row.keywords, commanderLegal: row.commanderLegal, rarity: row.rarity,
    gameChanger: row.gameChanger, imageUri: row.imageUri, artCropUri: row.artCropUri, backImageUri: row.backImageUri,
    layout: row.layout, faces: splitFaces(row.name, row.typeLine),
    bracket: flags.get(row.oracleId) ?? NO_BRACKET_FLAGS, printings: rows,
  };
  return { kind: "ok", card, canonicalSlug: card.slug };
}
