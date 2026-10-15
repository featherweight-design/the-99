import { describe, expect, it } from "vitest";
import { addedByKey, addedFor, fileArrival, handArrival, restoredAdded } from "./added-at";

const NOW = new Date("2026-10-15T12:00:00Z");
const EARLIER = new Date("2026-09-02T12:00:00Z");
const key = { oracleId: "0000aaaa-0000-4000-8000-000000000001", setCode: "c21", collectorNumber: "263", finish: "nonfoil" as const };

describe("when a holding arrived", () => {
  it("a hand change arrives exactly, always", () => {
    expect(addedFor(undefined, handArrival(NOW))).toEqual({ addedAt: NOW, addedExact: true });
  });

  it("a file arrives exactly only into a collection that had content", () => {
    expect(addedFor(undefined, fileArrival(NOW, true))).toEqual({ addedAt: NOW, addedExact: true });
    expect(addedFor(undefined, fileArrival(NOW, false))).toEqual({ addedAt: NOW, addedExact: false });
  });

  it("a holding already held keeps its date and its exactness through any write", () => {
    const held = { addedAt: EARLIER, addedExact: false };
    expect(addedFor(held, handArrival(NOW))).toBe(held);
    expect(addedFor(held, fileArrival(NOW, true))).toBe(held);
  });

  it("a held row nothing could date stays undated rather than taking today", () => {
    expect(addedFor({ addedAt: null, addedExact: false }, handArrival(NOW))).toEqual({ addedAt: null, addedExact: false });
  });
});

describe("a revert", () => {
  it("puts back the date its entry recorded, exactness included", () => {
    expect(restoredAdded({ addedAt: EARLIER.toISOString(), addedExact: true }, handArrival(NOW))).toEqual({ addedAt: EARLIER, addedExact: true });
    expect(restoredAdded({ addedAt: EARLIER.toISOString(), addedExact: false }, handArrival(NOW))).toEqual({ addedAt: EARLIER, addedExact: false });
  });

  it("dates a row its entry did not date as an arrival now (an entry from before the column)", () => {
    expect(restoredAdded({}, handArrival(NOW))).toEqual({ addedAt: NOW, addedExact: true });
    expect(restoredAdded(null, fileArrival(NOW, false))).toEqual({ addedAt: NOW, addedExact: false });
    // A recorded null is "unknown then", which is not a date to put back.
    expect(restoredAdded({ addedAt: null }, handArrival(NOW))).toEqual({ addedAt: NOW, addedExact: true });
  });
});

describe("addedByKey", () => {
  it("reads the rows a write found, keyed by holding", () => {
    const map = addedByKey([{ ...key, addedAt: EARLIER, addedExact: true }]);
    expect([...map.values()]).toEqual([{ addedAt: EARLIER, addedExact: true }]);
    expect(map.size).toBe(1);
  });
});
