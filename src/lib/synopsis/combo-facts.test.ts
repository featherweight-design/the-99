import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
vi.mock("../../db", () => ({ db: { execute: (...a: unknown[]) => execute(...a) } }));

import { anySizeComboQuery, loadComboFacts, shapeComboFacts, type ComboPieceRow } from "./combo-facts";
import { PgDialect } from "drizzle-orm/pg-core";

const piece = (v: string, name: string, o: Partial<ComboPieceRow> = {}): ComboPieceRow => ({
  variant_id: v, produces: ["Infinite mana"], card_count: 2, mana_value_needed: 0, oracle_id: `id-${name}`,
  name, must_be_commander: false, held: true, commander_legal: true, color_identity: ["U"], ...o,
});

describe("shapeComboFacts", () => {
  it("assembles a three-card combo and counts the commander as a piece", () => {
    const rows = ["A", "B", "C"].map((n) => piece("v3", n, { card_count: 3 }));
    const out = shapeComboFacts(rows, ["U"], ["id-A"]);
    expect(out.combos).toEqual([{ pieces: ["A", "B", "C"], produces: ["Infinite mana"], usesCommander: true, manaNeeded: 0 }]);
    expect(out.nearCombos).toEqual([]);
  });

  it("keeps a loop whose only feature is \"Draw the game\", which no verdict counts but the overview must name", () => {
    const rows = ["Pariah", "Stuffy Doll"].map((n) => piece("3799-4090", n, { produces: ["Draw the game"] }));
    expect(shapeComboFacts(rows, ["W"], []).combos.map((c) => c.pieces)).toEqual([["Pariah", "Stuffy Doll"]]);
  });

  it("keeps a mandatory loop inside the cap however many cheaper combos outrank it", () => {
    const six = Array.from({ length: 6 }, (_, i) => [piece(`f${i}`, `f${i}a`, { produces: [`Infinite thing ${i}`] }), piece(`f${i}`, `f${i}b`, { produces: [`Infinite thing ${i}`] })]).flat();
    // Three pieces and costly: ranked last on every other key.
    const loop = ["x", "y", "z"].map((n) => piece("loop", n, { card_count: 3, mana_value_needed: 9, produces: ["Draw the game", "Infinite creature tokens"] }));
    const out = shapeComboFacts([...six, ...loop], ["U"], []);
    expect(out.combos).toHaveLength(6);
    expect(out.combos[0].pieces).toEqual(["x", "y", "z"]);
  });

  it("ranks fewest pieces first, then free, and caps at six", () => {
    const rows = [
      ...["a", "b", "c"].map((n) => piece("big", n, { card_count: 3 })),
      ...["d", "e"].map((n) => piece("paid", n, { mana_value_needed: 3 })),
      ...["f", "g"].map((n) => piece("free", n)),
      ...Array.from({ length: 6 }, (_, i) => [piece(`x${i}`, `x${i}a`, { card_count: 3 }), piece(`x${i}`, `x${i}b`, { card_count: 3 }), piece(`x${i}`, `x${i}c`, { card_count: 3 })]).flat(),
    ];
    const out = shapeComboFacts(rows, ["U"], []);
    expect(out.combos).toHaveLength(6);
    expect(out.combos.slice(0, 2).map((c) => c.pieces[0])).toEqual(["f", "d"]);
  });

  it("lets a different outcome in before a seventh variant of the same one", () => {
    const same = Array.from({ length: 8 }, (_, i) => ["a", "b"].map((n) => piece(`a${i}`, `${n}${i}`)));
    const other = ["zz1", "zz2"].map((n) => piece("zzz", n, { produces: ["Win the game"] }));
    const out = shapeComboFacts([...same.flat(), ...other], ["U"], []);
    expect(out.combos).toHaveLength(6);
    expect(out.combos.some((c) => c.produces[0] === "Win the game")).toBe(true);
  });

  it("ranks the commander's own combo ahead of an equal one without it", () => {
    const rows = [piece("a", "x"), piece("a", "y"), piece("b", "cmd"), piece("b", "z")];
    const out = shapeComboFacts(rows, ["U"], ["id-cmd"]);
    expect(out.combos[0].usesCommander).toBe(true);
  });

  it("ranks a near combo holding the commander ahead of an equal one without it, under the cap", () => {
    const near = (v: string, held: string) => [piece(v, held), piece(v, `miss-${v}`, { held: false })];
    const rows = [...["a", "b", "c", "d"].flatMap((v) => near(`v-${v}`, `h-${v}`)), ...near("v-z", "cmd")];
    const out = shapeComboFacts(rows, ["U"], ["id-cmd"]);
    expect(out.nearCombos).toHaveLength(3);
    expect(out.nearCombos[0].have).toBe("cmd");
  });

  it("ranks a dearer commander combo ahead of a cheaper one without it, once neither is free", () => {
    const rows = [
      piece("cheap", "x", { mana_value_needed: 1 }), piece("cheap", "y", { mana_value_needed: 1 }),
      piece("dear", "cmd", { mana_value_needed: 2 }), piece("dear", "z", { mana_value_needed: 2 }),
    ];
    expect(shapeComboFacts(rows, ["U"], ["id-cmd"]).combos[0].usesCommander).toBe(true);
  });

  it("keeps a one-short combo only when the missing piece is legal, in colour and addable", () => {
    const near = (v: string, m: Partial<ComboPieceRow>) => [piece(v, `have-${v}`), piece(v, `miss-${v}`, { held: false, ...m })];
    const rows = [
      ...near("ok", {}),
      ...near("banned", { commander_legal: false }),
      ...near("green", { color_identity: ["G"] }),
      ...near("cmdzone", { must_be_commander: true }),
    ];
    const out = shapeComboFacts(rows, ["U", "R"], []);
    expect(out.nearCombos).toEqual([{ have: "have-ok", missing: "miss-ok", produces: ["Infinite mana"] }]);
  });

  it("skips two missing pieces, a variant missing rows, and a non-counted produce", () => {
    const rows = [
      piece("two", "a", { held: false }), piece("two", "b", { held: false }),
      piece("short", "c", { card_count: 3 }), piece("short", "d", { card_count: 3 }),
      piece("meh", "e", { produces: ["Gain 2 life"] }), piece("meh", "f", { produces: ["Gain 2 life"] }),
    ];
    expect(shapeComboFacts(rows, ["U"], [])).toEqual({ combos: [], nearCombos: [] });
  });
});

