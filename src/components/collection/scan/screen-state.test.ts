import { describe, expect, it } from "vitest";
import { scanScreen, type ScanInputs } from "./screen-state";
import type { ServerState } from "../../../lib/scan/server-scan";

const SOL = { oracleId: "11111111-1111-4111-8111-111111111111", name: "Sol Ring", scryfallId: "s1", typeLine: "Artifact", imageUri: "https://img/sol", score: 0.97 };
const ARC = { ...SOL, oracleId: "22222222-2222-4222-8222-222222222222", name: "Arcane Signet", score: 0.95 };
const MIND = { ...SOL, oracleId: "33333333-3333-4333-8333-333333333333", name: "Mind Stone", score: 0.94 };
const match = (sure: boolean, guesses = [SOL, ARC, MIND]): ServerState => ({
  kind: "match", result: { kind: "match", index: "all", guesses, margin: sure ? 0.3 : 0.01, sure }, ms: 300, totalMs: 500,
});
const base: ScanInputs = { blocked: false, server: { kind: "idle" }, cardInView: false, dark: false, held: null, added: null, onList: new Map(), lastAdded: null, dismissed: null };
const panel = (over: Partial<ScanInputs>) => {
  const s = scanScreen({ ...base, ...over });
  if (s.kind !== "scanning") throw new Error("not scanning");
  return s.panel;
};
const guess = { oracleId: SOL.oracleId, name: "Sol Ring", typeLine: "Artifact", imageUri: "https://img/sol" };

describe("scanScreen", () => {
  it("is blocked whatever else is known", () => {
    expect(scanScreen({ ...base, blocked: true, server: match(true) })).toEqual({ kind: "blocked" });
  });

  it("looks with an empty frame, and is unsure while a card settles and is looked up", () => {
    expect(panel({})).toEqual({ kind: "looking" });
    expect(panel({ cardInView: true })).toEqual({ kind: "unsure", agreeing: 0 });
    expect(panel({ server: { kind: "looking" } })).toEqual({ kind: "unsure", agreeing: 1 });
    expect(panel({ server: { kind: "retrying" } })).toEqual({ kind: "unsure", agreeing: 2 });
  });

  it("offers a sure answer's first card, and the closest three when the margin did not clear", () => {
    expect(panel({ server: match(true) })).toEqual({ kind: "sure", guess, held: false, again: null });
    const ns = panel({ server: match(false) });
    expect(ns.kind === "notSure" && ns.guesses.map((g) => g.name)).toEqual(["Sol Ring", "Arcane Signet", "Mind Stone"]);
  });

  it("says a card still in view since it was added is a duplicate, and one that left and came back a second copy", () => {
    const onList = new Map([[SOL.oracleId, 1]]);
    expect(panel({ server: match(true), onList, lastAdded: { oracleId: SOL.oracleId, emptiedSince: false } })).toMatchObject({ again: { kind: "duplicate", count: 1 } });
    expect(panel({ server: match(true), onList, lastAdded: { oracleId: SOL.oracleId, emptiedSince: true } })).toMatchObject({ again: { kind: "second", count: 1 } });
    expect(panel({ server: match(true), onList, lastAdded: null })).toMatchObject({ again: { kind: "second", count: 1 } });
  });

  it("freezes a held guess over whatever the scanner now says, and shows an add until it clears", () => {
    expect(panel({ held: guess, server: { kind: "idle" } })).toEqual({ kind: "sure", guess, held: true, again: null });
    expect(panel({ added: { name: "Sol Ring" }, held: guess })).toEqual({ kind: "added", name: "Sol Ring" });
  });

  it("reads on past an answer turned down with None of these", () => {
    const s = match(false);
    const result = s.kind === "match" ? s.result : null;
    expect(panel({ server: s, dismissed: result })).toEqual({ kind: "unsure", agreeing: 0 });
    expect(panel({ server: match(false), dismissed: result })).toMatchObject({ kind: "notSure" });
  });

  it("goes back to looking on a refusal, a failure or an empty answer, and carries the dark flag", () => {
    expect(panel({ server: { kind: "failed" } })).toEqual({ kind: "looking" });
    expect(panel({ server: { kind: "refused", reason: "off" } })).toEqual({ kind: "looking" });
    expect(panel({ server: match(true, []) })).toEqual({ kind: "looking" });
    expect(scanScreen({ ...base, dark: true })).toMatchObject({ dark: true });
  });
});
