// The Collection's filters applied to the combos view's pairs (Hugh 2026-11-25: with Two-card combos on, every
// filter narrows the pairs and the chip stays pressed).
//
// A card passes when it passes every filter that applies to it; a pair shows when EITHER of its cards passes.
//   - An owned card passes when the list's own `filterCards` kept it (`keptOracleIds`), so a pair and the card
//     list agree on what a filter means.
//   - A card the reader does not own (Own one's missing piece) has no copies, so it is tested on what the catalog
//     gives it, name, colors and type, through the same `filterCards`. Filters about owned copies (sets, availability,
//     the quick facts) do not apply to it, so it fails them and the pair rests on the owned card.
import { filterCards, type BrowseFilters, type BrowseListCard } from "../collection/browse";
import type { CollectionComboPair, ComboPiece } from "./collection-combos";

function missingPasses(piece: ComboPiece, filters: BrowseFilters): boolean {
  if (filters.setCodes.length > 0 || filters.quick || (filters.availability?.length ?? 0) > 0) return false;
  const stub = { name: piece.name, printedName: null, typeLine: piece.typeLine, colorIdentity: piece.colorIdentity, setCounts: [] };
  return filterCards([stub as unknown as BrowseListCard], filters).length > 0;
}

export function narrowCombos(
  pairs: CollectionComboPair[],
  keptOracleIds: ReadonlySet<string>,
  filters: BrowseFilters,
): CollectionComboPair[] {
  const passes = (pair: CollectionComboPair, piece: ComboPiece) =>
    pair.missingId === piece.oracleId ? missingPasses(piece, filters) : keptOracleIds.has(piece.oracleId);
  return pairs.filter((pair) => passes(pair, pair.a) || passes(pair, pair.b));
}
