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

/** What a color's cards ask of its sources: the tightest published Karsten pattern they share. */
export type NeededEvidence = {
  /** Karsten's notation, `1CC`. */
  pattern: string;
  generic: number;
  pips: number;
  /** Karsten's published 99-card requirement for the pattern (a `known` figure; a ceiling or an
   *  unpublished row never gives a Needed). */
  requires: number;
  /** The deck's sources of this color over `requires`. Below 1 means fewer sources than the pattern asks. */
  ratio: number;
  /** Copies of nonland cards with the pattern, the commander left out. */
  copies: number;
  /** Those cards, by name. */
  cards: { name: string; copies: number }[];
  /** `shared`: two or more copies carry the pattern. `single`: no published pattern is shared, so this is the
   *  worst one a single copy carries (a color is not ranked best only because its tight costs are on one card each). */
  basis: "shared" | "single";
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
  /** Karsten's figure for the hardest of ALL this color's patterns that has a published row (not only the
   *  ones shown, and not a ceiling), 0 when none does. */
  karstenHardest: number;
  /** The tightest pattern two or more nonland copies share (else the worst single-copy one), commander
   *  excluded. Null when no pattern of this color the deck's nonland cards carry has a published figure. */
  needed: NeededEvidence | null;
};

/** One color in the order `Improve my mana` lists them. */
export type ColorOrderEntry = {
  color: BalanceColor;
  /** `ranked`: has a Needed, ordered by its ratio. `noPublished`: has pips but no published pattern, after every
   *  ranked color. `noPips`: in the commander's identity with no colored pip, last. */
  kind: "ranked" | "noPublished" | "noPips";
  needed: NeededEvidence | null;
};

export type LandEvidence = {
  /** Copies of land cards. */
  count: number;
  /** Lands that enter tapped, ones tapped unless a condition holds, and fetches that put another land in tapped. */
  tapped: TappedLands;
  /** Mana value averaged over the nonland cards, the commander(s) counted as one more card each. */
  averageManaValue: number;
  /** Mana sources of mana value 3 or less, whether or not their color could be read: the ramp term of Karsten's land formula (draw spells are not counted). */
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
  /** The commander's (and partner's) colors that this read lists, in W U B R G order. */
  identity: BalanceColor[];
  /** The colors of the commander's identity, tightest first, for the `Improve my mana` step: lowest `needed.ratio`
   *  first, then more pips with the commander, then W U B R G; colors with pips and no published pattern follow in
   *  W U B R G order; identity colors with no pip come last. Empty for a `colorless` deck (no door). Nothing in it
   *  is preselected or judged: it is an order. */
  colorOrder: ColorOrderEntry[];
};

export type ManaBalanceInput = {
  rows: readonly ManaSupplyCardRow[];
  /** The card's name for a row id, `commander:0` included. */
  nameOf: (id: string) => string;
  tapped: TappedLands;
  /** The commander's colors (both, with a partner). Colors outside the five (`C`) are ignored. */
  identity: readonly string[];
};

/** Mana value of a row: Scryfall's, else the FRONT face's cost (the stored cost joins every face). */
const rowManaValue = (r: ManaSupplyCardRow) => r.cmc ?? manaValueOf((r.manaCost ?? "").split(" // ")[0].trim() || null);

/** Hardest first: more pips, then less other mana. */
const byHardness = (a: { generic: number; pips: number }, b: { generic: number; pips: number }) => b.pips - a.pips || a.generic - b.generic;

function patternsFor(color: ManaColor, rows: readonly ManaSupplyCardRow[], nameOf: (id: string) => string): { shown: PatternEvidence[]; all: PatternEvidence[]; karstenHardest: number } {
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
  const all = [...byPattern.values()].sort(byHardness);
  return { shown: all.slice(0, PATTERNS_SHOWN), all, karstenHardest: Math.max(0, ...all.map((p) => (p.karsten.kind === "known" ? p.karsten.sources : 0))) };
}

/** The Needed pattern for a color with `sources` sources. Only a pattern with a published figure counts, and only
 *  its nonland copies (the commander is a card the deck must cast, but the figure is about the other 98). Among
 *  patterns two or more copies share, the lowest ratio wins; with none, the lowest among single-copy ones. A tie
 *  in ratio goes to the pattern with more pips, then less other mana. */
