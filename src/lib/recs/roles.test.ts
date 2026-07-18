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
    expect(ROLE_TARGETS).toEqual({ ramp: 10, draw: 10, removal: 8 });
  });
});
