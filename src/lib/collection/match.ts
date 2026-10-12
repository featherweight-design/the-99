import { isGameCard } from "../cards/game-card";
import type { CollectionRow } from "../manabox/parse";

/**
 * One oracle card. `layout` and `typeLine` ride on every read, detailed or not, because they
 * are what says whether it is a card at all (`isGameCard`): a row that is not one is left out
 * of every index here, so a line naming it reads as unresolved.
 */
export type CatalogCard = {
  oracleId: string;
  scryfallId: string;
  name: string;
  layout: string | null;
  typeLine: string;
};
/**
 * The catalog plus the columns a consumer needs to reason about what it matched —
 * basic-land and commander-candidate checks both read the type line, and the deck
 * import's commander picker renders each candidate's identity label, pips and art.
 * Loaded only on request: oracle_text across the whole catalog is megabytes.
 */
export type DetailedCatalogCard = CatalogCard & {
  oracleText: string | null;
  commanderLegal: boolean;
  colorIdentity: string[];
  imageUri: string | null;
  /** Read with `layout` by the commander-candidate check, which refuses a melded card (#712). */
  manaCost: string | null;
};
/** One row of `printings` — every printing in existence, keyed by its printing-level id. */
export type PrintingIdentity = { scryfallId: string; oracleId: string };
/** A printing whose front bears a name other than its oracle card's — Secret Lair's rename. */
export type FlavorNameIdentity = { flavorName: string; oracleId: string };

export type MatchIndexes = {
  /** `printings` (§3.6). Supersedes the oracle catalog's single arbitrary printing per card. */
  printings?: PrintingIdentity[];
  /** `skipped_printings.scryfall_id` for the token layouts alone — tokens, emblems and art series (§9.1). */
  skippedScryfallIds?: Iterable<string>;
  /**
   * `token_printings`, for the ids the upload carries: which TOKEN each one is (any printing of a
   * token is that token). What is a token is decided by this table, never by a printing's layout:
   * `skippedScryfallIds` also holds emblems and art-series cards, which are not tokens (ruling 4).
   */
  tokenPrintings?: { scryfallId: string; tokenOracleId: string }[];
  /**
   * True only when the token lookup really ran: the rows carried printing ids and this database holds a
   * published token catalog. A paste carries no ids, and a catalog migrated but not yet filled has nothing
   * to look up, and in both an empty `tokenRows` means "not looked", never "looked and found none".
   */
  tokensRead?: boolean;
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
  /**
   * The rows of `skipped` that are tokens, with the token each names. A token row is STILL in
   * `skipped`: it never enters `collection_items`, and the count the review screen quotes keeps its
   * meaning. This is what is kept besides.
   */
  tokenRows: { row: CollectionRow; tokenOracleId: string }[];
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
  //
  // A catalog row that is not a card (a theme front named "Lands", a plane) is in none of the
  // indexes, by id, by name or by flavor name, so every path through here leaves it unmatched.
  const notCards = new Set(catalog.filter((c) => !isGameCard(c)).map((c) => c.oracleId));
  const cards = catalog.filter((c) => !notCards.has(c.oracleId));
  const byScryfallId = new Map(cards.map((c) => [c.scryfallId, c.oracleId]));
  for (const p of indexes.printings ?? []) {
    if (!notCards.has(p.oracleId)) byScryfallId.set(p.scryfallId, p.oracleId);
  }
  const skippedIds = new Set(indexes.skippedScryfallIds ?? []);
  const tokenByPrinting = new Map((indexes.tokenPrintings ?? []).map((t) => [t.scryfallId, t.tokenOracleId]));

  const byName = new Map<string, string>();
  for (const c of cards) {
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
    if (notCards.has(oracleId)) continue;
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
  const tokenRows: MatchResult["tokenRows"] = [];
  const unmatched: CollectionRow[] = [];
  for (const row of rows) {
    const byId = row.scryfallId ? byScryfallId.get(row.scryfallId) : undefined;
    if (byId) { matched.push({ row, oracleId: byId }); continue; }
    // Checked before the name fallback: a known token id is definitively a token, and
    // importing it as a same-named real card would be worse than reporting it skipped.
    // A TOKEN is decided by the token catalog, not by the skipped ledger's layout: a token Scryfall
    // files as a `reversible_card` (`sld/1969`) is in the ledger under a layout the token filter
    // does not read, and is still a token. It stays counted as skipped, and is kept as well.
    const tokenOracleId = row.scryfallId ? tokenByPrinting.get(row.scryfallId) : undefined;
    if (row.scryfallId && tokenOracleId) { skipped.push(row); tokenRows.push({ row, tokenOracleId }); continue; }
    if (row.scryfallId && skippedIds.has(row.scryfallId)) { skipped.push(row); continue; }
    const byNameId = byName.get(normalizeCardName(row.name));
    if (byNameId) matched.push({ row, oracleId: byNameId });
    else unmatched.push(row);
  }
  return { matched, skipped, tokenRows, unmatched };
}
