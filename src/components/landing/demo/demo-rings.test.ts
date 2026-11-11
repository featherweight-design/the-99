import { describe, expect, it } from "vitest";

import { landingCopy } from "../../../lib/copy/landing";
import type { DemoCardData } from "../../../lib/demo/project-cards";
import type { Projected } from "../../../lib/demo/projected";
import { ringPlace, ringTarget, stepOpensCards } from "./demo-rings";

const details = (...ids: string[]) => ({ cardDetails: Object.fromEntries(ids.map((id) => [id, { oracleId: id }])), deckCombos: { played: {}, over: {}, under: {} } }) as unknown as DemoCardData;
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
    for (const index of [1, 3, 4]) expect(ringTarget(index, false)).not.toBeNull();
    // Steps 7 and 8 draw no ring: their tabs are no press the step teaches.
    for (const index of [6, 7]) expect(ringTarget(index, true)).toBeNull();
    // A step with no ring has no label either, and a step with a ring has one.
    landingCopy.demo.steps.forEach((step, index) => expect(step.press === null).toBe(ringTarget(index, true) === null));
    expect(ringTarget(1)).toBe("[data-fit-chip]");
  });

  it("names the control the step's press ring sits on", () => {
    expect(ringTarget(0, true)).toBe("[data-collection-tile]");
    expect(ringTarget(2, true)).toBe("[data-testid='best-fit'], [data-testid='result-row']");
    // Step 6's first card name is the "Open <card>" button of a suggestion line; its thumbnail beside it is aria-hidden.
    expect(ringTarget(5, true)).toBe("[data-testid='demo-suggested'] article button[aria-label^='Open ']");
    expect(ringPlace(0)).toBe("bottom");
    // Step 4: a mark's coach is a hover. A fine pointer rings the first Game Changer mark with the label to its right; with none (a
    // phone) the first row is ringed (only where its card opens) with the label below it. Never the mark key.
    expect(ringTarget(3, false, true)).toBe("[data-testid='demo-deck'] [data-decklist-row] [data-testid='card-fact-gameChanger']");
    expect(ringPlace(3, true)).toBe("right");
    expect(ringTarget(3, false, false)).toBe("[data-testid='demo-deck'] [data-decklist-row]");
    expect(ringPlace(3, false)).toBe("bottom");
    for (const fine of [true, false]) expect(ringTarget(3, true, fine)).not.toContain("role='group'");
    // Step 6's label sits above the card name's ring, not over the name.
    expect(ringPlace(5)).toBe("above");
  });
});

describe("stepOpensCards", () => {
  const base = {
    collection: { cards: [{ oracleId: "c1" }, { oracleId: "c2" }] },
    choose: { page: { rows: [{ oracleId: "r1" }] } },
    suggested: { state: { items: [{ side: "add", cardOracleId: "s1" }, { addOracleId: "a1", cutOracleId: "x1" }] } },
  };

  it("is false for every step until the card data has loaded (null), and for a chunk holding no cards", () => {
    for (const index of [0, 2, 5]) {
      expect(stepOpensCards(data(base), null, index)).toBe(false);
      expect(stepOpensCards(data(base), details(), index)).toBe(false);
    }
  });

  it("is true for a step only when every card it draws has details", () => {
    const all = details("c1", "c2", "r1", "s1");
    for (const index of [0, 2, 5]) expect(stepOpensCards(data(base), all, index)).toBe(true);
    // One card short on step 1 does not take step 3's ring away, and the other way round.
    const short = details("c1", "r1");
    expect(stepOpensCards(data(base), short, 0)).toBe(false);
    expect(stepOpensCards(data(base), short, 2)).toBe(true);
    expect(stepOpensCards(data(base), short, 5)).toBe(false);
  });

  it("reads a suggestion line's card only (a legacy pair is never drawn), and a step with no cards as false", () => {
    expect(stepOpensCards(data(base), details("s1"), 5)).toBe(true);
    expect(stepOpensCards(data(base), details("a1", "x1"), 5)).toBe(false);
    expect(stepOpensCards(data({ ...base, suggested: { state: { items: [{ addOracleId: "a1", cutOracleId: "x1" }] } } }), details("a1", "x1"), 5)).toBe(false);
    expect(stepOpensCards(data({ ...base, choose: null }), details("c1"), 2)).toBe(false);
    expect(stepOpensCards(data(base), details("c1", "c2"), 3)).toBe(false);
  });
});
