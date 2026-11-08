import { describe, expect, it } from "vitest";
import { LANDING_COMMANDER_NAMES, landingCommandersKey, landingCommandersQuery, shapeLandingCommanders } from "./landing-commanders";

type Row = Parameters<typeof shapeLandingCommanders>[0][number];
const row = (name: string, over: Partial<Row> = {}): Row => ({
  name, colorIdentity: ["U"], artCropUri: "a", imageUri: "i", oracleId: `id-${name}`, state: "ok", prose: "A read.", ...over,
});

describe("shapeLandingCommanders", () => {
  it("returns the commanders in the listed order, each once, whatever order the rows came in", () => {
    const rows = [row("Tam, the Possibility"), row("Jace, Multiverse Architect"), row("Jace, Multiverse Architect")];
    expect(shapeLandingCommanders(rows).map((c) => c.name)).toEqual(["Jace, Multiverse Architect", "Tam, the Possibility"]);
  });

  it("leaves a commander the catalog did not return out, never a stand-in", () => {
    expect(shapeLandingCommanders([])).toEqual([]);
  });

  it("carries the read only while it is ok and not blank (the public commander page's rule)", () => {
    const [absent, blank, ok] = shapeLandingCommanders([
      row("Jace, Multiverse Architect", { state: "absent" }),
      row("Y'shtola, Night's Blessed", { prose: "   " }),
      row("Tam, the Possibility"),
    ]);
    expect([absent.prose, blank.prose, ok.prose]).toEqual([null, null, "A read."]);
  });
});

describe("landingCommandersQuery", () => {
  it("reads the catalog only: cards joined to commander_support, by name", () => {
    const { sql } = landingCommandersQuery().toSQL();
    expect(sql).toMatch(/from "cards" inner join "commander_support"/);
    expect(sql).toMatch(/"cards"\."name" in \(\$1, \$2, \$3\)/);
    expect(LANDING_COMMANDER_NAMES).toHaveLength(3);
  });

  it("keys the cache on the catalog generation and the deployment", () => {
    expect(landingCommandersKey("g1", "d1")).not.toEqual(landingCommandersKey("g2", "d1"));
    expect(landingCommandersKey("g1", "d1")).not.toEqual(landingCommandersKey("g1", "d2"));
  });
});
