import { describe, expect, it } from "vitest";
import { MOMENTS } from "../moments/registry";
import { TARGETS, isTargetId } from "./targets";

describe("the target registry", () => {
  it("holds every moment, the one tool with no moment and the tour's seven stops, once each", () => {
    expect(TARGETS.slice(0, MOMENTS.length)).toEqual(MOMENTS.map((m) => m.id));
    expect(TARGETS.slice(MOMENTS.length)).toEqual([
      "friends",
      "tour:step-one",
      "tour:collection",
      "tour:commanders",
      "tour:decks",
      "tour:account",
      "tour:banner",
      "tour:friends",
    ]);
    expect(new Set(TARGETS).size).toBe(TARGETS.length);
  });

  it("knows its own ids and nothing else", () => {
    expect(isTargetId("top-off")).toBe(true);
    expect(isTargetId("tour:banner")).toBe(true);
    expect(isTargetId("tour:nope")).toBe(false);
    expect(isTargetId(undefined)).toBe(false);
  });
});