function neededFor(all: readonly PatternEvidence[], sources: number): NeededEvidence | null {
  const candidates = all.flatMap((p) => {
    if (p.karsten.kind !== "known") return [];
    const cards = p.cards.filter((c) => !c.commander).map(({ name, copies }) => ({ name, copies }));
    const copies = cards.reduce((a, c) => a + c.copies, 0);
    if (copies === 0) return [];
    const requires = p.karsten.sources;
    return [{ pattern: p.pattern, generic: p.generic, pips: p.pips, requires, ratio: sources / requires, copies, cards, basis: (copies >= 2 ? "shared" : "single") as "shared" | "single" }];
  });
  const worst = (xs: NeededEvidence[]) => xs.reduce<NeededEvidence | null>((best, x) => (best === null || x.ratio < best.ratio || (x.ratio === best.ratio && byHardness(x, best) < 0) ? x : best), null);
  return worst(candidates.filter((x) => x.basis === "shared")) ?? worst(candidates);
}

export function readManaBalance({ rows, nameOf, tapped, identity }: ManaBalanceInput): ManaBalance {
  const supply = manaSupply(rows);
  const without = manaSupply(rows.filter((r) => !isCommanderRow(r.id)));
  const total = (c: ManaColor) => supply.supply[c].lands + supply.supply[c].nonland;
  const colored = (d: Record<ManaColor, number>) => BALANCE_COLORS.reduce((a, c) => a + d[c], 0);
  const [pipsWith, pipsWithout] = [colored(supply.demand), colored(without.demand)];
  const share = (n: number, of: number) => (of > 0 ? n / of : 0);

  const colors = BALANCE_COLORS.map((color): ColorEvidence => {
    const { shown, all, karstenHardest } = patternsFor(color, rows, nameOf);
    return {
      color,
      pips: { withCommander: supply.demand[color], withoutCommander: without.demand[color] },
      pipShare: { withCommander: share(supply.demand[color], pipsWith), withoutCommander: share(without.demand[color], pipsWithout) },
      sources: { lands: supply.supply[color].lands, nonland: supply.supply[color].nonland, total: total(color) },
      patterns: shown,
      karstenHardest,
      needed: neededFor(all, total(color)),
    };
  });
  const state = pipsWith === 0 ? "colorless" : BALANCE_COLORS.every((c) => total(c) === 0) ? "noSources" : "ok";
  const identityColors = BALANCE_COLORS.filter((c) => identity.includes(c));
  const colorOrder = state === "colorless" ? [] : orderColors(colors.filter((c) => identityColors.includes(c.color)));

  // The deck's average mana value is the what-changed strip's (`averageManaValue`), commanders included as cards.
  const averageMv = averageManaValue(rows.map((r) => ({ cmc: rowManaValue(r), quantity: r.quantity, typeLine: r.typeLine }))) ?? 0;
  const cheapRamp = rows.reduce((a, r) => (r.ramp && rowManaValue(r) <= 3 ? a + r.quantity : a), 0);

  return {
    state,
    colors,
    colorless: { demand: supply.demand.C, supply: total("C") },
    unattributedNonland: supply.unattributedNonland,
    lands: { count: supply.lands, tapped, averageManaValue: averageMv, cheapRamp, karstenLands: karstenLands(averageMv, cheapRamp) },
    supply,
    identity: identityColors,
    colorOrder,
  };
}

/** `colors` arrive in W U B R G order, which is the final tie-break: every sort below is stable. */
function orderColors(colors: readonly ColorEvidence[]): ColorOrderEntry[] {
  const entry = (c: ColorEvidence): ColorOrderEntry => ({
    color: c.color,
    kind: c.needed ? "ranked" : c.pips.withCommander > 0 ? "noPublished" : "noPips",
    needed: c.needed,
  });
  const ranked = colors.filter((c) => c.needed).sort((a, b) => a.needed!.ratio - b.needed!.ratio || b.pips.withCommander - a.pips.withCommander);
  return [
    ...ranked.map(entry),
    ...colors.filter((c) => !c.needed && c.pips.withCommander > 0).map(entry),
    ...colors.filter((c) => !c.needed && c.pips.withCommander === 0).map(entry),
  ];
}
