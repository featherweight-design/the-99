// The today half of a version's diff rows: what the reader owns now and what a copy costs now.
//
// Pure, so its rules are tested without a database. `loadVersionDiff` makes the three reads
// (the diff, the reader's owned copies, the prices) and hands their results here.
import type { OwnedPrinting } from "../collection/owned-printings";
import { isBasicLand } from "./grouping";
import type { PriceFact } from "./price";
import type { PriceRead } from "./price-query";

/** A diff row as the version snapshot describes it, before today's figures. */
export type VersionDiffBase = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  /** Read for the printed name: a two-faced card's flavor name is cut to its front face. */
  layout: string;
  /** The catalog's oracle-level image, used when the reader owns no copy. */
  imageUri: string | null;
  from: number;
  to: number;
};

export type VersionDiffCard = Omit<VersionDiffBase, "imageUri"> & {
  /** Copies the reader owns TODAY across every printing. A basic reads `to`: basics are
   *  never bought, and every surface treats them as owned. */
  ownedNow: number;
  /** Copies this deck has to BUY, as Shopping bills them: `loadDeckBuyRows`' deficit for this
   *  deck, from the claim model (seniority, committed decks' claims, proxies). Not `to − ownedNow`:
   *  a copy the reader owns can be held by a senior deck, and then this deck still buys it
   *  (Basalt Monolith in HD Tune, staging, 2026-10-03). 0 for a card the deck's current list does
   *  not run, which Shopping does not bill either, and always 0 for a basic. */
  buy: number;
  /** The owned printing's art where the reader holds one, the catalog's otherwise. */
  imageUri: string | null;
  /** The owned printing's own name (a Secret Lair's flavor name), or null. */
  printedName: string | null;
  /** Today's price for one copy. Null for a basic, and for a card no feed run has listed. */
  price: PriceFact | null;
};

export function assembleVersionRows(
  rows: VersionDiffBase[],
  owned: Map<string, OwnedPrinting>,
  { prices }: Pick<PriceRead, "prices">,
  buy: Map<string, number>,
): VersionDiffCard[] {
  return rows.map((row) => {
    const copy = owned.get(row.oracleId);
    const basic = isBasicLand(row.typeLine);
    return {
      ...row,
      ownedNow: basic ? Math.max(row.to, copy?.quantity ?? 0) : copy?.quantity ?? 0,
      buy: basic ? 0 : buy.get(row.oracleId) ?? 0,
      imageUri: copy?.imageUri ?? row.imageUri,
      printedName: copy?.printedName ?? null,
      price: basic ? null : prices.get(row.oracleId) ?? null,
    };
  });
}

/** The oracle ids worth a price read: basics are never priced. */
export function pricedIds(rows: VersionDiffBase[]): string[] {
  return [...new Set(rows.filter((r) => !isBasicLand(r.typeLine)).map((r) => r.oracleId))];
}
