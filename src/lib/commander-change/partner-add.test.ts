import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Candidate, CandidateHalf } from "./candidates";

const execute = vi.hoisted(() => vi.fn());
vi.mock("../../db", () => ({ db: { execute } }));

import { byPartnerFit, isBelowFloor, partnerSources, type PartnerOption } from "./partner-add";

const half = (name: string): CandidateHalf => ({
  oracleId: name, name, manaCost: null, cmc: 0, artCropUri: null, imageUri: null,
  inDeck: false, owned: false, availability: null, price: null,
});
const option = (partner: string, n: number, belowFloor: boolean): PartnerOption => {
  const base: Candidate = { key: partner, halves: [half("Stay"), half(partner)], fit: { n, of: 60 }, matched: [], deckCount: 0 };
  return { ...base, hasPairRow: !belowFloor, belowFloor, opens: [], cuts: [] };
};

describe("byPartnerFit", () => {
  it("lists a pair below the floor after every pair that meets it, whatever its figure", () => {
    const out = [option("Low", 50, true), option("Zed", 10, false), option("Amy", 10, false), option("Top", 30, false)].sort(byPartnerFit);
    expect(out.map((o) => o.halves[1].name)).toEqual(["Top", "Amy", "Zed", "Low"]);
  });
});

describe("isBelowFloor", () => {
  it("is true for a pair with no row, and for a row under the floor", () => {
    expect(isBelowFloor({ hasPairRow: false, deckCount: 0 })).toBe(true);
    expect(isBelowFloor({ hasPairRow: true, deckCount: 19 })).toBe(true);
    expect(isBelowFloor({ hasPairRow: true, deckCount: 20 })).toBe(false);
  });
});

describe("partnerSources, Backgrounds (#491 PR6)", () => {
  const cmd = (oracleText: string | null, typeLine = "Legendary Creature — Human") =>
    ({ oracleId: "c", name: "C", typeLine, oracleText, manaCost: "{2}{W}", layout: "normal" });
  const row = (id: string, typeLine: string) =>
    ({ oracle_id: id, name: id, type_line: typeLine, oracle_text: null, mana_cost: null, layout: "normal" });

  beforeEach(() => execute.mockReset());

  it("offers every Background to a commander that chooses one, with no pair row, and runs only that query", async () => {
    execute.mockResolvedValueOnce({ rows: [
      row("bg1", "Legendary Enchantment — Background"),
      row("bg2", "Legendary Enchantment — Background"),
      row("notbg", "Legendary Creature — Elf"),
    ] });
    const out = await partnerSources(cmd("Choose a Background"), new Set(["bg2"]));
    expect(execute).toHaveBeenCalledTimes(1);
    expect(out).toEqual([{ ids: ["c", "bg1"], deckCount: 0, hasPairRow: false }]);
  });

  it("never offers a Background to a Partner commander, and runs only the two partner queries", async () => {
    execute.mockResolvedValue({ rows: [] });
    const out = await partnerSources(cmd("Partner"), new Set());
    expect(execute).toHaveBeenCalledTimes(2);
    expect(out).toEqual([]);
  });

  it("offers nothing to a commander with no second-commander ability", async () => {
    expect(await partnerSources(cmd("Flying"), new Set())).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });
});
