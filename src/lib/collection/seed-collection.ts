import { readFileSync } from "node:fs";
import { parseCollectionCsv } from "../manabox/parse";
import { matchRows, type CatalogCard, type MatchIndexes } from "./match";
import { aggregatePendingItems, totalQuantity, type PendingItem } from "./pending";

export type SeedCollectionCounts = {
  /** Cards written (summed quantities), i.e. the review screen's "matched" number. */
  imported: number;
  /** Distinct holdings written — one row per primary key. */
  holdings: number;
  /** Tokens and emblems: excluded from the catalog by design, not import failures (§9.1). */
  skipped: number;
  /** Rows that reached neither the catalog nor the skipped ledger. */
  unmatched: number;
  parseErrors: number;
  rowsRead: number;
};

export type SeedCollectionResult = SeedCollectionCounts & { items: PendingItem[] };

/**
 * Everything the import needs from the database, so the pipeline can be exercised offline.
 * Production supplies these from `cards`, `printings` and `skipped_printings`.
 */
export type SeedCollectionSource = {
  catalog: CatalogCard[];
  indexes: MatchIndexes;
};

/**
 * Parse → match → aggregate for a ManaBox-shaped CSV.
 *
 * Deliberately the same functions the server action calls rather than a second implementation:
 * a reimplementation would drift from `previewUpload` and stop being a test of it.
 */
export function planCollectionSeed(
  csvText: string,
  source: SeedCollectionSource,
): SeedCollectionResult {
  const { rows, errors } = parseCollectionCsv(csvText);
  const { matched, skipped, unmatched } = matchRows(rows, source.catalog, source.indexes);
  const items = aggregatePendingItems(matched);
  return {
    items,
    imported: totalQuantity(items),
    holdings: items.length,
    skipped: skipped.length,
    unmatched: unmatched.length,
    parseErrors: errors.length,
    rowsRead: rows.length + errors.length,
  };
}

export function readCsv(path: string): string {
  return readFileSync(path, "utf8");
}
