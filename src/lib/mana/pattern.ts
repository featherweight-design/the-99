// A card's cost in Karsten's terms: per color, the colored pips and the other mana alongside them.
// Pips are `manaNeeds`' (so the numbers agree with Deck stats' demand): a hybrid pip asks for either
// half and counts once for each, and a Phyrexian or `{2/W}` pip asks for nothing.

import { faceCosts } from "../cards/faces";
import { manaNeeds } from "../profile/build";
import type { ManaColor } from "./supply";

/** Mana value of a cost: generic numbers add, `{X}` is 0, `{2/W}` is 2, every other symbol is 1. */
export function manaValueOf(manaCost: string | null): number {
  let total = 0;
  for (const [, body] of (manaCost ?? "").matchAll(/\{([^}]+)\}/g)) {
    const sym = body.toUpperCase();
    if (/^\d+$/.test(sym)) total += Number(sym);
    else if (sym === "X" || sym === "Y" || sym === "Z") continue;
    else if (/^2\//.test(sym)) total += 2;
    else total += 1;
  }
  return total;
}

export type ColorPattern = { generic: number; pips: number };

/** For each color ONE FACE'S cost needs: its pips, and the mana value that is not those pips. A stored
 *  cost joins every face (`{2}{R} // {1}{R}`) and is not one cost: read it with `castingPatterns`. */
export function costPatterns(manaCost: string | null): Partial<Record<ManaColor, ColorPattern>> {
  const mv = manaValueOf(manaCost);
  const pips: Partial<Record<ManaColor, number>> = {};
  for (const need of manaNeeds(manaCost)) for (const c of need) pips[c as ManaColor] = (pips[c as ManaColor] ?? 0) + 1;
  return Object.fromEntries(Object.entries(pips).map(([c, n]) => [c, { generic: mv - n, pips: n }]));
}

/** Every way to cast the card that needs this color, one per face of a joined cost, a pattern both
 *  faces share listed once. An adventure `{2}{R} // {1}{R}` is `2C` and `1C`; there is no `3CC`. */
export function castingPatterns(manaCost: string | null, color: ManaColor): ColorPattern[] {
  const seen = new Set<string>();
  const out: ColorPattern[] = [];
  for (const face of faceCosts(manaCost)) {
    const p = costPatterns(face)[color];
    if (!p || seen.has(`${p.generic}|${p.pips}`)) continue;
    seen.add(`${p.generic}|${p.pips}`);
    out.push(p);
  }
  return out;
}
