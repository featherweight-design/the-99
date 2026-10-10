import { describe, expect, it } from "vitest";
import { karstenLands, karstenSources, patternName } from "./karsten";

describe("karstenSources", () => {
  it("returns the published 99-card figure for every row of the article's table", () => {
    const table: [number, number, number][] = [
      [5, 1, 14], [4, 1, 15], [3, 1, 16], [2, 1, 18], [5, 2, 20], [1, 1, 19], [4, 2, 22], [0, 1, 19], [3, 2, 23], [4, 3, 26],
      [2, 2, 26], [3, 3, 28], [1, 2, 28], [2, 3, 30], [0, 2, 30], [1, 3, 33], [1, 4, 36], [0, 3, 36], [0, 4, 39],
    ];
    expect(table).toHaveLength(19);
    for (const [g, p, sources] of table) expect(karstenSources(g, p)).toEqual({ kind: "known", sources });
  });

  it("tells a generic count from a pip count: 2C is not CC", () => {
    expect(karstenSources(2, 1)).toEqual({ kind: "known", sources: 18 });
    expect(karstenSources(0, 2)).toEqual({ kind: "known", sources: 30 });
  });

  it("caps a pattern past the last published row for its pips at that row, and says it is a cap", () => {
    expect(karstenSources(6, 1)).toEqual({ kind: "atMost", sources: 14 });
    expect(karstenSources(13, 1)).toEqual({ kind: "atMost", sources: 14 });
    expect(karstenSources(6, 2)).toEqual({ kind: "atMost", sources: 20 });
    expect(karstenSources(5, 3)).toEqual({ kind: "atMost", sources: 26 });
    expect(karstenSources(2, 4)).toEqual({ kind: "atMost", sources: 36 });
  });

  it("is unknown where nothing is published: five or more pips, or no pips", () => {
    expect(karstenSources(0, 5)).toEqual({ kind: "unknown" });
    expect(karstenSources(3, 6)).toEqual({ kind: "unknown" });
    expect(karstenSources(4, 0)).toEqual({ kind: "unknown" });
  });
});

describe("patternName", () => {
  it("writes Karsten's notation", () => {
    expect([patternName(0, 1), patternName(3, 1), patternName(0, 2), patternName(1, 2), patternName(2, 3)]).toEqual(["C", "3C", "CC", "1CC", "2CCC"]);
  });
});

describe("karstenLands", () => {
  it("reproduces Deckcheck's Gishath figure from its inputs", () => {
    expect(karstenLands(4.34, 6)).toBeCloseTo(43.32, 2);
  });

  it("rises with average mana value and falls with cheap ramp", () => {
    expect(karstenLands(3.5, 4)).toBeGreaterThan(karstenLands(3.0, 4));
    expect(karstenLands(3.0, 10)).toBeLessThan(karstenLands(3.0, 4));
  });
});
