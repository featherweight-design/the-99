import { createHash } from "node:crypto";

import { inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { cardLabels } from "../../db/schema";
import { cacheForUser } from "../cache/user-lists";
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
 *
 * CACHED ON EVERY MUTABLE INPUT (plan "Cost"). Uncached, the three reads cost a median 305ms on
 * staging's 21 reference decks, against the plan's ~50ms bar. The key is the reading's own list,
 * the newest label among its cards (a label publish moves it) and, through `cacheForUser`, the
 * catalog generation (a catalog refresh and a combo copy both stamp it) and the deployment. A list
 * fingerprint alone would serve a stale grade after a label or combo publish, neither of which moves
 * the list. A failed read is never stored.
 */
export async function readingBenchmarks(
  profile: DeckProfile,
  userId: string,
  enabled: boolean = deckBenchmarksEnabled(),
): Promise<BenchmarksWire | null> {
  if (!enabled) return null;
  const labelled = await newestLabel(profile);
  if (labelled === undefined) return computeReadingBenchmarks(profile);
  try {
    return await cacheForUser(userId, ["deck-benchmarks", listKey(profile), labelled], async () => {
      const wire = await computeReadingBenchmarks(profile);
      // Thrown rather than returned, so a failed read is not filed under this key.
      if (!wire) throw new Error("benchmark read failed");
      return wire;
    });
  } catch {
    return null;
  }
}

/** The uncached composition: the reads, then the pure grade. Exported for `measure:profile-cost`,
 *  which runs outside a request and cannot reach the data cache. */
export async function computeReadingBenchmarks(profile: DeckProfile): Promise<BenchmarksWire | null> {
  const input = await loadBenchmarkInput(profile);
  if (!input) return null;
  const commanders = input.cards.filter((c) => c.commander);
  const lead = commanders.reduce<(typeof commanders)[number] | null>((a, c) => (a && a.manaValue >= c.manaValue ? a : c), null);
  return toWire(computeBenchmarks(input, BENCHMARK_CUTS), lead?.name ?? null);
}

/** The list the reading was made from, as one short key: every card and count, and the commanders. */
export function listKey(profile: Pick<DeckProfile, "cards" | "commanderOracleIds">): string {
  const cards = profile.cards.map((c) => `${c.oracleId}:${c.quantity}`).sort();
  const commanders = [...profile.commanderOracleIds].sort();
  return createHash("sha256").update(JSON.stringify([cards, commanders])).digest("hex").slice(0, 32);
}

/** The newest label among the list's cards, as epoch millis ("none" when no card has one), or
 *  undefined when the read fails, in which case the read runs uncached rather than keyed wrongly. */
export async function newestLabel(profile: DeckProfile): Promise<string | undefined> {
  const ids = [...new Set([...profile.cards.map((c) => c.oracleId), ...profile.commanderOracleIds])];
  if (ids.length === 0) return "none";
  try {
    const [row] = await db
      .select({ millis: sql<string | null>`(extract(epoch from max(${cardLabels.labelledAt})) * 1000)::bigint` })
      .from(cardLabels)
      .where(inArray(cardLabels.oracleId, ids));
    return row?.millis == null ? "none" : String(row.millis);
  } catch {
    return undefined;
  }
}
