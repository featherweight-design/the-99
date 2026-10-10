import { describe, expect, it } from "vitest";
import { diffGolden } from "./mana-golden.mjs";

const golden = () => ({
  state: "ok",
  lands: { count: 36, karstenLands: 43.3 },
  colors: { G: { pipsWith: 56, lands: ["Forest", "Forest", "Island"], order: "1CC 2C", patterns: { "1CC": { copies: 2, karsten: "known 28", cards: ["A", "B"] } } } },
});

describe("diffGolden", () => {
  it("is empty for identical output", () => expect(diffGolden(golden(), golden())).toEqual([]));

  it("names a changed figure by its path", () => {
    const a = golden();
    a.colors.G.pipsWith = 57;
    a.lands.karstenLands = 42.1;
    expect(diffGolden(golden(), a)).toEqual(["lands.karstenLands: expected 43.3, got 42.1", "colors.G.pipsWith: expected 56, got 57"]);
  });

  it("names the card that moved, one copy more or less included", () => {
    const a = golden();
    a.colors.G.lands = ["Forest", "Forest", "Forest", "Island"];
    expect(diffGolden(golden(), a)).toEqual(["colors.G.lands: expected 3, got 4; extra Forest"]);
  });

  it("names a swap between copies of cards the list already holds, at an unchanged count", () => {
    const a = golden();
    a.colors.G.lands = ["Forest", "Island", "Island"];
    expect(diffGolden(golden(), a)).toEqual(["colors.G.lands: expected 3, got 3; missing Forest; extra Island"]);
  });

  it("catches a changed pattern figure, a changed card list, and a pattern that appeared or vanished", () => {
    const a = golden();
    a.colors.G.patterns["1CC"].karsten = "unknown";
    a.colors.G.patterns["1CC"].cards = ["A", "C"];
    (a.colors.G.patterns as Record<string, unknown>)["CC"] = { copies: 1, karsten: "known 30", cards: ["D"] };
    expect(diffGolden(golden(), a)).toEqual([
      'colors.G.patterns.1CC.karsten: expected "known 28", got "unknown"',
      "colors.G.patterns.1CC.cards: expected 2, got 2; missing B; extra C",
      'colors.G.patterns.CC: not expected, got {"copies":1,"karsten":"known 30","cards":["D"]}',
    ]);
  });

  it("catches a reordered pattern list", () => {
    const a = golden();
    a.colors.G.order = "2C 1CC";
    expect(diffGolden(golden(), a)).toEqual(['colors.G.order: expected "1CC 2C", got "2C 1CC"']);
  });
});
