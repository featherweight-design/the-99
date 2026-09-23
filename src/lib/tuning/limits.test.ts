import { describe, expect, it } from "vitest";

import { intentTooLong, seededIntent } from "./limits";

describe("intentTooLong", () => {
  it("accepts an intent at the cap and refuses one over it", () => {
    expect(intentTooLong("a".repeat(120))).toBe(false);
    expect(intentTooLong("a".repeat(121))).toBe(true);
    expect(intentTooLong("")).toBe(false);
  });

  it("counts code points, as the column does", () => {
    // 120 emoji are 240 UTF-16 units and 120 code points: the column stores them.
    expect(intentTooLong("🂡".repeat(120))).toBe(false);
    expect(intentTooLong("🂡".repeat(121))).toBe(true);
  });
});

describe("seededIntent", () => {
  it("names the commander in the whole sentence when it fits", () => {
    expect(seededIntent(["Gisa, Glorious Resurrector"])).toBe(
      "Built around Gisa, Glorious Resurrector, from the cards you own.",
    );
  });

  it("names a pair as a pair", () => {
    expect(seededIntent(["Tymna the Weaver", "Thrasios, Triton Hero"])).toContain(
      "Tymna the Weaver and Thrasios, Triton Hero",
    );
  });

  // The catalog's longest names run past 60 characters, and a pair of them is past the cap.
  it("never returns more than the cap, counting code points, however long the names", () => {
    const long = "Asmoranomardicadaistinaculdacar ".repeat(3).trim();
    for (const names of [[long], [long, long], ["\u{1F600}".repeat(200)]]) {
      const intent = seededIntent(names);
      expect(intentTooLong(intent)).toBe(false);
      expect(intent.startsWith("Built around ")).toBe(true);
    }
    expect(seededIntent([long, long]).endsWith("….")).toBe(true);
  });
});
