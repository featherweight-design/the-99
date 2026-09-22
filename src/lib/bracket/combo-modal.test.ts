import { describe, expect, it } from "vitest";

import { comboModal } from "./combo-modal";
import type { ComboRef } from "../profile/types";

const base = (over: Partial<ComboRef> = {}): ComboRef => ({
  variantId: "1-2",
  cards: [{ oracleId: "a", name: "A" }, { oracleId: "b", name: "B" }],
  produces: ["Infinite mana"],
  bracketTag: "E",
  usesCommander: false,
  manaValueNeeded: 0,
  manaNeeded: null,
  steps: null,
  notablePrerequisites: null,
  ...over,
});

describe("comboModal — the mana reading", () => {
  // THE THREE READINGS ARE DISTINCT, and the middle one is why. 59% of variants need no mana,
  // and a combo that costs nothing to go off is the more alarming of the two — drawn as a
  // blank, that is exactly the fact that disappears.
  it("reads zero as free, not as unknown", () => {
    expect(comboModal(base({ manaValueNeeded: 0 })).mana).toEqual({ kind: "free" });
  });

  it("reads a cost with its pips", () => {
    expect(comboModal(base({ manaValueNeeded: 2, manaNeeded: "{2}" })).mana).toEqual({
      kind: "costs", pips: "{2}", value: 2,
    });
  });

  // A cost with no pips is still a cost: `manaNeeded` and `manaValueNeeded > 0` agreed on the
  // same 41% in the sample, but the reading must not depend on that holding.
  it("reads a cost with no pips as a cost, not as free", () => {
    expect(comboModal(base({ manaValueNeeded: 3, manaNeeded: null })).mana).toEqual({
      kind: "costs", pips: null, value: 3,
    });
  });

  it("reads a missing value as unknown, which is neither free nor a cost", () => {
    expect(comboModal(base({ manaValueNeeded: null })).mana).toEqual({ kind: "unknown" });
  });
});

describe("comboModal — the steps", () => {
  // Upstream sends one 395-character string separated by its own newlines. A modal drawing that
  // as a paragraph is not a list of steps.
  it("splits upstream's newlines into steps", () => {
    const m = comboModal(base({ steps: "Sacrifice it.\nReturn it.\nRepeat." }));
    expect(m.steps).toEqual(["Sacrifice it.", "Return it.", "Repeat."]);
  });

  // A trailing newline would otherwise draw an empty final step — a row of nothing under the
  // last real one.
  it("drops blank lines rather than drawing an empty step", () => {
    expect(comboModal(base({ steps: "One.\n\nTwo.\n" })).steps).toEqual(["One.", "Two."]);
  });

  it("has no steps when upstream sent none", () => {
    expect(comboModal(base({ steps: null })).steps).toEqual([]);
  });
});

describe("comboModal — the prerequisites", () => {
  it("carries them when upstream sent them", () => {
    const m = comboModal(base({ notablePrerequisites: "You control five creatures." }));
    expect(m.prerequisites).toBe("You control five creatures.");
  });

  // Null on 36% of variants, and the modal draws nothing for it rather than an empty line.
  it("is null when upstream sent none", () => {
    expect(comboModal(base()).prerequisites).toBeNull();
  });
});
