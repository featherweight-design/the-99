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
  it("names the built cause first, whatever the sort would have made of the row", () => {
    // Below the floor as well as built: the outermost control is the one the
    // sentence names, and switching sort would not bring it back.
    const rows = [row({ ownedSupport: 0 })];
    expect(classifyMatches(rows, { sort: "new", builtOracleIds: new Set(["a"]), hiddenOracleIds: none })).toEqual([
      { oracleId: "a", name: "Atraxa, Praetors' Voice", cause: "built", pct: null },
    ]);
  });

  it("excludes nothing but built commanders under fit", () => {
    const rows = [row({ ownedSupport: 0 }), row({ oracleId: "b", tagTotal: 0 })];
    expect(classifyMatches(rows, { sort: "fit", builtOracleIds: none, hiddenOracleIds: none })).toEqual([]);
  });

  it("says nothing about a row that is in the list", () => {
    // 50/100 clears the 30% floor, so it is on screen or a pip removed it —
    // either way the client can answer without asking.
    expect(classifyMatches([row()], { sort: "new", builtOracleIds: none, hiddenOracleIds: none })).toEqual([]);
  });

  it("reports the floor with the row's own percentage", () => {
    const rows = [row({ ownedSupport: 12, collectionSupport: 12 })];
    expect(classifyMatches(rows, { sort: "new", builtOracleIds: none, hiddenOracleIds: none })[0]).toMatchObject({
      cause: "floor",
      pct: 12,
    });
  });

  // The floor is decided on the collection, so a row short only on the narrowed
  // pool is in the list and has no sentence. There is no `pool` cause left to
  // name: the narrowed pool cannot remove a row.
  it("says nothing about a row short on the pool but clear on the collection", () => {
    const rows = [row({ ownedSupport: 12, collectionSupport: 40 })];
    expect(classifyMatches(rows, { sort: "new", builtOracleIds: none, hiddenOracleIds: none })).toEqual([]);
  });

  it("separates a row with nothing to measure from one measured and short", () => {
    const rows = [
      row({ oracleId: "a", tagTotal: 0, ownedSupport: 0 }),
      row({ oracleId: "b", edhrecTotal: null, ownedSupport: 0 }),
      row({ oracleId: "c", edhrecTotal: 0, ownedSupport: 0 }),
    ];
    const out = classifyMatches(rows, { sort: "new", builtOracleIds: none, hiddenOracleIds: none });
    expect(out.map((m) => m.cause)).toEqual(["unmeasured", "unmeasured", "unmeasured"]);
    expect(out.every((m) => m.pct === null)).toBe(true);
  });

  // The player's own hide (hide a commander, README §4): the server removed it, so only the server
  // can say it is there.
  it("reports a hidden match under fit, where nothing else is excluded", () => {
    expect(
      classifyMatches([row()], { sort: "fit", builtOracleIds: none, hiddenOracleIds: new Set(["a"]) }),
    ).toEqual([{ oracleId: "a", name: "Atraxa, Praetors' Voice", cause: "hidden", pct: null }]);
  });

  it("names the hide over the floor and the unmeasurable", () => {
    const rows = [
      row({ oracleId: "a", ownedSupport: 0, collectionSupport: 0 }),
      row({ oracleId: "b", tagTotal: 0 }),
    ];
    const out = classifyMatches(rows, { sort: "new", builtOracleIds: none, hiddenOracleIds: new Set(["a", "b"]) });
    expect(out.map((m) => [m.oracleId, m.cause])).toEqual([["a", "hidden"], ["b", "hidden"]]);
  });

  // No list would draw a built commander unhidden, so "you hid it" would name a control that does
  // not bring it back.
  it("names built over hidden", () => {
    const ids = new Set(["a"]);
    expect(
      classifyMatches([row()], { sort: "fit", builtOracleIds: ids, hiddenOracleIds: ids })[0].cause,
    ).toBe("built");
  });

  // `clearsFloor` is inclusive, and it is inclusive once: a row sitting exactly
  // on the floor is in the list, so it has no sentence.
  it("leaves a row sitting exactly on the floor to the list", () => {
    const rows = [row({ edhrecTotal: 70, ownedSupport: 21, collectionSupport: 21 })];
    expect(classifyMatches(rows, { sort: "new", builtOracleIds: none, hiddenOracleIds: none })).toEqual([]);
  });
});
