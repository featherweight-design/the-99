import { describe, expect, it } from "vitest";

import type { Bracket } from "../profile/types";
import { cutFacts, type CutSupport } from "./cuts";
import { cutChips, cutCounts, flagAllowance, quotedPart } from "./cuts-count";
import { deck, profile, support } from "./cuts-fixture";

const counts = (declared: Bracket | null = null, sup: CutSupport | null = support([])) =>
  cutCounts(cutFacts({ profile: profile(), locked: new Set(), support: sup, declaredBracket: declared }), declared, "Gishath");

describe("cutCounts", () => {
  it("lists only roles over their target, with the overage in the note", () => {
    const rows = counts().rows.filter((r) => r.source === "role");
    expect(rows.every((r) => Number(r.note.split(" · ")[1].split(" ")[0]) > 0)).toBe(true);
    expect(rows.map((r) => r.key)).not.toContain("role:draw");
    expect(rows.find((r) => r.key === "role:ramp")).toMatchObject({ figure: 12, note: "rec 10 · 2 over" });
  });

  it("names no card on any row", () => {
    const names = deck().map((c) => c.name);
    for (const r of counts().rows) expect(names).not.toContain(r.label);
  });

  it("draws a dashed EDHREC row, not a zero, when there is no list", () => {
    const row = counts(null, null).rows.find((r) => r.source === "edhrec");
    expect(row).toMatchObject({ thin: true, figure: null });
  });

  it("shows no bracket row with no declared bracket", () => {
    expect(counts(null).rows.some((r) => r.source === "bracket")).toBe(false);
  });
});

describe("flagAllowance", () => {
  it("reads the rules' own limits", () => {
    expect(flagAllowance("gameChanger", 3)).toBe(3);
    expect(flagAllowance("gameChanger", 1)).toBe(0);
    expect(flagAllowance("massLandDenial", 2)).toBe(0);
  });
});

describe("a combo is not a card allowance", () => {
  it("says what the bracket forbids, not that it allows none of a piece count", () => {
    const f = cutFacts({ profile: profile(), locked: new Set(), support: null, declaredBracket: 2 });
    const withCombo = { ...f, brackets: [{ flag: "combo" as const, cards: [{ oracleId: "a", name: "a" }, { oracleId: "b", name: "b" }] }] };
    expect(cutCounts(withCombo, 2, "G").rows.find((r) => r.key === "bracket:combo")?.note).toBe("bracket 2 allows no combos");
    expect(cutCounts(withCombo, 3, "G").rows.find((r) => r.key === "bracket:combo")?.note).toBe("bracket 3 allows no infinite loops");
  });
});

describe("a flag chip with no declared bracket", () => {
  it("quotes the deck-level count the facts carry, with no allowance to compare it with", () => {
    const f = cutFacts({ profile: profile(), locked: new Set(), support: null, declaredBracket: null });
    const withGc = { ...f, brackets: [{ flag: "gameChanger" as const, cards: [{ oracleId: "a", name: "a" }, { oracleId: "b", name: "b" }] }] };
    const { chips, rows } = cutCounts(withGc, null, "G");
    expect(rows.some((r) => r.source === "bracket")).toBe(false);
    expect(cutChips([{ kind: "flag", flag: "gameChanger" }], "r", chips)[0].text).toBe("Game Changers 2");
  });
});

describe("cutChips", () => {
  const ctx = { medianPct: 38, flagCounts: { gameChanger: 4 }, declared: 3 as Bracket };
  it("words the combo none chip as what the read found, never as a claim about the deck", () => {
    const chips = cutChips([
      { kind: "combo", state: "assembled" }, { kind: "combo", state: "oneShort" }, { kind: "combo", state: "none" },
    ], "reason", ctx);
    expect(chips.map((c) => c.text)).toEqual(["in a combo the deck assembles", "in a combo one card short", "in no combo the read found"]);
  });
  it("quotes each cite's own figure, one chip per cite", () => {
    const chips = cutChips([
      { kind: "role", role: "ramp", have: 14, target: 10 },
      { kind: "inclusion", pct: 14 },
      { kind: "curve", cmc: 7, have: 9 },
      { kind: "flag", flag: "gameChanger" },
    ], "reason", ctx);
    expect(chips.map((c) => `${c.kind} ${c.text}`)).toEqual([
      "ROLE ramp 14 · rec 10",
      "EDHREC 14% · median 38%",
      "CURVE 9 cost 7 or more",
      "BRACKET Game Changers 4 · bracket 3 allows 3",
    ]);
  });

  it("quotes the player's own words for an intent cite, and falls back without a quotation", () => {
    expect(cutChips([{ kind: "intent" }], "You wrote “Gishath on six” so.", ctx)[0].text).toBe("“Gishath on six”");
    expect(cutChips([{ kind: "intent" }], "No quote here.", ctx)[0].text).toBe("your description");
    expect(quotedPart("a “b” c")).toBe("b");
  });
});
