import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { THEMES } from "@/lib/labels/types";
import { FIXED_AXES } from "@/lib/strategy/axes";
import { STRATEGY_GLYPHS, StrategyIcon, glyphOf } from "./strategy-icon";

/** Strategies with no glyph of their own yet, drawn with a neighbour's until Design draws one. */
const BORROWED: string[] = ["planeswalkers", "sagas", "proliferate"];

describe("StrategyIcon", () => {
  it("gives every theme and type-line axis a glyph of its own, each drawn differently", () => {
    for (const key of [...THEMES, ...FIXED_AXES]) expect(glyphOf(key)).toBe(key);
    // Distinct drawings: a copy-pasted entry would show one strategy's icon on another's legend row. Only `tribal`
    // shares, deliberately, the spears every creature type draws, and the three not drawn yet (BORROWED) share a neighbour's.
    const drawn = Object.entries(STRATEGY_GLYPHS)
      .filter(([k]) => k !== "tribal" && !BORROWED.includes(k))
      .map(([, g]) => renderToStaticMarkup(<svg>{g}</svg>));
    expect(new Set(drawn).size).toBe(drawn.length);
  });

  it("lends the three strategies with no drawing of their own the closest drawn glyph", () => {
    const svg = (k: keyof typeof STRATEGY_GLYPHS) => renderToStaticMarkup(<svg>{STRATEGY_GLYPHS[k]}</svg>);
    expect(svg("proliferate")).toBe(svg("counters"));
    expect(svg("sagas")).toBe(svg("enchantments"));
    expect(svg("planeswalkers")).toBe(svg("fallback"));
  });

  it("draws every creature type, and the tribal theme, with the shared spears", () => {
    expect(glyphOf("typal:Elf")).toBe("typal");
    expect(glyphOf("typal:Time Lord")).toBe("typal");
    expect(STRATEGY_GLYPHS.tribal).toBe(STRATEGY_GLYPHS.typal);
  });

  it("falls back for a key with no glyph, and draws in the handoff's stroke", () => {
    expect(glyphOf("someLaterTheme" as never)).toBe("fallback");
    const svg = renderToStaticMarkup(<StrategyIcon strategy="tokens" size={16} />);
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('stroke-width="1.6"');
    expect(svg).toContain('aria-hidden="true"');
  });
});
