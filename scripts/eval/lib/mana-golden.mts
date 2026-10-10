/**
 * Mana Balance's golden check: the engine's counted evidence for a deck, shaped so it can be compared
 * to a hand-checked expectation and diffed. Pure (the script supplies nothing but the engine's
 * output), so the comparison itself is unit tested.
 */
import type { KarstenSources } from "../../../src/lib/mana/karsten";
import { BALANCE_COLORS, type BalanceColor, type ManaBalance } from "../../../src/lib/tuning/mana-balance";

export const GOLDEN_COLORS = BALANCE_COLORS;

export type GoldenPattern = { copies: number; karsten: string; cards: string[] };
export type GoldenColor = {
  pipsWith: number;
  pipsWithout: number;
  /** Source cards behind the supply, one entry per copy, sorted. */
  lands: string[];
  nonland: string[];
  /** The patterns shown, hardest first, as one string. */
  order: string;
  patterns: Record<string, GoldenPattern>;
};
export type GoldenBalance = {
  state: ManaBalance["state"];
  colorlessSupply: number;
  unattributedNonland: number;
  colors: Record<BalanceColor, GoldenColor>;
  lands: { count: number; tappedAlways: number; tappedUnless: number; averageManaValue: number; cheapRamp: number; karstenLands: number };
};

const karstenText = (k: KarstenSources) => (k.kind === "unknown" ? "unknown" : `${k.kind} ${k.sources}`);
const round = (n: number, places: number) => Number(n.toFixed(places));

export function goldenShape(b: ManaBalance, nameOf: (id: string) => string): GoldenBalance {
  const names = (ids: readonly string[]) => ids.map(nameOf).sort();
  return {
    state: b.state,
    colorlessSupply: b.colorless.supply,
    unattributedNonland: b.unattributedNonland,
    colors: Object.fromEntries(
      b.colors.map((c) => [
        c.color,
        {
          pipsWith: c.pips.withCommander,
          pipsWithout: c.pips.withoutCommander,
          lands: names(b.supply.sources[c.color].lands),
          nonland: names(b.supply.sources[c.color].nonland),
          order: c.patterns.map((p) => p.pattern).join(" "),
          patterns: Object.fromEntries(
            c.patterns.map((p) => [p.pattern, { copies: p.copies, karsten: karstenText(p.karsten), cards: p.cards.map((x) => `${x.name}${x.copies > 1 ? ` x${x.copies}` : ""}${x.commander ? " (commander)" : ""}`).sort() }]),
          ),
        },
      ]),
    ) as GoldenBalance["colors"],
    lands: {
      count: b.lands.count,
      tappedAlways: b.lands.tapped.always,
      tappedUnless: b.lands.tapped.unless,
      averageManaValue: round(b.lands.averageManaValue, 2),
      cheapRamp: b.lands.cheapRamp,
      karstenLands: round(b.lands.karstenLands, 1),
    },
  };
}

/** Names `from` holds more copies of than `than` does, each repeated by how many more. */
const surplus = (from: readonly string[], than: readonly string[]): string[] => {
  const left = new Map<string, number>();
  for (const n of than) left.set(n, (left.get(n) ?? 0) + 1);
  const out: string[] = [];
  for (const n of from) {
    const k = left.get(n) ?? 0;
    if (k > 0) left.set(n, k - 1);
    else out.push(n);
  }
  return out;
};

const isNames = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** One line per difference, by path; empty when the engine matches the expectation. */
export function diffGolden(expected: unknown, actual: unknown, path = ""): string[] {
  if (isNames(expected) && isNames(actual)) {
    if (expected.length === actual.length && expected.every((n, i) => n === actual[i])) return [];
    const [missing, extra] = [surplus(expected, actual), surplus(actual, expected)];
    return [`${path}: expected ${expected.length}, got ${actual.length}${missing.length ? `; missing ${missing.join(", ")}` : ""}${extra.length ? `; extra ${extra.join(", ")}` : ""}`];
  }
  if (expected && actual && typeof expected === "object" && typeof actual === "object" && !Array.isArray(expected) && !Array.isArray(actual)) {
    const [e, a] = [expected as Record<string, unknown>, actual as Record<string, unknown>];
    return [...new Set([...Object.keys(e), ...Object.keys(a)])].flatMap((k) => {
      const where = path ? `${path}.${k}` : k;
      if (!(k in e)) return [`${where}: not expected, got ${JSON.stringify(a[k])}`];
      if (!(k in a)) return [`${where}: expected ${JSON.stringify(e[k])}, got nothing`];
      return diffGolden(e[k], a[k], where);
    });
  }
  return expected === actual ? [] : [`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`];
}
