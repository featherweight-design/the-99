import { describe, expect, it } from "vitest";
import { classifyRoles, rolesByLabelElseText, ROLE_TARGETS } from "./roles";

const card = (typeLine: string, oracleText: string, keywords: string[] = []) =>
  ({ typeLine, oracleText, keywords });

describe("classifyRoles", () => {
  it("classifies lands", () => {
    expect(classifyRoles(card("Basic Land — Forest", ""))).toContain("land");
  });
  it("classifies mana rocks and land-ramp as ramp", () => {
    expect(classifyRoles(card("Artifact", "{T}: Add {C}{C}."))).toContain("ramp");
    expect(classifyRoles(card("Sorcery", "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle."))).toContain("ramp");
  });
  it("classifies card draw", () => {
    expect(classifyRoles(card("Sorcery", "Draw three cards."))).toContain("draw");
  });
  it("classifies removal", () => {
    expect(classifyRoles(card("Instant", "Destroy target creature."))).toContain("removal");
    expect(classifyRoles(card("Instant", "Exile target permanent."))).toContain("removal");
    expect(classifyRoles(card("Instant", "Counter target spell."))).toContain("removal");
  });
  it("does not classify a vanilla creature as anything", () => {
    expect(classifyRoles(card("Creature — Bear", ""))).toEqual([]);
  });
  it("does not classify 'destroy ... you control' (sac effects) as removal", () => {
    expect(classifyRoles(card("Instant", "Destroy target artifact you control."))).toEqual([]);
  });
  it("exports role targets", () => {
    expect(ROLE_TARGETS).toEqual({ ramp: 10, draw: 10, removal: 8, wipes: 3 });
  });
});

describe("wipes role", () => {
  it("classifies 'destroy all creatures' as wipes, not removal", () => {
    const roles = classifyRoles({ typeLine: "Sorcery", oracleText: "Destroy all creatures.", keywords: [] });
    expect(roles).toContain("wipes");
    expect(roles).not.toContain("removal");
  });
  it("classifies 'exile all' as wipes", () => {
    expect(classifyRoles({ typeLine: "Sorcery", oracleText: "Exile all nonland permanents.", keywords: [] })).toContain("wipes");
  });
  it("classifies symmetric -X/-X as wipes", () => {
    expect(classifyRoles({ typeLine: "Sorcery", oracleText: "All creatures get -2/-2 until end of turn.", keywords: [] })).toContain("wipes");
  });
  it("still classifies single-target removal as removal only", () => {
    const roles = classifyRoles({ typeLine: "Instant", oracleText: "Destroy target creature.", keywords: [] });
    expect(roles).toEqual(["removal"]);
  });
  it("has a wipes target of 3", () => {
    expect(ROLE_TARGETS.wipes).toBe(3);
  });
});

// The land test is `isLandFace` — the FRONT face, with a word boundary — not a substring
// sweep of the whole type line. Measured on the shipped catalog: 82 of the 31,830 commander-legal
// cards disagreed between the two, every one an MDFC with a Land on the back.
describe("what counts as a land", () => {
  const roles = (typeLine: string, oracleText: string | null = null) =>
    classifyRoles({ typeLine, oracleText, keywords: [] });

  it("does not call an MDFC with a land BACK a land", () => {
    expect(roles("Instant // Land")).not.toContain("land");
    expect(roles("Artifact // Land")).not.toContain("land");
  });

  it("still calls a real land a land", () => {
    expect(roles("Basic Land — Forest")).toContain("land");
    expect(roles("Legendary Snow Land")).toContain("land");
  });

  // No word boundary, and `Lander Rizzi` is a land.
  it("does not call a card a land for containing the letters", () => {
    expect(roles("Legendary Artifact Creature — Lander Rogue")).not.toContain("land");
  });

  // The ramp test is gated on the SAME answer, so the substring bug excluded a land-backed
  // ramp spell from ramp as well as mislabelling it.
  it("lets a land-backed ramp spell be ramp", () => {
    expect(roles("Sorcery // Land", "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.")).toContain("ramp");
    expect(roles("Sorcery // Land", "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.")).not.toContain("land");
  });
});

describe("rolesByLabelElseText", () => {
  const rock = { oracleId: "r", ...card("Artifact", "{T}: Add {C}.") };
  it("is the classifier with no label map", () => {
    expect(rolesByLabelElseText(rock, undefined)).toEqual(classifyRoles(rock));
  });
  it("takes a labeled card's label, including the empty set", () => {
    expect(rolesByLabelElseText(rock, new Map([["r", ["draw" as const]]]))).toEqual(["draw"]);
    expect(rolesByLabelElseText(rock, new Map([["r", []]]))).toEqual([]);
  });
  it("falls back to the classifier for a card with no label", () => {
    expect(rolesByLabelElseText(rock, new Map())).toEqual(classifyRoles(rock));
  });
  it("keeps a land a land and nothing else on the label basis", () => {
    const canopy = { oracleId: "c", ...card("Land", "{T}, Pay 1 life: Add {G} or {W}. {1}, {T}, Sacrifice: Draw a card.") };
    expect(rolesByLabelElseText(canopy, new Map())).toEqual(["land"]);
  });
});
