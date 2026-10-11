import { deckBenchmarksEnabled } from "../decks/benchmarks-flag";
import type { DeckProfile } from "../profile/types";
import { computeBenchmarks } from "./compute";
import { BENCHMARK_CUTS } from "./cuts";
import { loadBenchmarkInput } from "./load";
import { toWire, type BenchmarksWire } from "./wire";

/**
 * A reading's benchmarks, for the two profile actions to send beside it (plan "Where it computes").
 * Computed from the list stored WITH the reading, so a held or stale reading is graded on its own
 * list and goes stale with it. Off with `DECK_BENCHMARKS_ENABLED`: nothing is read. Null as well when
 * a read fails, and the reading then draws exactly as it did before benchmarks existed.
 */
export async function readingBenchmarks(profile: DeckProfile, enabled: boolean = deckBenchmarksEnabled()): Promise<BenchmarksWire | null> {
  if (!enabled) return null;
  const input = await loadBenchmarkInput(profile);
  if (!input) return null;
  const commanders = input.cards.filter((c) => c.commander);
  const lead = commanders.reduce<(typeof commanders)[number] | null>((a, c) => (a && a.manaValue >= c.manaValue ? a : c), null);
  return toWire(computeBenchmarks(input, BENCHMARK_CUTS), lead?.name ?? null);
}
