import type { BenchmarkCuts } from "./compute";

/**
 * The benchmarks' cut points, printed by `pnpm measure:benchmarks` against staging on 2026-10-10
 * (3,467 ok commanders, 10,401 sampled decks) and pasted here by hand. The derivation is in that
 * script's header and in the PR that set them; re-run it after an index rebuild moves the population.
 *
 * Grades are weighted quintiles. A dependency row is light at the smallest value whose upper tail is
 * at most 25% of the population, heavy at most 10%. Combat reliance has no light cut on this
 * population (`lightMax: 0`): no-line decks with no route outside combat are already 19% of their
 * group, so a deck either has no route at all (heavy) or does not lean on combat.
 */
export const BENCHMARK_CUTS: BenchmarkCuts = {
  grades: {
    velocity: [2.73, 3.37, 4.02, 4.88],
    flow: [13, 17, 20, 24],
    interaction: [16, 21, 26, 32],
    win: [0.02, 0.07, 0.13, 0.27],
  },
  dependencies: {
    graveyard: { light: 8, heavy: 12 },
    artifacts: { cards: { light: 16, heavy: 24 }, payoffs: { light: 2, heavy: 5 } },
    enchantments: { cards: { light: 11, heavy: 14 }, payoffs: { light: 1, heavy: 2 } },
    creatures: { light: 12, heavy: 19 },
    activated: { light: 8, heavy: 10 },
    combat: { lightMax: 0 },
  },
};
