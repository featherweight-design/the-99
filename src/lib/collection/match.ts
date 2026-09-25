import type { CollectionRow } from "../manabox/parse";

export type CatalogCard = { oracleId: string; scryfallId: string; name: string };
/**
 * The catalog plus the columns a consumer needs to reason about what it matched —
 * basic-land and commander-candidate checks both read the type line, and the deck
 * import's commander picker renders each candidate's identity label, pips and art.
 * Loaded only on request: oracle_text across the whole catalog is megabytes.
 */
export type DetailedCatalogCard = CatalogCard & {
  typeLine: string;
  oracleText: string | null;
  commanderLegal: boolean;
  colorIdentity: string[];
  imageUri: string | null;
  /** Both read by the commander-candidate check, which refuses a melded card (#712). */
  layout: string | null;
  manaCost: string | null;
};
/** One row of `printings` — every printing in existence, keyed by its printing-level id. */
export type PrintingIdentity = { scryfallId: string; oracleId: string };
/** A printing whose front bears a name other than its oracle card's — Secret Lair's rename. */
export type FlavorNameIdentity = { flavorName: string; oracleId: string };

export type MatchIndexes = {
  /** `printings` (§3.6). Supersedes the oracle catalog's single arbitrary printing per card. */
  printings?: PrintingIdentity[];
  /** `skipped_printings.scryfall_id` — tokens, emblems and art series (§9.1). */
  skippedScryfallIds?: Iterable<string>;
  /**
   * `printings.flavor_name`, one entry per printing carrying one (#467). Every printing of a
   * renamed card repeats the same flavor name, so repeats are expected; only two entries
   * disagreeing about the oracle id are an ambiguity.
   */
  flavorNames?: FlavorNameIdentity[];
};

export type MatchResult = {
  matched: { row: CollectionRow; oracleId: string }[];
  /** Rows excluded from the catalog by design — tokens and emblems, not import failures. */
  skipped: CollectionRow[];
  unmatched: CollectionRow[];
};

/**
 * Scryfall joins the faces of every multi-faced card with ` // ` — split cards, adventures,
 * transforming and modal double-faced cards alike — but Moxfield, Archidekt and hand-typed
 * pastes all use a bare `/`, with or without spaces. Normalising both the
 * index key and the incoming name to one spelling is what keeps those rows out of
 * `unmatched` — and doing both sides keeps the match symmetric whatever the source.
 */
export function normalizeCardName(name: string): string {
  return name.toLowerCase().replace(/\s*\/+\s*/g, " // ").trim();
}

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
    const lower = normalizeCardName(c.name);
    byName.set(lower, c.oracleId);
    const front = lower.split(" // ")[0];
    if (!byName.has(front)) byName.set(front, c.oracleId);
  }

  // Flavor names are indexed after every oracle name, and never over one: a player holding
  // the card whose real name is the key must get that card. A flavor name two oracle cards
  // both claim is dropped rather than guessed — being asked to resolve the line is a smaller
  // failure than silently importing a card the player does not own.
  const flavorCandidates = new Map<string, string | null>();
  for (const { flavorName, oracleId } of indexes.flavorNames ?? []) {
    const lower = normalizeCardName(flavorName);
    for (const key of [lower, lower.split(" // ")[0]]) {
      const seen = flavorCandidates.get(key);
      if (seen === undefined) flavorCandidates.set(key, oracleId);
      else if (seen !== oracleId) flavorCandidates.set(key, null);
    }
  }
  for (const [key, oracleId] of flavorCandidates) {
    if (oracleId && !byName.has(key)) byName.set(key, oracleId);
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
    const byNameId = byName.get(normalizeCardName(row.name));
    if (byNameId) matched.push({ row, oracleId: byNameId });
    else unmatched.push(row);
  }
  return { matched, skipped, unmatched };
}
