// How well a candidate commander leads THIS deck's 99: the plain "N of M" count (H2, Hugh,
// 2026-09-25: minimum sample only). No popularity correction and no seam for one.
//
// M is the deck's distinct non-basic cards other than universal staples: a basic or a card that
// sits in three decks of four says nothing about which commander the list was built for. N is
// how many of those M the candidate's EDHREC support list carries. `inclusion` is not read: a
// card is in the list or it is not.

/**
 * The fewest decks a candidate (or pair) needs on EDHREC before it is ranked at all. Below it
 * the candidate is HIDDEN, never shown with a caveat.
 *
 * Measured on staging (18 real decks, 2,852 deck × candidate pairs, 2026-09-25). The plan
 * (`docs/superpowers/plans/2026-09-25-change-commander.md`, "The floor's curve") holds the whole
 * table; at 20 no candidate under 20 decks reaches a deck's top 10, one deck moves a card's
 * inclusion by at most 5 points, and 89% of candidates are kept.
 *
 * Applied in SQL by `candidates.ts`, where a null count fails the comparison too, and proved there
 * by `probe-change-commander-write.ts` against a real sub-floor commander.
 */
export const MIN_CANDIDATE_DECKS = 20;

/** The deck's cards the figure is counted over: distinct, not basic, not a universal staple. */
export function fitBody(
  cards: readonly { oracleId: string; basic: boolean }[],
  universalStaples: ReadonlySet<string>,
): string[] {
  const ids = new Set<string>();
  for (const c of cards) {
    if (!c.basic && !universalStaples.has(c.oracleId)) ids.add(c.oracleId);
  }
  return [...ids];
}

export type Fit = { n: number; of: number };

/** N of M: how many of the body's cards the candidate's support list carries. */
export function fitCount(support: ReadonlySet<string>, body: readonly string[]): Fit {
  let n = 0;
  for (const id of body) if (support.has(id)) n += 1;
  return { n, of: body.length };
}
