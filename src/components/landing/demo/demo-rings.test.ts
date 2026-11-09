import { describe, expect, it } from "vitest";

import type { Projected } from "../../../lib/demo/projected";
import { ringPlace, ringTarget, stepOpensCards } from "./demo-rings";

const details = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, { oracleId: id }]));
const data = (over: Record<string, unknown>) => over as unknown as Projected;

describe("ringTarget", () => {
  it("draws the card rings (steps 1, 3 and 6) only when a press opens a card", () => {
    for (const index of [0, 2, 5]) {
      expect(ringTarget(index)).toBeNull();
      expect(ringTarget(index, false)).toBeNull();
      expect(ringTarget(index, true)).not.toBeNull();
    }
  });

  it("keeps the rings that never promise a card regardless of the flag", () => {
    for (const index of [1, 3, 4, 6, 7]) expect(ringTarget(index, false)).not.toBeNull();
    expect(ringTarget(1)).toBe("[data-fit-chip]");
  });

  it("names the control the step's press ring sits on", () => {
    expect(ringTarget(0, true)).toBe("[data-collection-tile]");
    expect(ringTarget(2, true)).toBe("[data-testid='best-fit'], [data-testid='result-row']");
    // Step 6's first card name is the "Open <card>" button; its thumbnail beside it is aria-hidden.
    expect(ringTarget(5, true)).toContain("button[aria-label^='Open ']");
    expect(ringPlace(0)).toBe("inside");
  });
});

describe("stepOpensCards", () => {
  const base = {
    collection: { cards: [{ oracleId: "c1" }, { oracleId: "c2" }] },
    choose: { page: { rows: [{ oracleId: "r1" }] } },
    suggested: { state: { items: [{ cardOracleId: "s1" }, { addOracleId: "a1", cutOracleId: "x1" }] } },
  };

  it("is false for every step when the data carries no details (a file exported before they joined)", () => {
    for (const index of [0, 2, 5]) expect(stepOpensCards(data(base), index)).toBe(false);
  });

  it("is true for a step only when every card it draws has details", () => {
    const all = data({ ...base, cardDetails: details("c1", "c2", "r1", "s1", "a1", "x1") });
    for (const index of [0, 2, 5]) expect(stepOpensCards(all, index)).toBe(true);
    // One card short on step 1 does not take step 3's ring away, and the other way round.
    const short = data({ ...base, cardDetails: details("c1", "r1", "s1", "a1") });
    expect(stepOpensCards(short, 0)).toBe(false);
    expect(stepOpensCards(short, 2)).toBe(true);
    expect(stepOpensCards(short, 5)).toBe(false);
  });

  it("reads a suggestion pair's two cards and a line's one, and a step with no cards as false", () => {
    expect(stepOpensCards(data({ ...base, cardDetails: details("s1", "a1") }), 5)).toBe(false);
    expect(stepOpensCards(data({ ...base, cardDetails: details("s1", "a1", "x1") }), 5)).toBe(true);
    expect(stepOpensCards(data({ ...base, choose: null, cardDetails: details("c1") }), 2)).toBe(false);
    expect(stepOpensCards(data({ ...base, cardDetails: details("c1", "c2") }), 3)).toBe(false);
  });
});
