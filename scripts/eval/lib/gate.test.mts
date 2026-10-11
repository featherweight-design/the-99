import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { CheckedSynopsis, SectionId, SectionVerdict } from "../../../src/lib/synopsis/types";
import { loadCorpus } from "./corpus.mjs";
import { armStats, fromChecked, gateChecks, renderGate, type GateRow } from "./gate.mjs";

const cases = loadCorpus(join(process.cwd(), "docs/superpowers/eval/corpus")).map((c) => ({ ...c, deck: { ...c.deck, listFingerprint: "pinned" } }));
const ok = (section: SectionId): SectionVerdict => ({ section, status: "ok", failed: 0, total: 1 });
const no = (section: SectionId, reason = "over_budget"): SectionVerdict => ({ section, status: "refused", reason: reason as never, failed: 1, total: 1 });
const SECTIONS: SectionId[] = ["overview", "primer", "keyCards", "weaknesses"];
const verdicts = (refused: SectionId[]) => SECTIONS.map((s) => (refused.includes(s) ? no(s) : ok(s)));
const checked = (refused: SectionId[], over: Partial<CheckedSynopsis> = {}): CheckedSynopsis => ({
  verdicts: verdicts(refused),
  overview: refused.includes("overview") ? null : "Gishath makes dinosaurs.",
  primer: refused.includes("primer") ? null : { strategy: [], mulligan: { keep: [], sendBack: [] }, tips: [] },
  keyCards: refused.includes("keyCards") ? null : [],
  weaknesses: refused.includes("weaknesses") ? null : [],
  cards: {}, ...over,
});
const row = (first: SectionId[], left: SectionId[], over: Partial<CheckedSynopsis> = {}): GateRow => ({
  id: "gishath", usd: 0.05, ...(first.length ? { repairUsd: 0.03 } : {}), firstVerdicts: verdicts(first), rendered: checked(left, over),
});

describe("the gate counts what renders, after the repair", () => {
  it("separates the first write from the rendered rate, and counts what stays refused by reason", () => {
    const s = armStats("v8", [[row(["primer", "weaknesses"], ["weaknesses"]), row([], [])]], cases);
    expect([s.sections, s.firstOk, s.finalOk, s.allFour, s.repaired]).toEqual([8, 6, 7, 1, 1]);
    expect(s.firstBy).toEqual({ "primer:over_budget": 1, "weaknesses:over_budget": 1 });
    expect(s.leftBy).toEqual({ "weaknesses:over_budget": 1 });
    expect(s.usd).toBeCloseTo(0.05 * 2 + 0.03);
  });
  it("scores a refused section as empty, so a refusal costs recall instead of leaving the denominator", () => {
    const full = fromChecked(checked([], { keyCards: [{ card: "Gishath, Sun's Avatar", claims: [], job: "x" }] }));
    expect(full.keyCards).toHaveLength(1);
    const cut = fromChecked(checked(["keyCards", "primer", "weaknesses", "overview"]));
    expect(cut).toEqual({ overview: "", primer: { strategy: [], mulligan: { keep: [], sendBack: [] }, tips: [] }, keyCards: [], weaknesses: [] });
    const withKey = armStats("a", [[row([], [], { keyCards: [{ card: "Apex Altisaur", claims: [], job: "x" }] })]], cases);
    const without = armStats("a", [[row(["keyCards"], ["keyCards"])]], cases);
    expect(withKey.keyCards.gold).toBe(without.keyCards.gold);
    expect(withKey.keyCards.named).toBeGreaterThan(without.keyCards.named);
  });
  it("refuses a row recorded before the repair path existed rather than scoring it as repaired", () => {
    expect(() => armStats("old", [[{ id: "gishath" }]], cases)).toThrow(/no rendered content/);
  });
});

describe("the gate verdict", () => {
  const arm = (label: string, rows: GateRow[]) => armStats(label, [rows], cases);
  const clean = Array.from({ length: 8 }, () => row([], []));
  it("passes contract 8 only when it renders as much as 7 and is no worse on the corpus", () => {
    const checks = gateChecks(arm("v7", clean), arm("v8", clean));
    expect(checks.every((c) => c.pass)).toBe(true);
    expect(renderGate([arm("v7", clean), arm("v8", clean)], checks, 1)).toContain("**Gate: PASS.**");
  });
  it("fails on a rendered rate more than one section in 32 under 7's, and on the absolute floor", () => {
    const weak = Array.from({ length: 8 }, (_, i) => (i < 3 ? row(["primer"], ["primer"]) : row([], [])));
    const checks = gateChecks(arm("v7", clean), arm("v8", weak));
    expect(checks.filter((c) => !c.pass).map((c) => c.name)).toEqual(expect.arrayContaining([expect.stringContaining("within one section in 32")]));
    const floor = Array.from({ length: 8 }, () => row(["primer"], ["primer"]));
    expect(gateChecks(arm("v7", floor), arm("v8", floor)).find((c) => c.name.includes("at least"))!.pass).toBe(false);
  });
  it("fails when contract 8 claims something the corpus lists as wrong that 7 did not", () => {
    const cascade = Array.from({ length: 8 }, () => row([], [], { primer: { strategy: ["[[Gishath, Sun's Avatar]] cascades into the top of the library."], mulligan: { keep: [], sendBack: [] }, tips: [] } }));
    const checks = gateChecks(arm("v7", clean), arm("v8", cascade));
    expect(checks.find((c) => c.name.startsWith("wrong claims"))!.pass).toBe(false);
  });
});

describe("armStats — a failed call", () => {
  it("counts a failed call as an answer that rendered nothing, instead of throwing", () => {
    const cases = loadCorpus(join(process.cwd(), "docs/superpowers/eval/corpus"));
    const id = cases.find((c) => c.deck.listFingerprint !== null)!.id;
    const s = armStats("x", [[{ id, failed: "malformed", usd: 0.1 }]], cases);
    expect(s.answers).toBe(1);
    expect(s.finalOk).toBe(0);
    expect(s.sections).toBe(4);
    expect(s.leftBy["call:malformed"]).toBe(1);
  });
});
