import { MANA_COLORS, type ManaColor, type ManaSupply } from "./supply";

// The Colors card's rows (Deck stats), as one pure derivation: every color with a pip or a source,
// each share a whole percent of ALL pips and ALL sources (colorless included), and the widest
// share every bar is drawn against. Mana Balance's table draws from the same rows, so the two
// surfaces cannot disagree about a figure (Tuning hub R3, call 2: "one number on both surfaces").

export type ColorRow = {
  c: ManaColor;
  pips: number;
  lands: number;
  other: number;
  /** Whole percents of `pipTotal` and `sourceTotal`. */
  pipShare: number;
  sourceShare: number;
};

export type ColorRows = { rows: ColorRow[]; pipTotal: number; sourceTotal: number; widest: number };

export const share = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

export function colorRows(mana: Pick<ManaSupply, "demand" | "supply">): ColorRows {
  const drawn = MANA_COLORS.map((c) => ({ c, pips: mana.demand[c], lands: mana.supply[c].lands, other: mana.supply[c].nonland })).filter(
    (r) => r.pips > 0 || r.lands + r.other > 0,
  );
  const pipTotal = drawn.reduce((a, r) => a + r.pips, 0);
  // A source counts once for each color it adds: the bars' own total.
  const sourceTotal = drawn.reduce((a, r) => a + r.lands + r.other, 0);
  const rows = drawn.map((r) => ({ ...r, pipShare: share(r.pips, pipTotal), sourceShare: share(r.lands + r.other, sourceTotal) }));
  const widest = Math.max(1, ...rows.flatMap((r) => [r.pipShare, r.sourceShare]));
  return { rows, pipTotal, sourceTotal, widest };
}
