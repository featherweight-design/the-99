import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STACK_DROP_EASE, STACK_DROP_MS } from "../components/cards/card-modal-shared";
import { OVERLAY_OUT_MS } from "../components/shell/pending-overlay";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "globals.css"), "utf8");

/** The declaration of one class, outside the reduced-motion block (the first rule of that selector). */
const rule = (selector: string): string => {
  const m = new RegExp(`^${selector.replace(/[.[\]]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m").exec(CSS);
  if (!m) throw new Error(`no rule for ${selector}`);
  return m[1].replace(/\s+/g, " ").trim();
};

const token = (name: string) => new RegExp(`--${name}:\\s*([^;]+);`).exec(CSS)?.[1].trim();

const QUICK = "var(--motion-quick)";
const DURATION = "var(--motion-duration)";
const EASE = "var(--motion-ease)";
const OUT = "var(--motion-ease-out)";
const DELAY = "var(--motion-delay)";

// Small-polish R2 §3 (E6), one row per class: what it waits, how long it runs and on what curve. The answer to a press
// waits for nothing and takes the quick length; an arrival the reader caused waits a beat and takes the long one.
describe("E6: the ratified motion, retimed onto the tokens", () => {
  it("names the decelerating curve once, and keeps its value", () => {
    expect(token("motion-ease-out")).toBe("cubic-bezier(0.2, 0.7, 0.2, 1)");
    expect(token("motion-exit-quick")).toBe("140ms");
  });

  it.each([
    // [selector, a declaration that says exactly this]
    [".anim-menu-in", `menu-in ${QUICK} ${EASE} both`],
    [".anim-zoom-in", `zoom-in ${QUICK} ${EASE} both`],
    [".anim-sheet-up", `sheet-up ${DURATION} ${EASE} both`],
    [".anim-rail-tag", `rail-tag-in ${QUICK} ${EASE} both`],
    [".anim-overlay-in", `overlay-in ${QUICK} ${EASE} both`],
    [".anim-overlay-out", `overlay-out var(--motion-exit-quick) ${EASE} both`],
    [".anim-quickadd-in", `quickadd-in ${QUICK} ${EASE} both`],
    // Arrivals wait a beat.
    [".anim-sheet-in", `filter-sheet-in ${DURATION} ${EASE} ${DELAY} both`],
    [".anim-backdrop-in", `backdrop-in ${DURATION} ${EASE} ${DELAY} both`],
    // The kept curves, on token lengths: the stacked card and the phone card keep the sheet's snap curve.
    [".anim-stack-rise", `stack-rise ${DURATION} ${OUT} ${DELAY} both`],
    [".anim-phone-card-enter", `phone-card-enter ${DURATION} ${OUT} ${DELAY} both`],
    [".anim-carousel-prev", `carousel-art-enter-prev ${QUICK} ${OUT} both`],
    [".anim-carousel-next", `carousel-art-enter-next ${QUICK} ${OUT} both`],
  ])("%s runs %s", (selector, animation) => {
    expect(rule(selector)).toBe(`animation: ${animation};`);
  });

  it.each([
    [".anim-card-turn", `transition: transform ${DURATION} ${OUT};`],
    [".sheet-snap", `transition: top ${QUICK} ${OUT};`],
    [".band-dim", `transition: opacity ${QUICK} ${OUT};`],
  ])("%s transitions as %s", (selector, transition) => {
    expect(rule(selector)).toBe(transition);
  });

  it("leaves no motion class on a literal length or curve", () => {
    const retimed = [".anim-menu-in", ".anim-zoom-in", ".anim-sheet-up", ".anim-rail-tag", ".anim-overlay-in", ".anim-overlay-out",
      ".anim-sheet-in", ".anim-backdrop-in", ".anim-stack-rise", ".anim-phone-card-enter", ".anim-carousel-prev", ".anim-carousel-next",
      ".anim-card-turn", ".sheet-snap", ".band-dim", ".anim-quickadd-in"];
    for (const selector of retimed) expect(rule(selector), selector).not.toMatch(/cubic-bezier|\d(ms|s)\b/);
  });

  it("holds the JS that waits on a fade to the CSS that draws it", () => {
    // The pending overlay unmounts on a timer matched to its fade out: a timer shorter than the fade cuts it.
    expect(`${OVERLAY_OUT_MS}ms`).toBe(token("motion-exit-quick"));
  });

  it("drops the stacked card in about two-thirds of its rise, on the curve it rose on", () => {
    const rise = parseInt(token("motion-duration")!, 10);
    expect(STACK_DROP_MS).toBeGreaterThanOrEqual(Math.round(rise * 0.6));
    expect(STACK_DROP_MS).toBeLessThanOrEqual(Math.round(rise * 0.7));
    expect(STACK_DROP_EASE).toBe(token("motion-ease-out"));
  });

  it("keeps the overlay's fades under reduced motion, shortened to 100ms with no wait", () => {
    const reduced = CSS.slice(CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.anim-overlay-in \{ animation: overlay-in 100ms var\(--motion-ease\) both; \}/);
    expect(reduced).toMatch(/\.anim-overlay-out \{ animation: overlay-out 100ms var\(--motion-ease\) both; \}/);
  });
});
