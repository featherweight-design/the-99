// Mana Balance, tier 1: which colors a deck's mana leaves short of what its spells ask for. Pure and
// free: no database, no model. Supply and demand are `manaSupply()`'s (the Colors card's own), so the
// two cannot disagree; demand is the raw pip count, never curve-weighted (Deck stats Ruling 10).
//
// THE RULE. A color should be at least as common among the deck's colored sources as it is among its
// colored pips: with N sources that can add a color, a color asking for 40% of the pips wants 40% of N.
// A dual counts for both its colors, so a deck never pays for owning duals; a colorless source is no
// one's. A color holding `SHORT_BY` or more fewer sources than that is short. (The first draft
// redistributed the colors' summed source units instead; duals inflate that sum, and Omnath read
// "G short by 31" when no swap could close it. Measured in the PR body.)

import { isLandFace } from "../cards/facet";
import { manaSupply, type ManaColor, type ManaSupply, type ManaSupplyCardRow } from "../mana/supply";

export const BALANCE_COLORS = ["W", "U", "B", "R", "G"] as const satisfies readonly ManaColor[];
export type BalanceColor = (typeof BALANCE_COLORS)[number];

/** Whole sources under the pip share before a color is named short. */
export const SHORT_BY = 1;

export type ColorBalance = {
  color: BalanceColor;
  /** Raw pips of this color in the deck's spells and commanders. */
  demand: number;
  /** `demand` over the colored pips of every color. */
  pipShare: number;
  supply: { lands: number; nonland: number; total: number };
  /** `sourceCards * pipShare`, rounded to a whole source. */
  target: number;
  /** `target - supply.total`: positive is short, negative is cover beyond the share. */
  gap: number;
  state: "short" | "met";
};

export type ManaBalance = {
  /** `colorless`: no colored pip to judge. `noSources`: colored pips and no source of any color. */
  state: "ok" | "colorless" | "noSources";
  colors: ColorBalance[];
  /** Copies of lands and non-land sources that add at least one colored mana: the N the shares apply to. */
  sourceCards: number;
  /** Colored pips across the deck. */
  coloredPips: number;
  /** `{C}` pips and colorless sources, reported and never judged. */
  colorless: { demand: number; supply: number };
  /** Non-land sources whose color could not be read: counted in no figure above. */
  unattributedNonland: number;
  supply: ManaSupply;
};

export function readManaBalance(rows: readonly ManaSupplyCardRow[]): ManaBalance {
  const supply = manaSupply(rows);
  const total = (c: ManaColor) => supply.supply[c].lands + supply.supply[c].nonland;
  const coloredPips = BALANCE_COLORS.reduce((a, c) => a + supply.demand[c], 0);
  const sourceCards = rows.reduce((a, r) => {
    const makesColor = (r.produces ?? []).some((c) => c !== "C");
    return makesColor && (isLandFace(r.typeLine) || r.ramp) ? a + r.quantity : a;
  }, 0);
  const colors = BALANCE_COLORS.map((color): ColorBalance => {
    const demand = supply.demand[color];
    const pipShare = coloredPips > 0 ? demand / coloredPips : 0;
    const target = Math.round(sourceCards * pipShare);
    const have = total(color);
    const gap = target - have;
    return {
      color,
      demand,
      pipShare,
      supply: { lands: supply.supply[color].lands, nonland: supply.supply[color].nonland, total: have },
      target,
      gap,
      state: gap >= SHORT_BY ? "short" : "met",
    };
  });
  return {
    state: coloredPips === 0 ? "colorless" : sourceCards === 0 ? "noSources" : "ok",
    colors,
    sourceCards,
    coloredPips,
    colorless: { demand: supply.demand.C, supply: total("C") },
    unattributedNonland: supply.unattributedNonland,
    supply,
  };
}
