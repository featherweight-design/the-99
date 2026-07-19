import { describe, expect, it } from "vitest";
import { receiptsPreview, fitSegments } from "./format";

describe("receiptsPreview", () => {
  it("returns empty string for empty array", () => {
    expect(receiptsPreview([])).toBe("");
  });

  it("returns single name with no suffix", () => {
    expect(receiptsPreview(["Dockside Extortionist"])).toBe(
      "Dockside Extortionist",
    );
  });

  it("returns two names with no suffix", () => {
    expect(receiptsPreview(["Dockside Extortionist", "Pitiless Plunderer"])).toBe(
      "Dockside Extortionist · Pitiless Plunderer",
    );
  });

  it("exact-3 (max) returns no suffix", () => {
    expect(
      receiptsPreview([
        "Dockside Extortionist",
        "Pitiless Plunderer",
        "Mayhem Devil",
      ]),
    ).toBe("Dockside Extortionist · Pitiless Plunderer · Mayhem Devil");
  });

  it("4 items returns +1 overflow suffix", () => {
    const result = receiptsPreview([
      "Dockside Extortionist",
      "Pitiless Plunderer",
      "Mayhem Devil",
      "Treasure Map",
    ]);
    expect(result).toBe(
      "Dockside Extortionist · Pitiless Plunderer · Mayhem Devil +1",
    );
  });

  it("many items returns correct +N overflow", () => {
    const names = Array.from({ length: 28 }, (_, i) => `Card ${i + 1}`);
    const result = receiptsPreview(names);
    expect(result).toMatch(/\+25$/);
    expect(result).toContain("Card 1 · Card 2 · Card 3 +25");
  });

  it("custom max=2: 3 items yields +1 suffix", () => {
    const result = receiptsPreview(["A", "B", "C"], 2);
    expect(result).toBe("A · B +1");
  });

  it("custom max=1: 1 item, no suffix", () => {
    expect(receiptsPreview(["A"], 1)).toBe("A");
  });

  it("custom max=1: 2 items yields +1 suffix", () => {
    expect(receiptsPreview(["A", "B"], 1)).toBe("A +1");
  });
});

describe("fitSegments", () => {
  it("returns pct clamped to 100 when score > 100", () => {
    const result = fitSegments({
      fitPool: 15,
      fitRoles: 25,
      fitSynergy: 60,
      score: 105,
    });
    expect(result.pct).toBe(100);
  });

  it("returns pct = score when score <= 100", () => {
    const result = fitSegments({
      fitPool: 10,
      fitRoles: 20,
      fitSynergy: 40,
      score: 70,
    });
    expect(result.pct).toBe(70);
  });

  it("returns 3 segments when fitSynergy is non-null", () => {
    const result = fitSegments({
      fitPool: 10,
      fitRoles: 20,
      fitSynergy: 40,
      score: 70,
    });
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0]).toEqual({ key: "pool", grow: 10 });
    expect(result.segments[1]).toEqual({ key: "roles", grow: 20 });
    expect(result.segments[2]).toEqual({ key: "synergy", grow: 40 });
  });

  it("omits synergy segment when fitSynergy is null", () => {
    const result = fitSegments({
      fitPool: 10,
      fitRoles: 20,
      fitSynergy: null,
      score: 75,
    });
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual({ key: "pool", grow: 10 });
    expect(result.segments[1]).toEqual({ key: "roles", grow: 20 });
  });

  it("handles zero score", () => {
    const result = fitSegments({
      fitPool: 0,
      fitRoles: 0,
      fitSynergy: null,
      score: 0,
    });
    expect(result.pct).toBe(0);
    expect(result.segments).toHaveLength(2);
  });

  it("grow values are the raw component values (flex-grow ratios)", () => {
    const result = fitSegments({
      fitPool: 5,
      fitRoles: 15,
      fitSynergy: 30,
      score: 50,
    });
    expect(result.segments[0].grow).toBe(5);
    expect(result.segments[1].grow).toBe(15);
    expect(result.segments[2].grow).toBe(30);
  });
});
