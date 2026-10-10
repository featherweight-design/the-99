// "Help me add <color>": moves that give a deck more sources of the color a player picked. Asked for,
// never volunteered, and never a verdict (Hugh, 2026-10-10): the engine does not say a color is short,
// it shows what each move does to every color's source count. Pure over the deck's rows; every move is
// SIMULATED through `readManaBalance`, so the before and after are the same count the evidence shows.
//
// THE GUARD. A move is offered only if the picked color gains a source and no other color is hurt:
//   - a color whose sources meet Karsten's requirement for its hardest published pattern keeps meeting it;
//   - a color below that requirement does not lose a source at all;
//   - a color with no published requirement (no pips, or only a ceiling) is free to lose one.
// Karsten ("How Many Sources Do You Need to Consistently Cast Your Spells? A 2022 Update", TCGplayer)
// is a guard here and never a judgment of the deck.

import { isLandFace } from "../cards/facet";
import type { ManaSupplyCardRow } from "../mana/supply";
import { BALANCE_COLORS, readManaBalance, type BalanceColor, type ManaBalance } from "./mana-balance";
import { rankStaples, type StapleCandidate } from "./mana-staples";

/** The five basics, by the color each adds: an oracle id and a name the caller read from the catalog. */
export type BasicCatalog = Readonly<Record<BalanceColor, { id: string; name: string }>>;

/** A color's source count before and after a move. */
export type SourceChange = { color: BalanceColor; before: number; after: number };

export type RebalanceMove = {
  kind: "rebalance";
  from: BalanceColor;
  basicOut: string;
  basicIn: string;
  /** The most copies that can move before another color is hurt; every smaller number is safe too. */
  maxCopies: number;
  /** The change at `maxCopies`. */
  changes: SourceChange[];
};

export type TradeMove = {
  kind: "trade";
  /** The basic the staple replaces, one copy. */
  basicOut: string;
  basicOutColor: BalanceColor;
  staple: StapleCandidate;
  changes: SourceChange[];
};

export type ManaHelp = {
  color: BalanceColor;
  /** The picked color's sources now. */
  sourcesNow: number;
  rebalance: RebalanceMove[];
  trades: TradeMove[];
  /** Staples that add the color, owned copies first, whether or not a trade for them is safe. */
  staples: StapleCandidate[];
};

const NO_TAPPED = { always: 0, unless: 0, fetch: 0, lands: 0 };
const BASIC_COLOR: Record<string, BalanceColor> = { Plains: "W", Island: "U", Swamp: "B", Mountain: "R", Forest: "G" };

/** A land row that is a basic of exactly one color, and so can be swapped for another basic. */
const basicColorOf = (r: ManaSupplyCardRow): BalanceColor | null =>
  isLandFace(r.typeLine) && /\bBasic\b/.test(r.typeLine) && r.produces?.length === 1 ? (BASIC_COLOR[r.typeLine.split("—")[1]?.trim() ?? ""] ?? null) : null;

const total = (b: ManaBalance, c: BalanceColor) => b.colors.find((x) => x.color === c)!.sources.total;

/** Sources Karsten's 99-card column asks for the hardest pattern with a published row, 0 where none. */
function requirement(b: ManaBalance, c: BalanceColor): number {
  return Math.max(0, ...b.colors.find((x) => x.color === c)!.patterns.map((p) => (p.karsten.kind === "known" ? p.karsten.sources : 0)));
}

function changes(before: ManaBalance, after: ManaBalance): SourceChange[] {
  return BALANCE_COLORS.flatMap((color) => (total(before, color) === total(after, color) ? [] : [{ color, before: total(before, color), after: total(after, color) }]));
}

export function helpAddColor(
  rows: readonly ManaSupplyCardRow[],
  nameOf: (id: string) => string,
  lockedIds: ReadonlySet<string>,
  basics: BasicCatalog,
  candidates: readonly StapleCandidate[],
  color: BalanceColor,
): ManaHelp {
  const read = (r: readonly ManaSupplyCardRow[]) => readManaBalance({ rows: r, nameOf, tapped: NO_TAPPED });
  const before = read(rows);
  const need = Object.fromEntries(BALANCE_COLORS.map((c) => [c, requirement(before, c)])) as Record<BalanceColor, number>;

  /** The picked color gained, and no other color was hurt. */
  const safe = (after: ManaBalance): boolean => {
    if (total(after, color) <= total(before, color)) return false;
    return BALANCE_COLORS.every((c) => {
      if (c === color || total(after, c) >= total(before, c) || need[c] === 0) return true;
      return total(before, c) >= need[c] && total(after, c) >= need[c];
    });
  };

  const withQuantity = (r: readonly ManaSupplyCardRow[], id: string, delta: number) => r.map((x) => (x.id === id ? { ...x, quantity: x.quantity + delta } : x));
  const removable = rows.flatMap((r) => {
    const c = basicColorOf(r);
    return c && !lockedIds.has(r.id) && r.quantity > 0 ? [{ row: r, color: c }] : [];
  });

  const out: ManaHelp = { color, sourcesNow: total(before, color), rebalance: [], trades: [], staples: rankStaples(candidates, [color]) };

  // REBALANCE: basics of another color become basics of this one, as many as stay safe.
  const target = basics[color];
  const grown = rows.some((r) => r.id === target.id) ? rows : [...rows, { id: target.id, typeLine: `Basic Land — ${target.name}`, manaCost: null, quantity: 0, produces: [color] }];
  for (const { row, color: from } of removable) {
    if (from === color) continue;
    let best: { n: number; after: ManaBalance } | null = null;
    for (let n = 1; n <= row.quantity; n++) {
      const after = read(withQuantity(withQuantity(grown, row.id, -n), target.id, n));
      if (!safe(after)) break;
      best = { n, after };
    }
    if (best) out.rebalance.push({ kind: "rebalance", from, basicOut: nameOf(row.id), basicIn: target.name, maxCopies: best.n, changes: changes(before, best.after) });
  }

  // TRADE: one basic becomes a staple that adds the color. The basic with the most cover goes first.
  const bySlack = [...removable].sort((a, b) => total(before, b.color) - need[b.color] - (total(before, a.color) - need[a.color]));
  for (const staple of out.staples) {
    const add: ManaSupplyCardRow = { id: staple.oracleId, typeLine: staple.typeLine, manaCost: staple.manaCost, quantity: 1, produces: staple.produces, ...(isLandFace(staple.typeLine) ? {} : { ramp: true }) };
    for (const { row, color: basicColor } of bySlack) {
      const after = read([...withQuantity(rows, row.id, -1), add]);
      if (!safe(after)) continue;
      out.trades.push({ kind: "trade", basicOut: nameOf(row.id), basicOutColor: basicColor, staple, changes: changes(before, after) });
      break;
    }
  }
  return out;
}
