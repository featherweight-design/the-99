import { describe, expect, it } from "vitest";
import { allocateClaims } from "./allocate";
import type { Availability } from "./availability";

// One owned copy of Sol Ring, the staging case the all-decks cart is drawn around: committed
// decks hold their copies by seniority, brews want one each, and the player may now give a copy
// to a brew (Hugh's answer 2, 2026-10-11).
const committed = (id: string, since: number, granted = 0) =>
  ({ id, name: id, quantity: 1, mature: true, since, granted }) as Availability["claims"][number];
const brew = (id: string, granted = 0) =>
  ({ id, name: id, quantity: 1, mature: false, since: null, granted }) as Availability["claims"][number];

const byId = (owned: number, claims: Availability["claims"]) =>
  new Map(allocateClaims({ owned, claims }).map((c) => [c.deckId, c.allocated]));

describe("allocateClaims — brews (2026-10-11)", () => {
  it("lists brews, last, behind every committed deck", () => {
    const order = allocateClaims({ owned: 1, claims: [brew("b2"), committed("c", 5), brew("b1")] })
      .map((c) => c.deckId);
    expect(order).toEqual(["c", "b1", "b2"]);
  });

  it("gives a brew nothing while a committed deck holds the only copy", () => {
    const a = byId(1, [committed("c", 5), brew("b")]);
    expect(a.get("c")).toBe(1);
    expect(a.get("b")).toBe(0);
  });

  it("lets brews read the same leftover without taking it from one another (soft)", () => {
    const a = byId(2, [committed("c", 5), brew("b1"), brew("b2")]);
    expect(a.get("c")).toBe(1);
    expect(a.get("b1")).toBe(1);
    expect(a.get("b2")).toBe(1);
  });

  it("a copy given to a brew comes off the top, ahead of seniority", () => {
    const a = byId(1, [committed("c", 5), brew("b", 1)]);
    expect(a.get("b")).toBe(1);
    expect(a.get("c")).toBe(0);
  });
});

describe("committedShortfalls", () => {
  it("names committed decks only, never a brew's soft ask", async () => {
    const { committedShortfalls } = await import("../collection/write");
    const out = committedShortfalls({ owned: 1, claims: [committed("c", 5), brew("b")] });
    expect([...out.keys()]).toEqual(["c"]);
  });
});
