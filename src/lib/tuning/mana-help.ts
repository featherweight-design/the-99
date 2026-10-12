// "Help me add <color>": moves that give a deck more sources of the color a player picked. Asked for,
// never volunteered, and never a verdict (Hugh, 2026-10-10): the engine does not say a color is short,
// it shows what each move does to every color's source count. Pure over the deck's rows; every move is
// SIMULATED through `readManaBalance`, so the before and after are the same count the evidence shows.
//
// THE GUARD. A move is offered only if the picked color gains a source and no other color is hurt:
//   - a color whose sources meet its Needed (the panel's figure: Karsten's requirement for the tightest
//     pattern its nonland cards share) keeps meeting it;
//   - a color below its Needed does not lose a source at all;
//   - a color with no Needed (no pips, or no published pattern) has a figure of 0, and so is free to lose one.
// One figure, the one the player reads beside each color (Hugh, 2026-10-12): the guard used to read the
// single hardest card's row, which on HD - Gishath put white at 26 needed against the panel's 15 and left
// it nothing to spare.
//
// WHAT A TRADE CUTS (Hugh, 2026-10-12). Per staple, the first FAIR card of three tiers:
//   1. a cut the deck's own tuning already named (Proposed cuts, then Suggested changes), in the run's order;
//      a land staple takes only a land, so a trade never moves the land count up by itself;
//   2. an off-plan land: a nonbasic land that makes none of the commander's colors, rarest in the
//      commander's decks first;
//   3. a basic, of the color with the most slack over its Needed AFTER this staple's own sources (ties: more
//      copies held, then W U B R G).
// Fair: the guard passes, and a land going out passes `basicCutFair` (the deck keeps its land target unless a
// land replaces it, and none of the land's colors ends short). A non-basic card goes out on one row at most:
// the rows are alternatives, and the same card on every one of them offers one trade five times. No card is
// judged weak here: only cuts a run already named are taken (the free cut ranking found 17% of Hugh's cuts).
// Karsten ("How Many Sources Do You Need to Consistently Cast Your Spells? A 2022 Update", TCGplayer)
// is a guard here and never a judgment of the deck.

import { isLandFace } from "../cards/facet";
import { basicCutFair } from "../mana/basic-cut";
import { NO_TAPPED_LANDS } from "../mana/lands-tapped";
import type { ManaSupplyCardRow } from "../mana/supply";
import { CONDITIONAL_GRANT, searchFinds } from "../swaps/land";
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

/** The card a trade cuts, one copy, and which tier chose it. */
export type TradeOut = {
  /** Its oracle id, the card an applied trade cuts. */
  id: string;
  name: string;
  /** `namedCut`: one of the deck's own tuning cuts. `offPlanLand`: a land making none of the deck's colors. */
  kind: "namedCut" | "offPlanLand" | "basic";
};

export type TradeMove = {
  kind: "trade";
  out: TradeOut;
  staple: StapleCandidate;
  changes: SourceChange[];
};

/** What a trade may cut besides a basic, and the land target it answers to. Read by the loader. */
export type TradeInputs = {
  /** Cards the deck's own tuning named as cuts and the player has not ruled on: the newest ok Proposed cuts
   *  run's, then the newest ok Suggested changes run's, each in the run's order. */
  namedCuts: readonly string[];
  /** Each land row's oracle text, by id. */
  landText: ReadonlyMap<string, string | null>;
  /** Inclusion percent per card in the commander's EDHREC decks, or null when there is no list. */
  inclusion: ReadonlyMap<string, number | null> | null;
  /** The deck's land target (Mix's land cell). */
  landTarget: number;
};

export type ManaHelp = {
  color: BalanceColor;
  /** False when the color is outside the commander's identity: a basic or a staple of it is not legal in
   *  the deck, so nothing is offered. */
  inIdentity: boolean;
  /** The picked color's sources now. */
  sourcesNow: number;
  rebalance: RebalanceMove[];
  trades: TradeMove[];
  /** Staples that add the color, owned copies first, whether or not a trade for them is safe. */
  staples: StapleCandidate[];
};

const isBasicType = (typeLine: string) => isLandFace(typeLine) && /\bBasic\b/.test(typeLine);

const BASIC_COLOR: Record<string, BalanceColor> = { Plains: "W", Island: "U", Swamp: "B", Mountain: "R", Forest: "G" };

/** A land row that is a basic of exactly one color, and so can be swapped for another basic. */
const basicColorOf = (r: ManaSupplyCardRow): BalanceColor | null =>
  isBasicType(r.typeLine) && r.produces?.length === 1 ? (BASIC_COLOR[r.typeLine.split("—")[1]?.trim() ?? ""] ?? null) : null;

const total = (b: ManaBalance, c: BalanceColor) => b.colors.find((x) => x.color === c)!.sources.total;

/** The color's Needed, as the panel shows it: Karsten's 99-card figure for the tightest pattern its nonland cards
 *  share (every pattern, not the few the evidence lists), 0 where none is published. */
