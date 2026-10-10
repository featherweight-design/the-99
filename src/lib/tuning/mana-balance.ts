// Mana Balance, tier 1: the evidence about a deck's mana. Pure and free: no database, no model.
//
// IT RENDERS NO VERDICT (Hugh, 2026-10-10). There is no "short" and no "fine" anywhere in this
// output. Ten decks of Hugh's with a known play history were scored against five candidate shortfall
// rules (pip share against source share, share of source cards, Karsten's requirement for the hardest
// card, for the N-th hardest, and the commander's own cost); none matched, and Deckcheck's share
// verdict was wrong on four decks he rated fine. The plan's "Verdict rules rejected" holds the table.
// So the engine reports what a player needs to judge for themselves, each figure counted:
//   - pips per color, with the commander and without it (Deckcheck leaves it out);
//   - sources per color, a dual counted for every color it makes (the Colors card's own count);
//   - the hardest cost patterns the deck's cards share, each beside Karsten's 99-card requirement;
//   - how many lands enter tapped, the average mana value, and Karsten's land count.
// Karsten: "How Many Sources Do You Need to Consistently Cast Your Spells? A 2022 Update" (TCGplayer).

import { isLandFace } from "../cards/facet";
import { averageManaValue } from "../decks/mana-value";
import { karstenLands, karstenSources, patternName, type KarstenSources } from "../mana/karsten";
import type { TappedLands } from "../mana/lands-tapped";
import { castingPatterns, manaValueOf } from "../mana/pattern";
import { manaSupply, type ManaColor, type ManaSupply, type ManaSupplyCardRow } from "../mana/supply";

export const BALANCE_COLORS = ["W", "U", "B", "R", "G"] as const satisfies readonly ManaColor[];
export type BalanceColor = (typeof BALANCE_COLORS)[number];

/** Patterns listed per color, hardest first. */
export const PATTERNS_SHOWN = 6;

/** A row id that is a commander's: `manaSupplyRows` names them `commander:0`, `commander:1`. */
const isCommanderRow = (id: string) => id.startsWith("commander:");

export type PatternEvidence = {
  /** Karsten's notation: `1CC` is one other mana and two pips of this color. */
  pattern: string;
  generic: number;
  pips: number;
  /** Copies of cards with this pattern in this color. */
  copies: number;
  cards: { name: string; copies: number; commander: boolean }[];
  /** What the article asks of a 99-card deck for this pattern; the deck's own count is the color's `sources.total`. */
  karsten: KarstenSources;
};

export type ColorEvidence = {
  color: BalanceColor;
  /** Raw pips of this color, copies counted. A hybrid pip counts once for each half. */
  pips: { withCommander: number; withoutCommander: number };
  /** `pips` over the colored pips of every color, in the same frame. */
  pipShare: { withCommander: number; withoutCommander: number };
  /** Sources that add this color: a dual is one source for each color it makes. */
  sources: { lands: number; nonland: number; total: number };
  /** The hardest `PATTERNS_SHOWN` patterns this color's cards have, most pips first, then least other mana. */
  patterns: PatternEvidence[];
};

export type LandEvidence = {
  /** Copies of land cards. */
  count: number;
  /** Lands that enter tapped, ones tapped unless a condition holds, and fetches that put another land in tapped. */
  tapped: TappedLands;
  /** Mana value averaged over the nonland cards, the commander(s) counted as one more card each. */
  averageManaValue: number;
  /** Mana sources of mana value 3 or less: the ramp term of Karsten's land formula (draw spells are not counted). */
  cheapRamp: number;
  /** Karsten's 99-card land-count regression for those inputs, unrounded. */
  karstenLands: number;
};

export type ManaBalance = {
  /** `colorless`: no colored pip in the deck. `noSources`: colored pips and no source of any color. */
  state: "ok" | "colorless" | "noSources";
  colors: ColorEvidence[];
  /** `{C}` pips and colorless sources. */
  colorless: { demand: number; supply: number };
  /** Non-land sources whose color could not be read: counted in no figure above. */
  unattributedNonland: number;
  lands: LandEvidence;
  supply: ManaSupply;
};