describe("anySizeComboQuery", () => {
  it("is template-free, bounded to six pieces and guards the deduped row count", () => {
    const text = new PgDialect().sqlToQuery(anySizeComboQuery(["a"], ["a"])).sql;
    expect(text).toContain("cardinality(v.requires_template_ids) = 0");
    expect(text).toContain("count(*) = v2.card_count");
    expect(text).toContain("v.card_count between 2 and");
    // The bound is a bind parameter; resolve it and pin the value. Six is the product boundary.
    const q = new PgDialect().sqlToQuery(anySizeComboQuery(["a"], ["a"]));
    const bound = q.sql.match(/v\.card_count between 2 and \$(\d+)/);
    expect(bound).not.toBeNull();
    expect(q.params[Number(bound![1]) - 1]).toBe(6);
    expect(text).toContain("filter (where not p.held) <= 1");
  });

  it("admits a variant whose only feature is \"Draw the game\" at the candidate step", () => {
    const q = new PgDialect().sqlToQuery(anySizeComboQuery(["p1"], []));
    expect(q.params).toContain("Draw the game");
    expect(q.sql.replace(/\s+/g, " ")).toMatch(/or f = \$\d+\)/);
  });

  it("pins both arms of the held rule to the commander and present lists", () => {
    const q = new PgDialect().sqlToQuery(anySizeComboQuery(["p1"], ["c1"]));
    const text = q.sql.replace(/\s+/g, " ");
    expect(text).toMatch(/case when vc\.must_be_commander then vc\.oracle_id = any\(\$(\d+)::uuid\[\]\) else vc\.oracle_id = any\(\$(\d+)::uuid\[\]\) end/);
    const m = text.match(/then vc\.oracle_id = any\(\$(\d+)::uuid\[\]\) else vc\.oracle_id = any\(\$(\d+)::uuid\[\]\)/)!;
    expect(q.params[Number(m[1]) - 1]).toEqual(["c1"]);
    expect(q.params[Number(m[2]) - 1]).toEqual(["p1"]);
  });
});

describe("loadComboFacts", () => {
  beforeEach(() => execute.mockReset());
  const profile = { cards: [{ oracleId: "x" }], commanderOracleIds: ["c"], colours: { identity: ["U"] } } as never;

  it("shapes the rows the query returns", async () => {
    execute.mockResolvedValueOnce({ rows: [piece("v", "A"), piece("v", "B")] });
    expect((await loadComboFacts(profile))?.combos).toHaveLength(1);
  });

  it("returns null, rather than throwing, when the read fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    execute.mockRejectedValueOnce(new Error("boom"));
    expect(await loadComboFacts(profile)).toBeNull();
  });
});
