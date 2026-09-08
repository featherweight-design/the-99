import { describe, expect, it } from "vitest";
import { nearestFix } from "./nearest-fix";

describe("nearestFix", () => {
  it("names the control whose removal returns the most rows", () => {
    expect(
      nearestFix([
        { control: "Red", rows: 3, changedAt: 2 },
        { control: "Exactly these", rows: 9, changedAt: 1 },
      ])?.control,
    ).toBe("Exactly these");
  });

  it("breaks a tie toward the most recently changed control", () => {
    expect(
      nearestFix([
        { control: "Red", rows: 3, changedAt: 1 },
        { control: "Free cards only", rows: 3, changedAt: 2 },
      ])?.control,
    ).toBe("Free cards only");
  });

  it("returns null when no single control returns a row", () => {
    expect(
      nearestFix([
        { control: "Red", rows: 0, changedAt: 1 },
        { control: "Exactly these", rows: 0, changedAt: 2 },
      ]),
    ).toBeNull();
  });

  it("returns null when there is nothing to drop", () => {
    expect(nearestFix([])).toBeNull();
  });
});
