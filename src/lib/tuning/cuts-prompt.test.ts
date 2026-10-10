import { describe, expect, it } from "vitest";

import { PLAYER_TEXT_SYSTEM_RULE } from "../model/player-text";
import { cutFacts } from "./cuts";
import { profile, support } from "./cuts-fixture";
import { buildCutsPack } from "./cuts-evidence";
import { buildCutsPrompt, CUTS_PROMPT_VERSION } from "./cuts-prompt";

const build = (intent: string | null = null, sup = true) =>
  buildCutsPrompt(buildCutsPack({
    facts: cutFacts({ profile: profile(), locked: new Set(), support: sup ? support([["ramp0", 41]]) : null, declaredBracket: null }),
    commanderName: "Gishath", keyCards: ["ramp1"], intent,
  }));

describe("buildCutsPrompt", () => {
  it("has its own version", () => expect(CUTS_PROMPT_VERSION).toBe(1));

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
