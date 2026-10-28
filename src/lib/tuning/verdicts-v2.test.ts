import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { appliesOneByOne } from "./verdicts";

// Plan P3: per-card apply is v10's alone. A line of a run still being made is not the player's yet, and a v2 line is
// applied with its picked set (PR 4): one line alone would move the deck off 99.
describe("appliesOneByOne", () => {
  it("allows only a finished v10 run's item", () => {
    expect(appliesOneByOne({ status: "ok", requestedCount: null })).toBe(true);
    expect(appliesOneByOne({ status: "pending", requestedCount: null })).toBe(false);
    expect(appliesOneByOne({ status: "ok", requestedCount: 5 })).toBe(false);
    expect(appliesOneByOne({ status: "pending", requestedCount: 5 })).toBe(false);
    expect(appliesOneByOne({ status: "failed", requestedCount: null })).toBe(false);
  });
});
