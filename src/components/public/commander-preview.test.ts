import { describe, expect, it } from "vitest";

import { DESCRIPTION_MAX } from "../../lib/public/preview";
import { commanderDescription, commanderFigures, topThemes } from "./commander-preview";

describe("the commander's link-preview description (C2)", () => {
  const tag = (label: string, count: number) => ({ slug: label.toLowerCase(), label, count });
  const zimone = {
    state: "ok" as const, prose: null, rank: 203, deckCount: 11687, typeLine: "Legendary Creature — Human Wizard",
    tags: [tag("Tokens", 900), tag("X Spells", 4000), tag("Counters", 2500), tag("Hydras", 1200)],
  };

  it("is the prose sentence when there is one", () => {
    expect(commanderDescription({ ...zimone, prose: "Zimone turns each X spell into a cheaper next one." })).toBe("Zimone turns each X spell into a cheaper next one.");
  });

  it("with no prose, is the rank, the decks and the three most-tagged themes", () => {
    expect(commanderDescription(zimone)).toBe("#203 on EDHREC across 11,687 decks. X Spells, Counters, and Hydras.");
    expect(commanderDescription({ ...zimone, tags: [] })).toBe("#203 on EDHREC across 11,687 decks.");
  });

  it("absent, degraded, or with a figure blank, is the type line", () => {
    for (const state of ["absent", "degraded"] as const) {
      expect(commanderDescription({ ...zimone, state, rank: null, deckCount: null, tags: [] })).toBe("Legendary Creature — Human Wizard");
    }
    expect(commanderDescription({ ...zimone, rank: null })).toBe("Legendary Creature — Human Wizard");
  });

  it("is cut at a word near 155 characters", () => {
    const prose = "word ".repeat(60).trim();
    expect(commanderDescription({ ...zimone, prose }).length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("orders the themes by how many decks carry them, and has none to list for no tags", () => {
    expect(topThemes(zimone.tags)).toBe("X Spells, Counters, and Hydras");
    expect(topThemes([tag("Tokens", 1)])).toBe("Tokens");
    expect(topThemes([])).toBeNull();
  });

  it("draws the image's figures line, leaving off a blank figure", () => {
    expect(commanderFigures(zimone)).toBe("#203 on EDHREC · 11,687 decks");
    expect(commanderFigures({ rank: null, deckCount: 11687 })).toBe("11,687 decks");
    expect(commanderFigures({ rank: 203, deckCount: null })).toBe("#203 on EDHREC");
    expect(commanderFigures({ rank: null, deckCount: null })).toBeNull();
  });
});
