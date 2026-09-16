// The stored support list, and the overlap over it. PURE — no database import.
//
// The loader lives in `support-read.ts`, and the split is load-bearing rather
// than tidiness: `score.ts` imports this, and `score.ts` is reachable from
// client components (`components/commanders/fit-legend.tsx` among them). A
// module that reaches `src/db` pulls the neon driver into the client bundle and
// throws at module scope without `DATABASE_URL`, which is why
// `client-bundle-safety.test.ts` exists — and it caught exactly that when these
// two halves were one file.
//
// WHY THE STORED LIST AT ALL — Ruling D, from the commander-row spec.
// `scoreCommander` used to derive its synergy overlap by matching the LIVE
// EDHREC payload's card NAMES against the pool, while a `/discover` row would
// read the stored counts. `probe:fit-parity` measured the two over 95
// commanders and found 57 numerators, 56 denominators and 20 Fit figures
// disagreeing — drift between a monthly index and a continuously changing
// upstream, in both directions. A row printing one figure while the detail page
// it links to printed another is the defect the commander row exists to remove.

/**
 * One commander's stored support list.
 *
 * `total` is `commander_support.edhrec_total`, which the index writes as
 * `topCards.length` — the count of NAMES upstream listed, before unresolvable
 * ones are dropped from `oracleIds`. That asymmetry is deliberate and predates
 * this change (`index-build.ts:95–97`): a name the catalog cannot resolve should
 * reduce measured overlap rather than shrink the denominator and inflate every
 * reader's completeness. So `oracleIds.length <= total`, always.
 */
export type SupportList = {
  total: number | null;
  oracleIds: string[];
};

/**
 * Which of a commander's stored support cards are in a given set of cards.
 *
 * The id-keyed replacement for `edhrecOverlap`'s name matching. Nothing here
 * lowercases, splits a `Front // Back` name or falls back to a front face,
 * because the index already resolved every name to an oracle id when it was
 * built — which is what makes this the cheaper and more stable side of the two.
 *
 * The caller passes the POOL, so the commander's colour identity and its own
 * card are already excluded by `commanderPool`. That restriction is part of the
 * figure: `probe:fit-parity` found `Faceless One`, a colourless commander whose
 * stored list holds 83 off-identity cards out of 322, reading 122 owned against
 * 96 playable. Fit measures what could actually be played, so the pool's
 * restriction is the correct one and an unfiltered count is a different
 * quantity.
 */
export function supportOverlap(
  support: SupportList,
  pool: readonly { oracleId: string; name: string }[],
): { names: string[]; oracleIds: string[] } {
  const supported = new Set(support.oracleIds);
  const names: string[] = [];
  const oracleIds: string[] = [];
  for (const card of pool) {
    if (!supported.has(card.oracleId)) continue;
    names.push(card.name);
    oracleIds.push(card.oracleId);
  }
  return { names, oracleIds };
}