function requirement(b: ManaBalance, c: BalanceColor): number {
  return b.colors.find((x) => x.color === c)!.needed?.requires ?? 0;
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
  identity: readonly string[],
  tradeInputs: TradeInputs,
): ManaHelp {
  const read = (r: readonly ManaSupplyCardRow[]) => readManaBalance({ rows: r, nameOf, tapped: NO_TAPPED_LANDS, identity });
  const before = read(rows);
  const need = Object.fromEntries(BALANCE_COLORS.map((c) => [c, requirement(before, c)])) as Record<BalanceColor, number>;

  /** The picked color gained, and no other color was hurt. */
  const safe = (after: ManaBalance): boolean => {
    if (total(after, color) <= total(before, color)) return false;
    return BALANCE_COLORS.every((c) => {
      if (c === color || total(after, c) >= total(before, c)) return true;
      return total(before, c) >= need[c] && total(after, c) >= need[c];
    });
  };

  const withQuantity = (r: readonly ManaSupplyCardRow[], id: string, delta: number) => r.map((x) => (x.id === id ? { ...x, quantity: x.quantity + delta } : x));
  const removable = rows.flatMap((r) => {
    const c = basicColorOf(r);
    return c && !lockedIds.has(r.id) && r.quantity > 0 ? [{ row: r, color: c }] : [];
  });

  const inIdentity = identity.includes(color);
  const out: ManaHelp = { color, inIdentity, sourcesNow: total(before, color), rebalance: [], trades: [], staples: inIdentity ? rankStaples(candidates, [color]) : [] };
  if (!inIdentity) return out;

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

  // TRADE: one card out, one staple in, the out card chosen per staple (the tiers in the header).
  const takeable = (r: ManaSupplyCardRow) => r.quantity > 0 && !lockedIds.has(r.id) && !r.id.startsWith("commander:");
  const rowById = new Map(rows.map((r) => [r.id, r] as const));
  const named = [...new Set(tradeInputs.namedCuts)].flatMap((id) => {
    const r = rowById.get(id);
    return r && takeable(r) && !isBasicType(r.typeLine) ? [r] : [];
  });
  const inclusion = (r: ManaSupplyCardRow) => tradeInputs.inclusion?.get(r.id) ?? 0;
  const offPlan = rows
    .filter((r) => {
      if (!takeable(r) || !isLandFace(r.typeLine) || isBasicType(r.typeLine)) return false;
      if ((r.produces ?? []).some((c) => identity.includes(c))) return false;
      const text = tradeInputs.landText.get(r.id) ?? null;
      // A land that fixes another way is on plan: a grant read off other permanents, a land search, landcycling.
      return !CONDITIONAL_GRANT.test(text ?? "") && searchFinds({ name: nameOf(r.id), typeLine: r.typeLine, oracleText: text }).length === 0 && !/landcycling/i.test(text ?? "");
    })
    .sort((a, b) => inclusion(a) - inclusion(b) || nameOf(a.id).localeCompare(nameOf(b.id)));
  const landsNow = before.lands.count;
  const used = new Set<string>();
  for (const staple of out.staples) {
    const add: ManaSupplyCardRow = { id: staple.oracleId, typeLine: staple.typeLine, manaCost: staple.manaCost, quantity: 1, produces: staple.produces, ...(isLandFace(staple.typeLine) ? {} : { ramp: true }) };
    const landIn = isLandFace(add.typeLine);
    const afterOut = (r: ManaSupplyCardRow) => read([...withQuantity(rows, r.id, -1), add]);
    const fair = (r: ManaSupplyCardRow, after: ManaBalance) => safe(after) && (!isLandFace(r.typeLine) || basicCutFair({
      lands: landsNow,
      landTarget: tradeInputs.landTarget,
      replacedByLand: landIn,
      colors: BALANCE_COLORS.filter((c) => identity.includes(c) && (r.produces ?? []).includes(c)).map((c) => ({ sourcesAfter: total(after, c), needed: need[c] })),
    }));
    const tiers: [TradeOut["kind"], ManaSupplyCardRow[]][] = [
      ["namedCut", landIn ? named.filter((r) => isLandFace(r.typeLine)) : [...named.filter((r) => !isLandFace(r.typeLine)), ...named.filter((r) => isLandFace(r.typeLine))]],
      ["offPlanLand", offPlan],
    ];
    let move: TradeMove | null = null;
    for (const [kind, candidates] of tiers) {
      for (const r of candidates) {
        if (used.has(r.id)) continue;
        const after = afterOut(r);
        if (!fair(r, after)) continue;
        used.add(r.id);
        move = { kind: "trade", out: { id: r.id, name: nameOf(r.id), kind }, staple, changes: changes(before, after) };
        break;
      }
      if (move) break;
    }
    if (!move) {
      const order = BALANCE_COLORS as readonly BalanceColor[];
      const best = removable
        .map(({ row, color: c }) => ({ row, c, after: afterOut(row) }))
        .filter((x) => fair(x.row, x.after))
        .map((x) => ({ ...x, slack: total(x.after, x.c) - need[x.c] }))
        .sort((a, b) => b.slack - a.slack || b.row.quantity - a.row.quantity || order.indexOf(a.c) - order.indexOf(b.c))[0];
      if (best) move = { kind: "trade", out: { id: best.row.id, name: nameOf(best.row.id), kind: "basic" }, staple, changes: changes(before, best.after) };
    }
    if (move) out.trades.push(move);
  }
  return out;
}
