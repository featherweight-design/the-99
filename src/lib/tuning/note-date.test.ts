import { describe, expect, it } from "vitest";

import { noteDate, packYear } from "./note-date";

describe("noteDate", () => {
  it("draws the game log's locator, without the pack's own year", () => {
    expect(noteDate("2026-08-26T20:00:00.000Z", 2026)).toBe("26 Aug");
  });

  it("names the year when it is not the pack's", () => {
    expect(noteDate("2025-12-31T20:00:00.000Z", 2026)).toBe("31 Dec 2025");
  });
});

describe("packYear", () => {
  it("is the newest game's year", () => {
    expect(packYear([{ playedAt: "2025-12-31T20:00:00.000Z" }, { playedAt: "2026-01-02T20:00:00.000Z" }])).toBe(2026);
  });
});
