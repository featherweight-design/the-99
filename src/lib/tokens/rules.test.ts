import { describe, expect, it } from "vitest";
import { collidingTokenIds, sameFace, sortMakers, tokenKey, tokenState } from "./rules";

const face = (name: string, colors: string[], power: string | null, toughness: string | null) =>
  ({ name, colors, power, toughness });

describe("tokenKey / sameFace", () => {
  it("ignores the order colors arrive in", () => {
    expect(tokenKey(face("Elemental", ["R", "G"], "5", "5"))).toBe(tokenKey(face("Elemental", ["G", "R"], "5", "5")));
  });
  it("tells a name apart by colors and by P/T", () => {
    expect(sameFace(face("Soldier", ["W"], "1", "1"), face("Soldier", ["R"], "1", "1"))).toBe(false);
    expect(sameFace(face("Soldier", ["W"], "1", "1"), face("Soldier", ["W"], "2", "2"))).toBe(false);
    expect(sameFace(face("Soldier", ["W"], "1", "1"), face("Soldier", ["W"], "1", "1"))).toBe(true);
  });
  it("keeps a star power distinct from none", () => {
    expect(sameFace(face("Food", [], null, null), face("Food", [], "*", "*"))).toBe(false);
  });
});

describe("collidingTokenIds", () => {
  const a = { oracleId: "a", ...face("Goblin", ["R"], "1", "1") };
  const b = { oracleId: "b", ...face("Goblin", ["R"], "1", "1") };
  const c = { oracleId: "c", ...face("Goblin", ["R"], "2", "2") };
  it("names only the tokens that share a face inside the deck", () => {
    expect([...collidingTokenIds([a, b, c])].sort()).toEqual(["a", "b"]);
  });
  it("is empty when every face is its own", () => {
    expect(collidingTokenIds([a, c]).size).toBe(0);
  });
});

describe("tokenState", () => {
  it("is owned whenever held, whatever the marker says, and keeps the source", () => {
    expect(tokenState("manual", false)).toEqual({ state: "owned", source: "manual" });
    expect(tokenState("upload", true)).toEqual({ state: "owned", source: "upload" });
  });
  it("is not owned only after a read, and not known before one", () => {
    expect(tokenState(null, true)).toEqual({ state: "not", source: null });
    expect(tokenState(null, false)).toEqual({ state: "unknown", source: null });
  });
});

describe("sortMakers", () => {
  it("is A to Z without regard to case, stable on the id", () => {
    const out = sortMakers([
      { name: "zeta", oracleId: "1" }, { name: "Alpha", oracleId: "3" }, { name: "alpha", oracleId: "2" },
    ]);
    expect(out.map((m) => m.oracleId)).toEqual(["2", "3", "1"]);
  });
});
