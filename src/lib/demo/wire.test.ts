import { describe, expect, it } from "vitest";

import { decodeDemo, encodeDemo } from "./wire";

describe("the demo's wire format", () => {
  it("round-trips Dates, Maps and Sets, nested in objects and arrays", () => {
    const data = {
      asOf: new Date("2026-11-08T07:41:00.000Z"),
      rankBySlug: new Map([["jace-multiverse-architect", 1], ["yshtola-nights-blessed", 2]]),
      locked: new Set(["sol-ring", "arcane-signet"]),
      rows: [{ at: new Date("2026-10-30T11:22:00.000Z"), nested: new Map([["a", new Set([1, 2])]]) }],
      plain: { n: 3, s: "x", b: true, z: null },
    };
    expect(decodeDemo(JSON.parse(JSON.stringify(encodeDemo(data))))).toEqual(data);
  });

  it("survives JSON, which Dates, Maps and Sets alone do not", () => {
    const back = JSON.parse(JSON.stringify({ m: new Map([["a", 1]]), s: new Set([1]), d: new Date(0) }));
    expect(back.m).toEqual({});
    expect(decodeDemo(JSON.parse(JSON.stringify(encodeDemo({ m: new Map([["a", 1]]), s: new Set([1]), d: new Date(0) }))))).toEqual({
      m: new Map([["a", 1]]), s: new Set([1]), d: new Date(0),
    });
  });

  it("drops undefined fields and writes an undefined element as null, as JSON does", () => {
    expect(encodeDemo({ a: 1, b: undefined, c: [undefined] })).toEqual({ a: 1, c: [null] });
  });

  it("refuses what it cannot keep: a function, a non-finite number, an invalid Date", () => {
    expect(() => encodeDemo({ f: () => 1 })).toThrow(/function/);
    expect(() => encodeDemo({ n: NaN })).toThrow(/non-finite/);
    expect(() => encodeDemo({ n: Infinity })).toThrow(/non-finite/);
    expect(() => encodeDemo({ d: new Date("nope") })).toThrow(/invalid Date/);
  });

  it("leaves an object whose only key looks like a tag but is not one alone", () => {
    expect(decodeDemo({ $date: 5 })).toEqual({ $date: 5 });
    expect(decodeDemo({ $map: "x" })).toEqual({ $map: "x" });
  });
});
