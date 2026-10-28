import { describe, expect, it } from "vitest";

import { lineFacts } from "./line-facts";

const card = (over: Partial<Parameters<typeof lineFacts>[0]> = {}) => ({
  oracleId: "id", name: "Card", typeLine: "Artifact", oracleText: null, keywords: [], ...over,
});

describe("lineFacts (handoff H5)", () => {
  it("groups by the shipped type grouping", () => {
    expect(lineFacts(card({ typeLine: "Artifact Creature — Golem" }), null).typeGroup).toBe("Creatures");
    expect(lineFacts(card({ typeLine: "Basic Land — Forest" }), null)).toEqual({ typeGroup: "Lands", role: "land" });
  });

  it("names the classifier's role with no labels, and none for a card that fills none", () => {
    expect(lineFacts(card({ oracleText: "{T}: Add {C}{C}." }), null).role).toBe("ramp");
    expect(lineFacts(card({ typeLine: "Creature — Bear", oracleText: null }), null).role).toBeNull();
  });

  it("names the label's role when the label read has the card, as the strip counts it", () => {
    expect(lineFacts(card({ oracleText: "{T}: Add {C}{C}." }), { id: ["draw"] }).role).toBe("draw");
    expect(lineFacts(card({ oracleText: "{T}: Add {C}{C}." }), { id: [] }).role).toBeNull();
  });
});
