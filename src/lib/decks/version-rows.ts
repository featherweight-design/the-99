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
  /** Copies this version's count would have to BUY today, under Shopping's claim model
   *  (seniority, committed decks' claims, proxies): `to` less the copies this deck can call on.
   *  Not `to − ownedNow`: a copy the reader owns can be held by a senior deck, and then this deck
   *  still buys it (Basalt Monolith in HD Tune, staging, 2026-10-03). Always 0 for a basic. */
  buy: number;
  /** The owned printing's art where the reader holds one, the catalog's otherwise. */
  imageUri: string | null;
  /** The owned printing's own name (a Secret Lair's flavor name), or null. */
  printedName: string | null;
  /** Today's price for one copy. Null for a basic, and for a card no feed run has listed. */
  price: PriceFact | null;
};

/**
 * What the claim model says this deck can call on today, per card. Shopping's own figures:
 *
 * - `draft` and `deficit`: a card the deck's current list runs. `loadDeckBuyRows` bills the
 *   deficit against the DRAFT's count, so the copies the deck holds are `draft − deficit`; a
 *   version's own count may differ from the draft's, which is why the deficit is never
 *   subtracted from `to` directly.
 * - `free`: a card the current list no longer runs, off-decklist `loadAvailability`: owned less
 *   what committed decks hold.
 */
export type DeckClaims = {
  draft: Map<string, number>;
  deficit: Map<string, number>;
  free: Map<string, number>;
};

/** The copies this deck can call on for a card, under Shopping's claim model. */
export function heldForDeck(oracleId: string, claims: DeckClaims): number {
  const draft = claims.draft.get(oracleId);
  if (draft !== undefined) return Math.max(0, draft - (claims.deficit.get(oracleId) ?? 0));
  return Math.max(0, claims.free.get(oracleId) ?? 0);
}

export function assembleVersionRows(
  rows: VersionDiffBase[],
  owned: Map<string, OwnedPrinting>,
  { prices }: Pick<PriceRead, "prices">,
  claims: DeckClaims,
): VersionDiffCard[] {
  return rows.map((row) => {
    const copy = owned.get(row.oracleId);
    const basic = isBasicLand(row.typeLine);
    return {
      ...row,
      ownedNow: basic ? Math.max(row.to, copy?.quantity ?? 0) : copy?.quantity ?? 0,
      buy: basic ? 0 : Math.max(0, row.to - heldForDeck(row.oracleId, claims)),
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
