import { describe, expect, it } from "vitest";
import { decksStatsCopy } from "./decks-stats";

describe("decksStatsCopy.worth.age", () => {
  it("rounds before it picks a unit, so a figure never prints the next unit's threshold", () => {
    const age = decksStatsCopy.worth.age;
    expect([age(0.2), age(59.4), age(59.6), age(130), age(47.4 * 60), age(47.6 * 60), age(37 * 1440)]).toEqual(["1m ago", "59m ago", "1h ago", "2h ago", "47h ago", "2d ago", "37d ago"]);
  });
});
