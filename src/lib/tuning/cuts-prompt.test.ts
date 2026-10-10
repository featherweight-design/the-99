import { describe, expect, it } from "vitest";

import { PLAYER_TEXT_SYSTEM_RULE } from "../model/player-text";
import { cutFacts } from "./cuts";
import { deck, profile, support } from "./cuts-fixture";
import { buildCutsPack } from "./cuts-evidence";
import { buildCutsPrompt, CUTS_PROMPT_VERSION } from "./cuts-prompt";

const build = (intent: string | null = null, sup = true) =>
  buildCutsPrompt(buildCutsPack({
    facts: cutFacts({ profile: profile(), locked: new Set(), support: sup ? support([["ramp0", 41]]) : null, declaredBracket: null }),
    commanderName: "Gishath", keyCards: ["ramp1"], intent,
  }));

describe("buildCutsPrompt", () => {
  it("tells the model every rule the validator enforces, and writes the last curve bucket as 7+", () => {
    const { system, user } = build();
    expect(system).toContain("promise a result");
    expect(system).toContain("byte-identical");
    expect(user).toMatch(/- cmc 7\+: have/);
    expect(user).not.toMatch(/- cmc 7: have/);
  });

  it("has its own version", () => expect(CUTS_PROMPT_VERSION).toBe(2));

  it("asks for exactly over cuts and carries the player-text rule and the cite rules", () => {
    const { system } = build();
    expect(system).toContain("exactly 2 cuts");
    expect(system).toContain(PLAYER_TEXT_SYSTEM_RULE);
    expect(system).toMatch(/cites entry/);
    expect(system).toMatch(/Never cut a Key card/);
  });

  it("renders deck facts, key cards and every card, but never an oracle id, price or ownership", () => {
    const { user } = build();
    expect(user).toContain("ramp: 12 of 10");
    expect(user).toContain("Key cards, never to be cut: ramp1.");
    expect(user).toContain("- ramp0 | Creature — Bear, mv 2 | roles: ramp | inclusion 41");
    expect(user).toContain("not on the commander's EDHREC list");
    expect(user).not.toMatch(/price|owned|\$/i);
  });

  it("states a missing list and no intent in words, and wraps an intent as player text", () => {
    expect(build(null, false).user).toContain("No EDHREC list was available");
    expect(build(null).user).toContain("no stated intent");
    expect(build("Big fliers").user).toContain("<<<PLAYER_TEXT>>>");
  });

  it("writes no em dash of its own; only a catalog type line carries one", () => {
    const { system, user } = build("x");
    expect(system).not.toContain("—");
    expect(user.replaceAll(/[A-Za-z ]+ — [A-Za-z ]+, mv/g, "")).not.toContain("—");
  });

  it("gives a card's oracle text on its line, flattened, only when the caller supplied it", () => {
    const pack = buildCutsPack({
      facts: cutFacts({ profile: profile(), locked: new Set(), support: null, declaredBracket: null }),
      commanderName: "Gishath", keyCards: [], intent: null,
      texts: new Map([["ramp0", "{T}: Add {G}.\nDraw a card."]]),
    });
    const { user } = buildCutsPrompt(pack);
    expect(user).toContain("- ramp0 | Creature — Bear, mv 2 | text: {T}: Add {G}. / Draw a card. |");
    expect(user).not.toContain("ramp1 | Creature — Bear, mv 2 | text:");
  });
});

describe("the plan in the prompt (v2)", () => {
  const plan = {
    combos: [{ pieces: ["bear1", "bear2"], produces: ["Infinite mana"], usesCommander: true, manaNeeded: 1 }],
    nearCombos: [{ have: "bear3", missing: "Elsewhere", produces: ["Infinite turns"] }],
    commanderText: ["Gishath: Vigilance"], colourNeeds: [{ colour: "G", cards: 50 }], basics: [{ type: "Forest", count: 37 }],
    needs: new Map([["bear1", ["G"]]]),
  };
  const withPlan = () => buildCutsPrompt(buildCutsPack({
    facts: cutFacts({ profile: profile(), locked: new Set(), support: null, declaredBracket: null }),
    commanderName: "Gishath", keyCards: [], intent: null, plan,
  }));

  it("orders the choice: the plan first, then efficiency, with role counts as context only", () => {
    const { system } = withPlan();
    expect(system.indexOf("Find the deck's plan")).toBeLessThan(system.indexOf("least efficient"));
    expect(system).toMatch(/never cut a card for a count alone/);
    expect(system).toMatch(/Lead every reason with the plan or the efficiency fact/);
    expect(system).toMatch(/Do not protect a card because it is new/);
  });

  it("lists the combos, the near misses, the commander's text and the colours", () => {
    const { user } = withPlan();
    expect(user).toContain("- bear1 + bear2 -> Infinite mana, mana needed 1, uses the commander");
    expect(user).toContain("- has bear3, lacks Elsewhere -> Infinite turns");
    expect(user).toContain("- Gishath: Vigilance");
    expect(user).toContain("Nonland cards by the colour their cost needs: G 50.");
    expect(user).toContain("Basic lands: Forest 37.");
    expect(user).toContain("| piece of an assembled combo |");
    expect(user).toContain("| needs G");
  });

  it("puts the role counts under a context-only heading, and leaves per-card role surplus out", () => {
    const { user } = withPlan();
    expect(user).toContain("Context only, never a reason alone. Roles, have of target:");
    expect(user).not.toMatch(/role surplus|at or under target/);
  });

  it("asks for the per-run cap and says the player runs it again, only for a deck past it", () => {
    const big = buildCutsPrompt(buildCutsPack({
      facts: cutFacts({ profile: profile({}, deck(70)), locked: new Set(), support: null, declaredBracket: null }),
      commanderName: "Gishath", keyCards: [], intent: null,
    }));
    expect(big.system).toContain("Propose exactly 20 cuts.");
    expect(big.system).toContain("The deck is 22 over");
    expect(withPlan().system).not.toContain("run this again");
  });

  it("tells the model a capped combo list may omit pieces, and says nothing of it under the cap", () => {
    const capped = buildCutsPrompt(buildCutsPack({
      facts: cutFacts({ profile: profile(), locked: new Set(), support: null, declaredBracket: null }),
      commanderName: "Gishath", keyCards: [], intent: null, plan: { ...plan, combos: Array.from({ length: 6 }, () => plan.combos[0]) },
    }));
    expect(capped.user).toContain("never cite combo state none");
    expect(withPlan().user).not.toContain("never cite combo state none");
  });

  it("drops the combo and colour cites and the plan wording when no plan was read", () => {
    const { system } = build();
    expect(system).toContain("Cite with one of eight kinds");
    expect(system).not.toMatch(/combo \(state|colour \(colour/);
    expect(system).not.toContain("assembled combo");
    expect(withPlan().system).toContain("Cite with one of ten kinds");
  });

  it("says so when the combo read failed, and omits the whole plan block when none was given", () => {
    const failed = buildCutsPrompt(buildCutsPack({
      facts: cutFacts({ profile: profile(), locked: new Set(), support: null, declaredBracket: null }),
      commanderName: "Gishath", keyCards: [], intent: null, plan: { ...plan, combos: null, nearCombos: null },
    }));
    expect(failed.user).toContain("The combo read failed");
    expect(build().user).not.toContain("The deck's plan.");
  });
});