export type ManaBalanceInput = {
  rows: readonly ManaSupplyCardRow[];
  /** The card's name for a row id, `commander:0` included. */
  nameOf: (id: string) => string;
  tapped: TappedLands;
};

/** Mana value of a row: Scryfall's, else the FRONT face's cost (the stored cost joins every face). */
const rowManaValue = (r: ManaSupplyCardRow) => r.cmc ?? manaValueOf((r.manaCost ?? "").split(" // ")[0].trim() || null);

/** Hardest first: more pips, then less other mana. */
const byHardness = (a: { generic: number; pips: number }, b: { generic: number; pips: number }) => b.pips - a.pips || a.generic - b.generic;

function patternsFor(color: ManaColor, rows: readonly ManaSupplyCardRow[], nameOf: (id: string) => string): PatternEvidence[] {
  const byPattern = new Map<string, PatternEvidence>();
  for (const r of rows) {
    if (isLandFace(r.typeLine)) continue;
    // Each face of an adventure, a split card or a castable back is its own way to cast the card.
    for (const p of castingPatterns(r.manaCost, color)) {
      const key = patternName(p.generic, p.pips);
      const entry = byPattern.get(key) ?? { pattern: key, generic: p.generic, pips: p.pips, copies: 0, cards: [], karsten: karstenSources(p.generic, p.pips) };
      entry.copies += r.quantity;
      entry.cards.push({ name: nameOf(r.id), copies: r.quantity, commander: isCommanderRow(r.id) });
      byPattern.set(key, entry);
    }
  }
  for (const e of byPattern.values()) e.cards.sort((a, b) => a.name.localeCompare(b.name));
  return [...byPattern.values()].sort(byHardness).slice(0, PATTERNS_SHOWN);
}

export function readManaBalance({ rows, nameOf, tapped }: ManaBalanceInput): ManaBalance {
  const supply = manaSupply(rows);
  const without = manaSupply(rows.filter((r) => !isCommanderRow(r.id)));
  const total = (c: ManaColor) => supply.supply[c].lands + supply.supply[c].nonland;
  const colored = (d: Record<ManaColor, number>) => BALANCE_COLORS.reduce((a, c) => a + d[c], 0);
  const [pipsWith, pipsWithout] = [colored(supply.demand), colored(without.demand)];
  const share = (n: number, of: number) => (of > 0 ? n / of : 0);

  const colors = BALANCE_COLORS.map((color): ColorEvidence => ({
    color,
    pips: { withCommander: supply.demand[color], withoutCommander: without.demand[color] },
    pipShare: { withCommander: share(supply.demand[color], pipsWith), withoutCommander: share(without.demand[color], pipsWithout) },
    sources: { lands: supply.supply[color].lands, nonland: supply.supply[color].nonland, total: total(color) },
    patterns: patternsFor(color, rows, nameOf),
  }));

  // The deck's average mana value is the what-changed strip's (`averageManaValue`), commanders included as cards.
  const averageMv = averageManaValue(rows.map((r) => ({ cmc: rowManaValue(r), quantity: r.quantity, typeLine: r.typeLine }))) ?? 0;
  const cheapRamp = rows.reduce((a, r) => (r.ramp && (r.produces ?? []).length > 0 && rowManaValue(r) <= 3 ? a + r.quantity : a), 0);

  return {
    state: pipsWith === 0 ? "colorless" : BALANCE_COLORS.every((c) => total(c) === 0) ? "noSources" : "ok",
    colors,
    colorless: { demand: supply.demand.C, supply: total("C") },
    unattributedNonland: supply.unattributedNonland,
    lands: { count: supply.lands, tapped, averageManaValue: averageMv, cheapRamp, karstenLands: karstenLands(averageMv, cheapRamp) },
    supply,
  };
}
