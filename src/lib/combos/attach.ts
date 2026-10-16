import type { ComboPartner } from "./near-miss";

/**
 * The page-level projection for combo awareness states 2 and 3, extracted so it can be
 * asserted.
 *
 * `/decks/[id]` is a server component: the two lists it builds — the Add panel's suggestions
 * and the Last 31's candidates — are assembled inline and no test can reach them there. The
 * component tests inject `comboPartner` directly into their fixtures, so deleting the
 * attachment or the id union on the page leaves every one of them green while the clause
 * disappears from production.
 */

/** What the reader is told, drawn from what the query returned. */
export type AttachedCombo = { oracleId: string; name: string } | null;

/**
 * BOTH LISTS IN ONE READ. The suggestions and the candidates are two rankings over the same
 * question, and asking twice would pay the join twice for an overlapping set of ids — which
 * is most of them, since both rank the same commander's pool.
 */
export function comboLookupIds(
  candidates: readonly { oracleId: string }[],
  suggestions: readonly { oracleId: string }[],
): string[] {
  return [
    ...new Set([
      ...candidates.map((c) => c.oracleId),
      ...suggestions.map((s) => s.oracleId),
    ]),
  ];
}

/**
 * One row's partner, shaped for the payload.
 *
 * `null` rather than `undefined` for a card with no combo, and rather than omitting the
 * field: both consumers declare it, so a present-and-null field is the honest "asked, and
 * there is none" — where an absent one is indistinguishable from a payload that never asked.
 */
export function comboFor(
  oracleId: string,
  completions: ReadonlyMap<string, ComboPartner> | null,
): AttachedCombo {
  const hit = completions?.get(oracleId);
  return hit ? { oracleId: hit.partnerOracleId, name: hit.partnerName } : null;
}

/**
 * A deck card's in-deck combo fields, from `loadInDeckPartners`. The page spreads this onto each
 * row; extracted for the reason `comboFor` is, since the page's inline projection is unreachable
 * from a test. The other-partner count is carried only when there is one, so a row with a single
 * partner ships no extra field.
 */
export function deckComboFields(
  oracleId: string,
  partners: ReadonlyMap<string, ComboPartner> | null,
): { comboPartner: AttachedCombo; comboOtherPartners?: number } {
  const hit = partners?.get(oracleId);
  if (!hit) return { comboPartner: null };
  return {
    comboPartner: { oracleId: hit.partnerOracleId, name: hit.partnerName },
    ...(hit.otherPartners ? { comboOtherPartners: hit.otherPartners } : {}),
  };
}
