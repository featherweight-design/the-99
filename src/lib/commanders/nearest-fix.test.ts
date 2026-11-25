import { describe, expect, it } from "vitest";
import { nearestFix } from "./nearest-fix";
import { commandersCopy } from "../copy/lanes";
import { filterCopy } from "../copy/lanes";

describe("nearestFix", () => {
  it("names the control whose removal returns the most rows", () => {
    expect(
      nearestFix([
        { control: "Red", rows: 3, changedAt: 2 },
        { control: filterCopy.match.exactly, rows: 9, changedAt: 1 },
      ])?.control,
    ).toBe(filterCopy.match.exactly);
  });

  it("breaks a tie toward the most recently changed control", () => {
    expect(
      nearestFix([
        { control: "Red", rows: 3, changedAt: 1 },
        { control: commandersCopy.availability.free, rows: 3, changedAt: 2 },
      ])?.control,
    ).toBe(commandersCopy.availability.free);
  });

  it("returns null when no single control returns a row", () => {
    expect(
      nearestFix([
        { control: "Red", rows: 0, changedAt: 1 },
        { control: filterCopy.match.exactly, rows: 0, changedAt: 2 },
      ]),
    ).toBeNull();
  });

  it("returns null when there is nothing to drop", () => {
    expect(nearestFix([])).toBeNull();
  });
});
