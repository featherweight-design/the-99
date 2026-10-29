import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { spendTourWrite, tourDue } from "./tour";

describe("tourDue", () => {
  const seen = new Date("2026-10-16T00:00:00Z");

  it("is due on a first-run Home with the tour never spent", () => {
    expect(tourDue(true, null)).toBe(true);
  });

  it("is never due past first run, or once spent", () => {
    expect(tourDue(false, null)).toBe(false);
    expect(tourDue(true, seen)).toBe(false);
  });
});

describe("spendTourWrite", () => {
  const { sql, params } = spendTourWrite("user_1", db).toSQL();

  it("stamps the reader's row with the time of the spend", () => {
    expect(sql).toContain(`on conflict ("user_id") do update set "tour_seen_at" = now()`);
    expect(params).toContain("user_1");
  });

  it("updates only while the stamp is null, so taking the tour again moves no stamp", () => {
    expect(sql).toMatch(/ where "user_prefs"\."tour_seen_at" is null returning /);
  });

  it("returns a row only from the write that took the tour, so a second tab's claim comes back empty", () => {
    expect(sql).toMatch(/ returning "tour_seen_at"$/);
  });
});
