import { describe, expect, it } from "vitest";

import { compareLines, fitCompare, type Compare } from "./compare";

const c = (over: Partial<Compare>): Compare => ({ type: null, keeps: [], gains: [], loses: [], ...over });

describe("the comparison's fit (stand-in row addendum 3a)", () => {
  it("counts one line for a short comparison at both widths", () => {
    const short = c({ keeps: ["taps for mana", "+1/+1 counters"], loses: ["haste"] });
    expect(compareLines(short, 560)).toBe(1);
    expect(compareLines(short, 315)).toBe(1);
  });

  it("breaks between items, never inside one, and lets a long group start mid-line", () => {
    const long = c({
      keeps: ["removal"],
      loses: ["protection", "a sacrifice outlet", "death triggers", "free casts", "life gain", "recursion", "tokens"],
    });
    // Too long for one 560px line, and it starts on line one beside KEEPS rather than on a line of its own.
    expect(compareLines(long, 560)).toBe(2);
    expect(compareLines(long, 315)).toBe(2);
  });

  it("drops one gain first, then the gains group, then keeps past the first, and never a loss", () => {
    const loses = ["protection", "a sacrifice outlet", "death triggers", "free casts", "life gain"];
    const over = c({
      keeps: ["removal", "tokens", "mill"],
      gains: ["pumps", "evasion", "mana value 1"],
      loses,
    });
    const fit = fitCompare(over);
    expect(fit.loses).toEqual(loses);
    expect(fit.gains).toEqual([]);
    expect(fit.keeps[0]).toBe("removal");
    expect(compareLines(fit, 560)).toBeLessThanOrEqual(1);
    expect(compareLines(fit, 315)).toBeLessThanOrEqual(2);
  });

  it("drops only the last gain when that is enough", () => {
    // Fits once `mana value 1`, the last gain, goes.
    const near = c({ keeps: ["taps for mana", "+1/+1 counters"], gains: ["protection", "evasion", "mana value 1"], loses: ["haste", "tokens"] });
    expect(compareLines(near, 560)).toBe(2);
    const fit = fitCompare(near);
    expect(fit.gains).toEqual(["protection", "evasion"]);
    expect(compareLines(fit, 560)).toBe(1);
  });

  it("charges the gap between groups, and none after the last group", () => {
    // The narrowest width that holds a comparison on one line, to a hundredth of a pixel.
    const minWidth = (x: Compare) => {
      let lo = 0, hi = 2000;
      while (hi - lo > 0.01) { const mid = (lo + hi) / 2; if (compareLines(x, mid) <= 1) hi = mid; else lo = mid; }
      return hi;
    };
    // Two items a group: a comparison's first run is never tested against the width, so one alone measures 0.
    const kept = minWidth(c({ keeps: ["removal", "tokens"] }));
    const lost = minWidth(c({ loses: ["haste", "mill"] }));
    const both = minWidth(c({ keeps: ["removal", "tokens"], loses: ["haste", "mill"] }));
    // Between the groups: the 11px end margin plus the breaking space (13.83px), less the per-line slack the two
    // alone each count once more. A trailing margin on the last group would take another 11px off, to near 0.
    expect(both - kept - lost).toBeGreaterThan(8);
    expect(both - kept - lost).toBeLessThan(13.9);
  });

  it("leaves a comparison that already fits untouched", () => {
    const ok = c({ type: "sorcery", keeps: ["removal"], gains: ["mana value 1"], loses: [] });
    expect(fitCompare(ok)).toEqual(ok);
  });
});
