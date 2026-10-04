import type { ResolvedCard } from "./validate";

/**
 * The `resolveName` a run hands the validator, built from one catalog read. Pure.
 *
 * NAMES ARE NOT UNIQUE in the catalog, so a map from name to the last row read would validate a
 * duplicate-name add under whichever oracle id the database happened to return, and drop a
 * duplicate-name cut as not in the deck. So a name resolves to the card THIS DECK holds under it
 * when there is exactly one such card, which is what a cut names; otherwise to the one catalog
 * card carrying it; and to nothing when that is still ambiguous, which the validator drops as a
 * card that does not exist rather than guessing.
 */
export function nameResolver(
  rows: readonly (ResolvedCard & { name: string })[],
  deckOracleIds: ReadonlySet<string>,
): (name: string) => ResolvedCard | null {
  const byName = new Map<string, (ResolvedCard & { name: string })[]>();
  for (const row of rows) byName.set(row.name, [...(byName.get(row.name) ?? []), row]);
  return (name) => {
    const candidates = byName.get(name) ?? [];
    const held = candidates.filter((c) => deckOracleIds.has(c.oracleId));
    const pick = held.length === 1 ? held[0] : held.length === 0 && candidates.length === 1 ? candidates[0] : null;
    return pick ? {
      oracleId: pick.oracleId,
      colorIdentity: pick.colorIdentity,
      commanderLegal: pick.commanderLegal,
      priceCents: pick.priceCents,
      printedInSelectedSets: pick.printedInSelectedSets,
      owned: pick.owned,
    } : null;
  };
}
