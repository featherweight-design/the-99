import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { switchBits } from "../switches/resolve";
import { spendTourWrite, tourDue } from "./tour";

const e = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

describe("tourDue", () => {
  const on = e({ FIRST_RUN_TOUR_ENABLED: "true" });
  const seen = new Date("2026-10-16T00:00:00Z");

  it("is due on a first-run Home with the switch on and the tour never spent", () => {
    expect(tourDue(on, true, null)).toBe(true);
  });

  it("is never due with the switch off, past first run, or once spent", () => {
    expect(tourDue(e({}), true, null)).toBe(false);
    expect(tourDue(e({ FIRST_RUN_TOUR_ENABLED: "off" }), true, null)).toBe(false);
    expect(tourDue(on, false, null)).toBe(false);
    expect(tourDue(on, true, seen)).toBe(false);
  });

  it("is decided from a switch Home's cache key carries, so flipping it for the reader retires the cached payload", () => {
    expect(switchBits(on)).not.toBe(switchBits(e({})));
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
