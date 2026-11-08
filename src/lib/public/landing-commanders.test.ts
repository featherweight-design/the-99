import { describe, expect, it } from "vitest";
import { LANDING_COMMANDER_NAMES, landingCommandersKey, landingCommandersQuery, shapeLandingCommanders } from "./landing-commanders";

type Row = Parameters<typeof shapeLandingCommanders>[0][number];
const row = (name: string, over: Partial<Row> = {}): Row => ({
  name, colorIdentity: ["U"], artCropUri: "a", imageUri: "i", oracleId: `id-${name}`, state: "ok", prose: "A read.", ...over,
});

describe("shapeLandingCommanders", () => {
  it("carries the public page slug: the name's words, then the first 12 hex of the oracle id", () => {
    const id = "0a1b2c3d-4e5f-6789-abcd-ef0123456789";
    expect(shapeLandingCommanders([row("Tam, the Possibility", { oracleId: id })])[0].slug).toBe("tam-the-possibility-0a1b2c3d4e5f");
  });

  it("returns the commanders in the listed order, each once, whatever order the rows came in", () => {
    const rows = [row("Tam, the Possibility"), row("Jace, Multiverse Architect"), row("Jace, Multiverse Architect")];
    expect(shapeLandingCommanders(rows).map((c) => c.name)).toEqual(["Jace, Multiverse Architect", "Tam, the Possibility"]);
  });

  it("chooses one row per name deterministically: an ok read first, then the lowest oracle id, whatever the row order", () => {
    const a = row("Tam, the Possibility", { oracleId: "b", state: "absent", prose: null });
    const b = row("Tam, the Possibility", { oracleId: "c", prose: "Later." });
    const c = row("Tam, the Possibility", { oracleId: "a", prose: "Earliest." });
    for (const rows of [[a, b, c], [c, b, a], [b, a, c]]) expect(shapeLandingCommanders(rows)[0].prose).toBe("Earliest.");
    expect(shapeLandingCommanders([b, a])[0].prose).toBe("Later.");
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
