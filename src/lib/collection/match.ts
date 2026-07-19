import type { CollectionRow } from "../manabox/parse";

export type CatalogCard = { oracleId: string; scryfallId: string; name: string };
export type MatchResult = {
  matched: { row: CollectionRow; oracleId: string }[];
  unmatched: CollectionRow[];
};

export function matchRows(rows: CollectionRow[], catalog: CatalogCard[]): MatchResult {
  // Name matching is the primary path for v1: the catalog is seeded from
  // Scryfall oracle-cards (one arbitrary printing per oracle id), while
  // export "Scryfall ID" values are printing-level ids — the id map only
  // hits when the collection happens to contain that exact printing.
  const byScryfallId = new Map(catalog.map((c) => [c.scryfallId, c.oracleId]));
  const byName = new Map<string, string>();
  for (const c of catalog) {
    const lower = c.name.toLowerCase();
    byName.set(lower, c.oracleId);
    const front = lower.split(" // ")[0];
    if (!byName.has(front)) byName.set(front, c.oracleId);
  }

  const matched: MatchResult["matched"] = [];
  const unmatched: CollectionRow[] = [];
  for (const row of rows) {
    const oracleId =
      (row.scryfallId && byScryfallId.get(row.scryfallId)) ??
      byName.get(row.name.toLowerCase());
    if (oracleId) matched.push({ row, oracleId });
    else unmatched.push(row);
  }
  return { matched, unmatched };
}
