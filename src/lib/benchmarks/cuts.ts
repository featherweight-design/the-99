import type { BenchmarkCuts } from "./compute";

/**
 * The benchmarks' cut points, printed by `pnpm measure:benchmarks` against staging on 2026-10-11
 * (3,467 ok commanders, 34,670 sampled decks, ten per commander) and pasted here by hand. The derivation is in that
 * script's header and in the PR that set them; re-run it after an index rebuild moves the population.
 *
 * Grades are weighted quintiles. A dependency row is light at the smallest value whose upper tail is
 * at most 25% of the population, heavy at most 10%. Combat reliance has no light cut on this
 * population (`lightMax: 0`): no-line decks with no route outside combat are already 22% of their
 * group, so a deck either has no route at all (heavy) or does not lean on combat.
 */
export const BENCHMARK_CUTS: BenchmarkCuts = {
  grades: {
    velocity: [2.75, 3.35, 4, 4.91],
    flow: [13, 17, 20, 24],
    interaction: [17, 21, 25, 31],
    win: [0.02, 0.06, 0.13, 0.26],
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
