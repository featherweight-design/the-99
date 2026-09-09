import { describe, expect, it } from "vitest";
import { fromFreeDelta, toFreeDelta } from "./free-delta";
import type { CommanderListItem } from "./recommend";

function item(over: Partial<CommanderListItem>): CommanderListItem {
  return {
    oracleId: "a",
    slug: "a",
    name: "A",
    typeLine: "Legendary Creature",
    colorIdentity: ["G"],
    colorPoolSize: 100,
    roleCounts: { ramp: 1, draw: 1, removal: 1, wipes: 1 },
    edhrecOwnedCount: 10,
    edhrecTotal: 100,
    receipts: "10 of 100",
    fitPool: 20,
    fitRoles: 20,
    fitSynergy: 20,
    synergyState: "ok",
    score: 60,
    rankScore: 60,
    measurableTotal: 100,
    imageUri: "https://cards.example/a.jpg",
    artCropUri: null,
    ...over,
  };
}

describe("free ranking delta", () => {
  const canonical = [
    item({ oracleId: "a", slug: "a", score: 60 }),
    item({ oracleId: "b", slug: "b", score: 50 }),
  ];

  it("round-trips the free ranking", () => {
    const free = [
      item({ oracleId: "b", slug: "b", score: 50 }),
      item({ oracleId: "a", slug: "a", score: 30, receipts: "2 of 100" }),
    ];
    const delta = toFreeDelta(canonical, free);
    expect(delta).not.toBeNull();
    expect(fromFreeDelta(canonical, delta!)).toEqual(free);
  });

  // The saving is the point: a row that scores the same in both pools carries
  // no fields at all, and one that moved carries only what moved — never its
  // name, slug or image URL a second time.
  it("carries only the fields that moved", () => {
    const free = [
      item({ oracleId: "b", slug: "b", score: 50 }),
      item({ oracleId: "a", slug: "a", score: 30 }),
    ];
    const delta = toFreeDelta(canonical, free)!;
    expect(delta.order).toEqual([1, 0]);
    expect(delta.changes[0]).toBeNull();
    expect(delta.changes[1]).toEqual({ score: 30 });
  });

  // Same fail-closed answer `rankFree` gives for the same divergence: a list
  // one row short is worse than no second ranking at all.
  it("refuses a free list naming a commander canonical does not", () => {
    expect(toFreeDelta(canonical, [item({ oracleId: "c", slug: "c" })])).toBeNull();
  });
});
