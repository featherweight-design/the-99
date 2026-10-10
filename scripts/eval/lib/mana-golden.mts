/**
 * Mana Balance's golden check: the engine's counted output for a deck, shaped so it can be compared
 * to a hand-checked expectation and diffed. Pure (the script supplies the names), so the comparison
 * itself is unit tested.
 */
import type { BalanceColor, ManaBalance } from "../../../src/lib/tuning/mana-balance";

export const GOLDEN_COLORS = ["W", "U", "B", "R", "G"] as const satisfies readonly BalanceColor[];

export type GoldenColor = {
  demand: number;
  target: number;
  gap: number;
  state: "short" | "met";
  /** Card names behind the supply, one per copy, sorted. */
  lands: string[];
  nonland: string[];
};

export type GoldenBalance = {
  state: ManaBalance["state"];
  sourceCards: number;
  colorlessSupply: number;
  unattributedNonland: number;
  colors: Record<BalanceColor, GoldenColor>;
};

export function goldenShape(b: ManaBalance, nameOf: (id: string) => string): GoldenBalance {
  const names = (ids: readonly string[]) => ids.map(nameOf).sort();
  return {
    state: b.state,
    sourceCards: b.sourceCards,
    colorlessSupply: b.colorless.supply,
    unattributedNonland: b.unattributedNonland,
    colors: Object.fromEntries(
      b.colors.map((c) => [
        c.color,
        {
          demand: c.demand,
          target: c.target,
          gap: c.gap,
          state: c.state,
          lands: names(b.supply.sources[c.color].lands),
          nonland: names(b.supply.sources[c.color].nonland),
        },
      ]),
    ) as GoldenBalance["colors"],
  };
}

const sameNames = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((n, i) => n === b[i]);

/** One line per difference; empty when the engine matches the expectation. */
export function diffGolden(expected: GoldenBalance, actual: GoldenBalance): string[] {
  const out: string[] = [];
  for (const k of ["state", "sourceCards", "colorlessSupply", "unattributedNonland"] as const) {
    if (expected[k] !== actual[k]) out.push(`${k}: expected ${expected[k]}, got ${actual[k]}`);
  }
  for (const c of GOLDEN_COLORS) {
    const [e, a] = [expected.colors[c], actual.colors[c]];
    for (const k of ["demand", "target", "gap", "state"] as const) {
      if (e[k] !== a[k]) out.push(`${c}.${k}: expected ${e[k]}, got ${a[k]}`);
    }
    for (const side of ["lands", "nonland"] as const) {
      if (sameNames(e[side], a[side])) continue;
      const missing = e[side].filter((n) => !a[side].includes(n));
      const extra = a[side].filter((n) => !e[side].includes(n));
      out.push(`${c}.${side}: expected ${e[side].length}, got ${a[side].length}${missing.length ? `; missing ${[...new Set(missing)].join(", ")}` : ""}${extra.length ? `; extra ${[...new Set(extra)].join(", ")}` : ""}`);
    }
  }
  return out;
}
