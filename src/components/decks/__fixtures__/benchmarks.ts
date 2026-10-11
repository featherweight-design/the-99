import type { BenchmarksWire, WireCard } from "../../../lib/benchmarks/wire";

/** A reading's benchmarks as the wire carries them: no combo line and no dependencies, unless overridden. */
export const wireFixtureCard = (name: string): WireCard => ({ oracleId: `id-${name}`, name, manaCost: "{1}{G}", typeLine: "Creature", manaValue: 2, quantity: 1, commander: false });

export function benchmarksWire(over: Partial<BenchmarksWire> = {}): BenchmarksWire {
  return {
    velocity: {
      step: 3, index: 3.4, lands: 36, points: 6.5, averageManaValue: 3.14, commanderTurn: 4, commanderName: "Omnath",
      counted: [{ card: wireFixtureCard("Sol Ring"), points: 1, why: "artifact" as never }], notCounted: [],
    },
    flow: { step: 4, points: 22, engines: 5, oneShots: 8, lines: [{ card: wireFixtureCard("Rhystic Study"), points: 2, repeatable: true }, { card: wireFixtureCard("Divination"), points: 1, repeatable: false }] },
    interaction: { step: 2, answers: 12, weighted: 19, cheapInstant: 4, counterspells: 2, lines: [{ card: wireFixtureCard("Swords"), weight: 3, kind: "removal" as never, instantSpeed: true, cheap: true }] },
    win: null,
    dependencies: [],
    ...over,
  };
}
