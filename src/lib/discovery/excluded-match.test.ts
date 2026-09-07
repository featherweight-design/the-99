import { describe, expect, it } from "vitest";
import type { NameMatchRow } from "./candidates";
import { classifyMatches } from "./excluded-match";

const row = (over: Partial<NameMatchRow> = {}): NameMatchRow => ({
  oracleId: "a",
  name: "Atraxa, Praetors' Voice",
  edhrecTotal: 100,
  tagTotal: 4,
  ownedSupport: 50,
  collectionSupport: 50,
  ...over,
});

const none = new Set<string>();

describe("classifyMatches", () => {
  it("names the scope first, whatever the sort would have made of the row", () => {
    // Below the floor as well as built: the outermost control is the one the
    // sentence names, and switching sort would not bring it back.
    const rows = [row({ ownedSupport: 0 })];
    expect(classifyMatches(rows, { sort: "new", builtOracleIds: new Set(["a"]) })).toEqual([
      { oracleId: "a", name: "Atraxa, Praetors' Voice", cause: "scope", pct: null },
    ]);
  });

  it("excludes nothing but the scope under fit", () => {
    const rows = [row({ ownedSupport: 0 }), row({ oracleId: "b", tagTotal: 0 })];
    expect(classifyMatches(rows, { sort: "fit", builtOracleIds: none })).toEqual([]);
  });

  it("says nothing about a row that is in the list", () => {
    // 50/100 clears the 30% floor, so it is on screen or a pip removed it —
    // either way the client can answer without asking.
    expect(classifyMatches([row()], { sort: "new", builtOracleIds: none })).toEqual([]);
  });

  it("reports the floor with the row's own percentage", () => {
    const rows = [row({ ownedSupport: 12, collectionSupport: 12 })];
    expect(classifyMatches(rows, { sort: "new", builtOracleIds: none })[0]).toMatchObject({
      cause: "floor",
      pct: 12,
    });
  });

  // The floor is decided on the collection, so a row short only on the narrowed
  // pool is in the list and has no sentence. There is no `pool` cause left to
  // name: the narrowed pool cannot remove a row.
  it("says nothing about a row short on the pool but clear on the collection", () => {
    const rows = [row({ ownedSupport: 12, collectionSupport: 40 })];
    expect(classifyMatches(rows, { sort: "new", builtOracleIds: none })).toEqual([]);
  });

  it("separates a row with nothing to measure from one measured and short", () => {
    const rows = [
      row({ oracleId: "a", tagTotal: 0, ownedSupport: 0 }),
      row({ oracleId: "b", edhrecTotal: null, ownedSupport: 0 }),
      row({ oracleId: "c", edhrecTotal: 0, ownedSupport: 0 }),
    ];
    const out = classifyMatches(rows, { sort: "new", builtOracleIds: none });
    expect(out.map((m) => m.cause)).toEqual(["unmeasured", "unmeasured", "unmeasured"]);
    expect(out.every((m) => m.pct === null)).toBe(true);
  });

  // `clearsFloor` is inclusive, and it is inclusive once: a row sitting exactly
  // on the floor is in the list, so it has no sentence.
  it("leaves a row sitting exactly on the floor to the list", () => {
    const rows = [row({ edhrecTotal: 70, ownedSupport: 21, collectionSupport: 21 })];
    expect(classifyMatches(rows, { sort: "new", builtOracleIds: none })).toEqual([]);
  });
});
