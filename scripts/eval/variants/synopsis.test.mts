import { describe, expect, it } from "vitest";

import type { SynopsisFacts } from "../../../src/lib/synopsis/facts";
import { CHAR_BUDGETS } from "../../../src/lib/synopsis/limits";
import { buildSynopsisPrompt } from "../../../src/lib/synopsis/prompt";
import { figuresIn, rendered } from "../../../src/lib/synopsis/validate";
import { applySynopsisVariant, stripReminders, SYNOPSIS_VARIANTS } from "./synopsis.mjs";

const facts: SynopsisFacts = {
  commanders: ["Omnath, Locus of Rage"],
  identity: ["R", "G"],
  unproducible: [],
  lands: 36,
  ramp: 12,
  keep: { low: 2, high: 4 },
  sendBack: { none: 0, under: 1, over: 5 },
  commanderManaValues: [6],
  figures: [0, 1, 2, 4, 5, 6, 7, 12, 36],
  cards: [
    { oracleId: "o", name: "Omnath, Locus of Rage", typeLine: "Legendary Creature", quantity: 1, categories: ["commander"], oracleText: "Landfall — Whenever a land you control enters, create a 5/5 red and green Elemental creature token." },
    { oracleId: "f", name: "Forest", typeLine: "Basic Land — Forest", quantity: 20, categories: ["land"], oracleText: "({T}: Add {G}.)" },
    { oracleId: "t", name: "Trample Beast", typeLine: "Creature", quantity: 1, categories: [], oracleText: "Trample (This creature can deal excess combat damage to the player or planeswalker it's attacking.)" },
  ],
};

describe("synopsis variants", () => {
  it("base is the app's prompt, byte for byte", () => {
    expect(applySynopsisVariant(SYNOPSIS_VARIANTS.base, facts, (f) => buildSynopsisPrompt(f)).messages).toEqual(buildSynopsisPrompt(facts));
  });

  for (const v of Object.values(SYNOPSIS_VARIANTS)) {
    it(`${v.id} starts from buildSynopsisPrompt's own output`, () => {
      let received: unknown = null;
      const probe = v.prompt ? { ...v, prompt: (m: { system: string; user: string }, f: SynopsisFacts) => { received = m; return v.prompt!(m, f); } } : v;
      const { facts: shown, messages } = applySynopsisVariant(probe, facts, (f) => buildSynopsisPrompt(f));
      if (v.prompt) expect(received).toEqual(buildSynopsisPrompt(shown));
      else expect(messages).toEqual(buildSynopsisPrompt(shown));
    });
  }

  it("trim drops reminder text and a basic's rules text, and nothing else", () => {
    const { facts: shown } = applySynopsisVariant(SYNOPSIS_VARIANTS.trim, facts, (f) => buildSynopsisPrompt(f));
    expect(shown.cards.map((c) => c.oracleText)).toEqual([facts.cards[0].oracleText, null, "Trample"]);
    const rest = (c: SynopsisFacts["cards"][number]) => ({ ...c, oracleText: undefined });
    expect(shown.cards.map(rest)).toEqual(facts.cards.map(rest));
  });

  it("budgets states the app's own limits", () => {
    const { messages } = applySynopsisVariant(SYNOPSIS_VARIANTS.budgets, facts, (f) => buildSynopsisPrompt(f));
    expect(messages.system).toContain(`at most ${CHAR_BUDGETS.job} characters`);
    expect(stripReminders("Flying (It can't be blocked.) and haste")).toBe("Flying and haste");
  });
});

describe("primer-budget-c", () => {
  const { system } = applySynopsisVariant(SYNOPSIS_VARIANTS["primer-budget-c"], facts, (f) => buildSynopsisPrompt(f)).messages;
  const worked = [...(/Two lines sized to the budget: (.*)$/m.exec(system)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  // The first version's worked lines said "two-drop" and "three-drop", which the figures rule reads
  // as 2 and 3, so lines copied from them were dropped on every deck without those figures.
  it("gives two worked lines that state no figure and fit the Mulligan budget", () => {
    expect(worked).toHaveLength(2);
    for (const line of worked) {
      expect(figuresIn(line)).toEqual([]);
      expect(rendered(line).length).toBeLessThanOrEqual(CHAR_BUDGETS.mulligan - 25);
    }
  });

  it("allows a line of play, as the app's own prompt does", () => {
    expect(system).toContain("a point on the curve, or a line of play");
  });
});
