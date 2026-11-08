/**
 * The commanders an announced Commander set has revealed so far (upcoming precons, E2): the legendary
 * creatures in the FRONT of the set's collector numbers (`leadingBlock`), before MTGJSON lists any of its decks.
 * The Announced group on Precons and the banner draw them.
 *
 * A revealed commander is not matched to a deck (STATES L2): Scryfall says which cards a set holds, never
 * which box each is in, so a set's commanders are one list.
 */
import { eq, inArray } from "drizzle-orm";

import { db } from "../../db";
import { cards, printings } from "../../db/schema";
import { frontFaceTypeLine } from "../recs/faces";

/** One printing in an announced set, as the read gives it. */
export type RevealedPrinting = {
  setCode: string;
  oracleId: string;
  name: string;
  colorIdentity: string[];
  typeLine: string;
  imageUriSmall: string | null;
  /** The printing's normal render: the tile view's art and the hover preview's. */
  imageUri: string | null;
  /** The back face's render, for a double-faced printing; null for one face. */
  backImageUri: string | null;
  collectorNumber: string;
  scryfallId: string;
  /** An art treatment (showcase, extended art, borderless, etched): the printing's `is_variant`. */
  isVariant: boolean;
};

export type RevealedCommander = Omit<RevealedPrinting, "setCode" | "typeLine" | "isVariant">;

type Reader = Pick<typeof db, "select">;

const LEGENDARY = /\bLegendary\b/;
const CREATURE = /\bCreature\b/;

/**
 * A legendary creature, by its FRONT face's type line: `Legendary Enchantment Creature` is one, a legendary
 * artifact is not, and a back face never qualifies a card (Westvale Abbey, `Land // Legendary Creature`, #79).
 */
export const isLegendaryCreature = (typeLine: string) => {
  const front = frontFaceTypeLine(typeLine);
  return LEGENDARY.test(front) && CREATURE.test(front);
};

/**
 * Collector numbers in printed order: by the leading digits as a number, then as strings, so `78` comes before
 * `300` and before `78a`. A number with no leading digit (`★1`) sorts after every one that has one.
 */
export function compareCollectorNumbers(a: string, b: string): number {
  const lead = (s: string) => {
    const m = /^\d+/.exec(s);
    return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
  };
  const na = lead(a);
  const nb = lead(b);
  if (na !== nb) return na < nb ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** More face commanders than this in one block is a block we misread (the biggest precon set holds ten), so none show. */
export const MAX_FACE_COMMANDERS = 12;

/**
 * The printings at the FRONT of a set's collector numbers, where a Commander set prints its precons' commanders
 * (face and alternate art) before the rest of the set: Star Trek Commander holds them at 1 to 8 and a legendary
 * creature again at 9, so "legendary" alone cannot end the block. It runs from the first printing while the printing
 * is of the same kind as that first one: an art-treatment variant if it opens on one (Star Trek, Duskmourn, Tarkir
 * Dragonstorm, Edge of Eternities), else a legendary creature (Final Fantasy, whose face commanders are plain frames).
 * Scryfall names no face commander and MTGJSON lists no deck before release, so this reads the layout, not a fact.
 */
export function leadingBlock(printings: readonly RevealedPrinting[]): RevealedPrinting[] {
  const ordered = [...printings].sort((a, b) => compareCollectorNumbers(a.collectorNumber, b.collectorNumber));
  if (ordered.length === 0) return [];
  const byVariant = ordered[0].isVariant;
  const inBlock = (r: RevealedPrinting) => (byVariant ? r.isVariant : isLegendaryCreature(r.typeLine));
  const end = ordered.findIndex((r) => !inBlock(r));
  return end === -1 ? ordered : ordered.slice(0, end);
}

/**
 * Each set's revealed commanders: the legendary creatures of its leading block, one entry per card (the printing
 * with the LOWEST collector number, so a commander shown again as a borderless or extended-art printing is still
 * one), in collector-number order (call 2, STATES rule 3). A set whose block holds none, or more than
 * `MAX_FACE_COMMANDERS`, shows nothing and says so in the log: better empty than every legend in the set.
 * Known gap: a legendary non-creature face commander (Edge of Eternities' Spacecraft) is left out, as it always was.
 */
export function revealedCommanders(rows: readonly RevealedPrinting[]): Record<string, RevealedCommander[]> {
  const byCode = new Map<string, RevealedPrinting[]>();
  for (const r of rows) byCode.set(r.setCode, [...(byCode.get(r.setCode) ?? []), r]);

  const out: Record<string, RevealedCommander[]> = {};
  for (const [code, printings] of byCode) {
    const cardsIn = new Map<string, RevealedPrinting>();
    for (const r of leadingBlock(printings)) {
      if (!isLegendaryCreature(r.typeLine)) continue;
      const held = cardsIn.get(r.oracleId);
      if (!held || compareCollectorNumbers(r.collectorNumber, held.collectorNumber) < 0) cardsIn.set(r.oracleId, r);
    }
    if (cardsIn.size === 0) continue;
    if (cardsIn.size > MAX_FACE_COMMANDERS) {
      console.warn(`revealedCommanders: ${code} has ${cardsIn.size} legendary creatures in its leading block (over ${MAX_FACE_COMMANDERS}); showing none`);
      continue;
    }
    out[code] = [...cardsIn.values()]
      .sort((a, b) => compareCollectorNumbers(a.collectorNumber, b.collectorNumber) || (a.oracleId < b.oracleId ? -1 : 1))
      .map(({ oracleId, name, colorIdentity, imageUriSmall, imageUri, backImageUri, collectorNumber, scryfallId }) => ({
        oracleId, name, colorIdentity, imageUriSmall, imageUri, backImageUri, collectorNumber, scryfallId,
      }));
  }
  return out;
}

/** The read, apart so a test can render its SQL. `codes` are `sets.code`s, lowercase as `printings.set_code` is. */
export function revealedPrintingsQuery(codes: readonly string[], q: Reader = db) {
  return q
    .select({
      setCode: printings.setCode,
      oracleId: printings.oracleId,
      name: cards.name,
      colorIdentity: cards.colorIdentity,
      typeLine: cards.typeLine,
      imageUriSmall: printings.imageUriSmall,
      imageUri: printings.imageUri,
      backImageUri: printings.backImageUri,
      collectorNumber: printings.collectorNumber,
      scryfallId: printings.scryfallId,
      isVariant: printings.isVariant,
    })
    .from(printings)
    .innerJoin(cards, eq(cards.oracleId, printings.oracleId))
    .where(inArray(printings.setCode, [...codes]));
}

/** The revealed commanders of each set in `codes`, by set code. A set with none has no key. */
export async function loadRevealedCommanders(codes: readonly string[], q: Reader = db): Promise<Record<string, RevealedCommander[]>> {
  if (codes.length === 0) return {};
  const rows = await revealedPrintingsQuery(codes, q);
  return revealedCommanders(rows.map((r) => ({
    setCode: r.setCode,
    oracleId: r.oracleId,
    name: r.name,
    colorIdentity: r.colorIdentity,
    typeLine: r.typeLine,
    imageUriSmall: r.imageUriSmall ?? r.imageUri,
    imageUri: r.imageUri ?? r.imageUriSmall,
    backImageUri: r.backImageUri,
    collectorNumber: r.collectorNumber,
    scryfallId: r.scryfallId,
    isVariant: r.isVariant,
  })));
}
