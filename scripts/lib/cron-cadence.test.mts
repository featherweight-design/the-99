// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALLOWLIST, expandField, MIN_GAP_MINUTES, minGapMinutes, tooFrequent } from "./cron-cadence.mjs";

describe("minGapMinutes", () => {
  it.each([
    ["*/5 * * * *", 5], ["*/30 * * * *", 30], ["*/15 * * * *", 15], ["17 * * * *", 60], ["0,10 * * * *", 10],
    ["0 9 * * *", 1440], ["0 9 * * 1", 10080], ["* * * * *", 1], ["0-10/2 * * * *", 2], ["0 0,12 * * *", 720],
    ["30 4 1 * *", 29 * 1440],
  ])("%s runs every %s minutes at its closest", (expr, gap) => {
    expect(minGapMinutes(expr)).toBe(gap);
  });
  it("rejects what it cannot read", () => {
    expect(() => minGapMinutes("*/5 * * *")).toThrow();
    expect(() => expandField("*/0", [0, 59])).toThrow();
    expect(() => expandField("61", [0, 59])).toThrow();
    expect(() => expandField("a", [0, 59])).toThrow();
  });
});

describe("tooFrequent", () => {
  const cfg = (...s: string[]) => ({ crons: s.map((schedule, i) => ({ path: `/c${i}`, schedule })) });
  it("flags a cron under the floor", () => {
    expect(tooFrequent(cfg("*/5 * * * *", "*/15 * * * *")).map((c) => c.path)).toEqual(["/c0"]);
  });
  it("lets an allowlisted path through, and only that path", () => {
    expect(tooFrequent(cfg("*/5 * * * *", "*/5 * * * *"), [{ path: "/c0", reason: "x" }]).map((c) => c.path)).toEqual(["/c1"]);
  });
  it("handles no crons", () => {
    expect(tooFrequent({})).toEqual([]);
  });
});

describe("the shipped vercel.json", () => {
  it(`runs no cron more often than every ${MIN_GAP_MINUTES} minutes without an allowlist reason`, () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8"));
    expect(tooFrequent(config)).toEqual([]);
  });
  it("keeps a reason on every allowlist entry", () => {
    for (const a of ALLOWLIST) expect(a.reason.length).toBeGreaterThan(10);
  });
});
