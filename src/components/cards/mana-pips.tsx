"use client";
// Mana-cost pips per property table §Mana Pip (generic {n}) / §Mana Pip (WUBRG colored).
// Size: 22px mobile / 26px desktop; font 12/13px.
// Generic {n}: var(--border-dashed) bg + --fg glyph.
// WUBRG:      design palette bg + --bg glyph (§Mana Pip WUBRG colored).

import { WUBRG_COLOR } from "../../lib/collection/browse";
// One parser for both pip treatments. This file carried a second copy of the
// same regex — the two never disagreed, they simply had no reason not to — and a
// rule like the front-face one then has to be written twice to hold. Importing
// it is what makes that impossible to half-do.
import { parseManaCost } from "../ui/cost-pips";

export function ManaCost({ cost }: { cost: string | null }) {
  if (!cost) return null;
  const symbols = parseManaCost(cost);
  if (symbols.length === 0) return null;
  return (
    // §Mana Cost Pip Container: display flex, gap 4/5px, flex none, padding-top 4px mobile
    <span className="flex gap-[4px] md:gap-[5px] flex-none pt-[4px] md:pt-0">
      {symbols.map((sym, i) => {
        const wubrg = /^[WUBRG]$/.test(sym);
        return (
          <span
            key={i}
            className="inline-flex items-center justify-center rounded-full font-mono text-[12px] md:text-[13px] w-[22px] h-[22px] md:w-[26px] md:h-[26px]"
            style={{
              background: wubrg ? WUBRG_COLOR[sym] ?? "var(--border-dashed)" : "var(--border-dashed)",
              color: wubrg ? "var(--bg)" : "var(--fg)",
              fontWeight: wubrg ? 600 : 400,
            }}
          >
            {sym}
          </span>
        );
      })}
    </span>
  );
}
