import { describe, expect, it } from "vitest";

import type { SynopsisFacts } from "./facts";
import { CHAR_BUDGETS, SECTION_COUNTS } from "./limits";
import { buildSynopsisPrompt } from "./prompt";
import type { CheckedSynopsis } from "./types";

const FACTS: SynopsisFacts = {
  commanders: ["Kratos", "Atreus"],
  identity: ["R", "G"],
  unproducible: [],
  lands: 36,
  ramp: 10,
  keep: { low: 2, high: 4 },
  sendBack: { none: 0, under: 1, over: 5 },
  commanderManaValues: [],
  figures: [2, 4, 7, 10, 36],
  cards: [
    { oracleId: "a", name: "Sol Ring", typeLine: "Artifact", quantity: 1, categories: ["ramp"], oracleText: "{T}: Add {C}{C}." },
    { oracleId: "b", name: "Forest", typeLine: "Basic Land", quantity: 12, categories: ["land"], oracleText: null },
  ],
};

describe("buildSynopsisPrompt", () => {
  it("states the contract's own figures, so the prompt and the validator read one set", () => {
    const { system } = buildSynopsisPrompt(FACTS);
    expect(system).toContain(`at most ${CHAR_BUDGETS.overview} characters`);
    expect(system).toContain(`${SECTION_COUNTS.keyCards.min} to ${SECTION_COUNTS.keyCards.max} different cards`);
    expect(system).toContain("[[Sol Ring]]");
  });

  it("hands over the computed mulligan figures and every card with its categories", () => {
    const { user } = buildSynopsisPrompt(FACTS);
    expect(user).toContain("Commander: Kratos and Atreus");
    expect(user).toContain("holds 2 to 4 lands");
    expect(user).toContain("- Sol Ring (Artifact) [ramp]: {T}: Add {C}{C}.");
    expect(user).toContain("- 12x Forest (Basic Land) [land]");
    expect(user).toContain("Decklist (13 cards)");
  });

  // The figures the validator accepts must reach the model, or it states numbers it was never
  // given and is refused for them (the harness's 56 lines).
  it("states the send-back bounds and each commander's mana value", () => {
    const { user } = buildSynopsisPrompt({ ...FACTS, sendBack: { none: 0, under: 1, over: 5 }, commanderManaValues: [4, 3] });
    expect(user).toContain("Send back a hand with 0 to 1 lands, or 5 or more.");
    expect(user).toContain("Commander mana value (a turn to cast it on is this number): 4 and 3");
  });

  it("states no mana value line when no commander carries one", () => {
    const { user } = buildSynopsisPrompt(FACTS);
    expect(user).not.toContain("Commander mana value");
  });

  it("shows no bracket and no strength figure", () => {
    const { user } = buildSynopsisPrompt(FACTS);
    expect(user).not.toMatch(/bracket|power|score/i);
  });

  it("sends a retry the passing sections and names the refused ones", () => {
    const keep = { overview: "Kept.", primer: null, keyCards: null, weaknesses: ["Kept too."] } as CheckedSynopsis;
    const { user } = buildSynopsisPrompt(FACTS, { keep, refused: ["primer", "keyCards"] });
    expect(user).toContain("did not pass checking last time: primer, keyCards.");
    expect(user).toContain('"overview":"Kept."');
  });
});
