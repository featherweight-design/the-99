import type { CollectionRow } from "../manabox/parse";

export type CatalogCard = { oracleId: string; scryfallId: string; name: string };
/**
 * The catalog plus the two columns a consumer needs to reason about what it
 * matched — basic-land and commander-candidate checks both read the type line.
 * Loaded only on request: oracle_text across the whole catalog is megabytes.
 */
export type DetailedCatalogCard = CatalogCard & {
  typeLine: string;
  oracleText: string | null;
  commanderLegal: boolean;
};
/** One row of `printings` — every printing in existence, keyed by its printing-level id. */
export type PrintingIdentity = { scryfallId: string; oracleId: string };

export type MatchIndexes = {
  /** `printings` (§3.6). Supersedes the oracle catalog's single arbitrary printing per card. */
  printings?: PrintingIdentity[];
  /** `skipped_printings.scryfall_id` — tokens, emblems and art series (§9.1). */
  skippedScryfallIds?: Iterable<string>;
};

export type MatchResult = {
  matched: { row: CollectionRow; oracleId: string }[];
  /** Rows excluded from the catalog by design — tokens and emblems, not import failures. */
  skipped: CollectionRow[];
  unmatched: CollectionRow[];
};

export function matchRows(
  rows: CollectionRow[],
  catalog: CatalogCard[],
  indexes: MatchIndexes = {},
): MatchResult {
  // The `printings` table is the primary path: it holds every printing in existence, so a
  // ManaBox export's printing-level Scryfall ID resolves exactly. The oracle catalog's own
  // scryfall_id is kept underneath it as a fallback for when printings has not been seeded,
  // and name matching backs up both (Moxfield/Archidekt/paste carry no id at all).
  const byScryfallId = new Map(catalog.map((c) => [c.scryfallId, c.oracleId]));
  for (const p of indexes.printings ?? []) byScryfallId.set(p.scryfallId, p.oracleId);
  const skippedIds = new Set(indexes.skippedScryfallIds ?? []);

  const byName = new Map<string, string>();
  for (const c of catalog) {
    const lower = c.name.toLowerCase();
    byName.set(lower, c.oracleId);
    const front = lower.split(" // ")[0];
    if (!byName.has(front)) byName.set(front, c.oracleId);
  }

  const matched: MatchResult["matched"] = [];
  const skipped: CollectionRow[] = [];
  const unmatched: CollectionRow[] = [];
  for (const row of rows) {
    const byId = row.scryfallId ? byScryfallId.get(row.scryfallId) : undefined;
    if (byId) { matched.push({ row, oracleId: byId }); continue; }
    // Checked before the name fallback: a known token id is definitively a token, and
    // importing it as a same-named real card would be worse than reporting it skipped.
    if (row.scryfallId && skippedIds.has(row.scryfallId)) { skipped.push(row); continue; }
    const byNameId = byName.get(row.name.toLowerCase());
    if (byNameId) matched.push({ row, oracleId: byNameId });
    else unmatched.push(row);
  }
  return { matched, skipped, unmatched };
}
