/**
 * The commanders an announced Commander set has revealed so far (upcoming precons, E2): the legendary
 * creatures Scryfall already lists in that set, before MTGJSON lists any of its decks. No caller yet but its
 * tests and `pnpm probe:upcoming-precons`; the Announced group on Precons draws them (plan PR 2).
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
  collectorNumber: string;
};

export type RevealedCommander = Omit<RevealedPrinting, "setCode" | "typeLine">;

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

/**
 * Each set's revealed commanders: legendary creatures only, one entry per card (the printing with the LOWEST
 * collector number, so a commander shown again as a borderless or extended-art printing is still one), in
 * collector-number order (call 2, STATES rule 3).
 */
export function revealedCommanders(rows: readonly RevealedPrinting[]): Record<string, RevealedCommander[]> {
  const bySet = new Map<string, Map<string, RevealedPrinting>>();
  for (const r of rows) {
    if (!isLegendaryCreature(r.typeLine)) continue;
    let cardsIn = bySet.get(r.setCode);
    if (!cardsIn) bySet.set(r.setCode, (cardsIn = new Map()));
    const held = cardsIn.get(r.oracleId);
    if (!held || compareCollectorNumbers(r.collectorNumber, held.collectorNumber) < 0) cardsIn.set(r.oracleId, r);
  }
  const out: Record<string, RevealedCommander[]> = {};
  for (const [code, cardsIn] of bySet) {
    out[code] = [...cardsIn.values()]
      .sort((a, b) => compareCollectorNumbers(a.collectorNumber, b.collectorNumber) || (a.oracleId < b.oracleId ? -1 : 1))
      .map(({ oracleId, name, colorIdentity, imageUriSmall, collectorNumber }) => ({
        oracleId, name, colorIdentity, imageUriSmall, collectorNumber,
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
      collectorNumber: printings.collectorNumber,
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
    collectorNumber: r.collectorNumber,
  })));
}
