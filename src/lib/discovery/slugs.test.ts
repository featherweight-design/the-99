import { describe, expect, it } from "vitest";
import { assignDiscoverySlugs } from "./slugs";

const rows = [
  { oracleId: "ffff", name: "Kenrith, the Returned King" },
  { oracleId: "0000", name: "Kenrith, the Returned King" },
  { oracleId: "aaaa", name: "Atraxa, Praetors' Voice" },
];

describe("assignDiscoverySlugs", () => {
  it("suffixes duplicates by oracle id, not by position", () => {
    const a = assignDiscoverySlugs(rows).map((r) => `${r.oracleId}:${r.slug}`);
    const b = assignDiscoverySlugs([...rows].reverse()).map((r) => `${r.oracleId}:${r.slug}`);
    expect(new Set(a)).toEqual(new Set(b));
  });

  it("gives the lowest oracle id the unsuffixed slug", () => {
    const got = assignDiscoverySlugs(rows);
    expect(got.find((r) => r.oracleId === "0000")!.slug)
      .toBe("kenrith-the-returned-king");
    expect(got.find((r) => r.oracleId === "ffff")!.slug)
      .toBe("kenrith-the-returned-king-2");
  });

  it("leaves a unique name unsuffixed", () => {
    expect(assignDiscoverySlugs(rows).find((r) => r.oracleId === "aaaa")!.slug)
      .toBe("atraxa-praetors-voice");
  });
});
