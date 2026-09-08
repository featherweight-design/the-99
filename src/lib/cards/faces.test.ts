import { describe, expect, it } from "vitest";

import { isTwoFaced } from "./faces";

describe("isTwoFaced", () => {
  it("is true for the layouts that print two sides", () => {
    expect(isTwoFaced("transform")).toBe(true);
    expect(isTwoFaced("modal_dfc")).toBe(true);
  });

  it("is false for the layouts a `//` heuristic would have caught", () => {
    // Every one of these carries a `//` in its name and its type line.
    expect(isTwoFaced("split")).toBe(false);
    expect(isTwoFaced("adventure")).toBe(false);
    expect(isTwoFaced("flip")).toBe(false);
    // A meld back is a separate card with its own oracle id, not this card's
    // other side, so the modal has nothing to turn this one over to.
    expect(isTwoFaced("meld")).toBe(false);
    // Two-sided, but `toCardRow` drops it — no top-level oracle_id — so it is
    // never in the table this question is asked of.
    expect(isTwoFaced("reversible_card")).toBe(false);
  });

  it("is false for a plain card, and for a card that has not been re-seeded", () => {
    expect(isTwoFaced("normal")).toBe(false);
    expect(isTwoFaced(null)).toBe(false);
    expect(isTwoFaced(undefined)).toBe(false);
  });
});
