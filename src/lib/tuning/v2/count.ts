/**
 * Suggested changes v2's count arithmetic (spec `docs/superpowers/specs/2026-10-27-suggested-changes-v2-design.md`, §4,
 * §5.1, §5.1a, §5.2). Pure: the player asks for N cards in and N out; each list is asked for about 1.5N so the player
 * picks N from a larger pool (Hugh: "give the player a choice"), and every valid line up to the ask is kept.
 */

/** The count's range: 1 to 20 for launch (Hugh, §12 Q6). 20 is the largest count the eval measured. */
export const MIN_COUNT = 1;
export const MAX_COUNT = 20;

export function isCount(n: unknown): n is number {
  return Number.isInteger(n) && (n as number) >= MIN_COUNT && (n as number) <= MAX_COUNT;
}

/** How many lines a list is asked for: ceil(1.5N) (arm C, §5.1). */
export function askFor(n: number): number {
  return Math.ceil(1.5 * n);
}

/** A call's reply ceiling, scaled with what it asks for: about 450 tokens a line measured on v9 answers, plus room to think
 *  (the count-mechanism eval's figure, spec §10). 22,000 tokens at 30 lines, N=20's ask. */
export function replyCeilingFor(ask: number): number {
  return Math.max(8_000, 600 * ask + 4_000);
}

/** The reply schema's per-list cap: LOOSE, twice the ask (§5.2), so one card too many never rejects a whole reply. */
export function schemaCapFor(ask: number): number {
  return 2 * ask;
}

/**
 * How many cuts the cut call asks for, given the additions call 1 (and its refill) kept (§5.1a): the cuts make room for
 * what can come in, so a short additions list shrinks the cut ask to ceil(1.5K). Zero kept additions skips the cut call.
 * The cut list's own target is then min(N, K): the player can apply at most K pairs.
 */
export function cutPlanFor(n: number, keptAdditions: number): { ask: number; target: number } {
  const k = Math.min(n, keptAdditions);
  return { ask: k === 0 ? 0 : askFor(k), target: k };
}

/** The first `ask` valid lines, in the model's order (§5.2: "over the ask keeps its first ask-many valid lines"). */
export function keepUpTo<T>(lines: readonly T[], ask: number): T[] {
  return lines.slice(0, ask);
}

/**
 * A refill's lines with every card already kept on EITHER list removed (§5.2: a refill naming a card already kept is
 * dropped). Keyed by oracle id, so two spellings of one card are one card.
 */
export function dropAcross<T>(refill: readonly T[], keptIds: ReadonlySet<string>, idOf: (line: T) => string): T[] {
  const seen = new Set(keptIds);
  return refill.filter((line) => {
    const id = idOf(line);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
