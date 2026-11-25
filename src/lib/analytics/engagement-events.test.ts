// The core action events' guard (engagement tracking, PR 1): every string value a member of its property's closed set,
// no prop typed as a bare string, and the per-session ceiling covering every event.
import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT_EVENT_VALUES,
  ENGAGEMENT_SEND_CEILING,
  IMPORT_SIZE_BUCKET,
  importSizeBucket,
  type EngagementEvents,
} from "./engagement-events";

/** The events whose props admit any string: `never` while every prop is a closed set. */
type OpenProp = {
  [E in keyof EngagementEvents]: { [P in keyof EngagementEvents[E]]: string extends EngagementEvents[E][P] ? E : never }[keyof EngagementEvents[E]];
}[keyof EngagementEvents];
// Fails typecheck the day a prop widens to `string`.
const noOpenProps: [OpenProp] extends [never] ? true : false = true;

describe("core action events", () => {
  it("types no prop as a bare string", () => {
    expect(noOpenProps).toBe(true);
  });

  it("names every event in the closed-set table and the ceiling table, and no other", () => {
    const names = Object.keys(ENGAGEMENT_EVENT_VALUES).sort();
    expect(Object.keys(ENGAGEMENT_SEND_CEILING).sort()).toEqual(names);
  });

  it("carries no property that could hold a name, an id or an amount", () => {
    const banned = /name|email|id$|user|amount|balance|plan|count|query|text/i;
    for (const sets of Object.values(ENGAGEMENT_EVENT_VALUES)) {
      for (const key of Object.keys(sets)) expect(key).not.toMatch(banned);
    }
  });

  it("every closed-set value is a short lowercase token", () => {
    for (const sets of Object.values(ENGAGEMENT_EVENT_VALUES)) {
      for (const values of Object.values(sets as Record<string, readonly string[]>)) {
        for (const v of values) expect(v).toMatch(/^[a-z0-9_]{1,16}$/);
      }
    }
  });

  it("every ceiling is a small positive whole number", () => {
    for (const n of Object.values(ENGAGEMENT_SEND_CEILING)) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it("buckets an import's size at its edges and never sends the count", () => {
    expect([1, 10, 11, 100, 101, 1000, 1001, 50000].map(importSizeBucket)).toEqual([
      "1_to_10", "1_to_10", "11_to_100", "11_to_100", "101_to_1000", "101_to_1000", "1001_plus", "1001_plus",
    ]);
    for (const n of [1, 500, 99999]) expect(IMPORT_SIZE_BUCKET).toContain(importSizeBucket(n));
  });
});
