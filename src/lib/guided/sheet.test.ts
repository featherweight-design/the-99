import { describe, expect, it } from "vitest";
import { NO_CARRY } from "./carry-in";
import { guidedChoice } from "./choice";
import type { GuidedOffer } from "./offer";
import { budgetCents, initialPicks, landingAfterCreate, stepDone, toGuidedPicks } from "./sheet";

describe("the sheet's picks", () => {
  it("opens with nothing picked unless Help me choose carried an answer", () => {
    const p = initialPicks(NO_CARRY);
    expect(p).toMatchObject({ strategyKey: null, bracket: null, poolMode: null, kept: [] });
    expect(toGuidedPicks(p)).toBeNull();
    const c = initialPicks({ strategyKey: "tokens", bracket: 3, poolMode: "budget", budgetCents: 7500, kept: ["x"] });
    expect(c).toMatchObject({ strategyKey: "tokens", bracket: 3, poolMode: "budget", budgetText: "75", kept: ["x"] });
  });

  it("hands createDeck whole picks, with the budget only in budget mode", () => {
    const base = { strategyKey: "tokens", bracket: 3 as const, budgetText: "50", kept: ["k"] };
    expect(toGuidedPicks({ ...base, poolMode: "owned" })).toEqual({ strategyKey: "tokens", bracket: 3, poolMode: "owned", budgetCents: null, kept: ["k"] });
    expect(toGuidedPicks({ ...base, poolMode: "budget" })?.budgetCents).toBe(5000);
    expect(toGuidedPicks({ ...base, poolMode: "budget", budgetText: "0" })).toBeNull();
  });

  it("takes whole dollars from $1 to $5,000 and nothing else", () => {
    expect(budgetCents("1")).toBe(100);
    expect(budgetCents(" 5000 ")).toBe(500_000);
    for (const bad of ["", "0", "5001", "12.5", "-3", "1e3", "abc"]) expect(budgetCents(bad)).toBeNull();
    expect(stepDone({ strategyKey: null, bracket: null, poolMode: "budget", budgetText: "", kept: [] }, "cards")).toBe(false);
  });
});

describe("a refused start is never silent", () => {
  const offer = (strategies: number, over: Partial<GuidedOffer["allowance"]> = {}): GuidedOffer => ({
    strategies: Array.from({ length: strategies }, (_, i) => ({ key: `s${i}`, label: `S${i}`, blurb: "", source: "edhrec", backingIds: [], backing: [] })) as GuidedOffer["strategies"],
    allowance: { used: 0, limit: 1, payments: true, ...over } as GuidedOffer["allowance"],
  });

  it("the sheet's pre-check passes and the server still refuses: the deck lands with the refused line's param", () => {
    // Pre-check: a funded reader with a backed strategy is offered the row, ready.
    expect(guidedChoice(offer(2, { limit: 20 })).state).toBe("ready");
    // Server: any reason but a started run lands on the deck with the refusal the page reads.
    for (const reason of ["allowance", "inFlight", "ownerShare", "paused", "notOffered", "noPool", "error"]) {
      expect(landingAfterCreate("d1", reason)).toBe("/decks/d1?guided=refused");
    }
    expect(landingAfterCreate("d1", "started")).toBe("/decks/d1");
    expect(landingAfterCreate("d1", "none")).toBe("/decks/d1");
  });

  it("draws the row off with its reason when no strategy is backed", () => {
    expect(guidedChoice(offer(0)).state).toBe("none");
  });
});
