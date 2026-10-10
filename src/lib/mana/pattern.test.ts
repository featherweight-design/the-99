import { describe, expect, it } from "vitest";
import { costPatterns, manaValueOf } from "./pattern";

describe("manaValueOf", () => {
  it("adds generic, counts each colored symbol once, and reads X as 0", () => {
    expect(manaValueOf("{3}{G}{G}")).toBe(5);
    expect(manaValueOf("{X}{R}{R}")).toBe(2);
    expect(manaValueOf("{5}{R}{G}{W}")).toBe(8);
    expect(manaValueOf(null)).toBe(0);
  });

  it("reads {2/W} as 2 and a Phyrexian pip as 1", () => {
    expect(manaValueOf("{2/W}{2/W}")).toBe(4);
    expect(manaValueOf("{3}{U/P}")).toBe(4);
    expect(manaValueOf("{C}{C}")).toBe(2);
  });
});

describe("costPatterns", () => {
  it("gives each color its pips and the rest of the cost as generic mana", () => {
    expect(costPatterns("{3}{G}{G}")).toEqual({ G: { generic: 3, pips: 2 } });
    expect(costPatterns("{2}{R}{G}")).toEqual({ R: { generic: 3, pips: 1 }, G: { generic: 3, pips: 1 } });
  });

  it("treats another color's pip as generic for this one", () => {
    expect(costPatterns("{W}{W}{U}")).toEqual({ W: { generic: 1, pips: 2 }, U: { generic: 2, pips: 1 } });
  });

  it("counts a hybrid pip for each half", () => {
    expect(costPatterns("{1}{G/U}{G/U}")).toEqual({ G: { generic: 1, pips: 2 }, U: { generic: 1, pips: 2 } });
  });

  it("gives a Phyrexian or {2/W} pip no color", () => {
    expect(costPatterns("{3}{U/P}")).toEqual({});
    expect(costPatterns("{2/W}{2/W}{W}")).toEqual({ W: { generic: 4, pips: 1 } });
  });

  it("is empty for a land, a free card and a colorless cost", () => {
    expect(costPatterns(null)).toEqual({});
    expect(costPatterns("{4}")).toEqual({});
    expect(costPatterns("{C}{C}")).toEqual({});
  });
});
