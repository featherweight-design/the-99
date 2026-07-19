import { describe, expect, it } from "vitest";
import { classifyRoles, ROLE_TARGETS } from "./roles";

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
