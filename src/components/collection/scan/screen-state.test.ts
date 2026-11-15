import { describe, expect, it } from "vitest";
import { scanLoading, scanScreen, type ScanInputs } from "./screen-state";
import type { FileLoad, ModelLoad } from "../../../lib/scan/model-progress";
import type { ServerState } from "../../../lib/scan/server-scan";

const SOL = { oracleId: "11111111-1111-4111-8111-111111111111", name: "Sol Ring", scryfallId: "s1", typeLine: "Artifact", imageUri: "https://img/sol", score: 0.97, printings: [] };
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

describe("scanLoading (loading L1-L4)", () => {
  const f = (over: Partial<FileLoad>): FileLoad => ({ from: "probe", loaded: 0, total: null, done: false, ...over });
  const load = (detector: Partial<FileLoad>, embedder: Partial<FileLoad>, over: Partial<ModelLoad> = {}): ModelLoad => ({
    id: 1, files: { detector: f(detector), embedder: f(embedder) }, cacheless: false, settled: false, ...over,
  });

  it("loading L1 the moment a file downloads, counting both downloads against their total", () => {
    const l = load({ from: "network", loaded: 1_000_000, total: 3_185_226 }, { from: "network", loaded: 500_000, total: 14_756_557 });
    expect(scanLoading(l, false, false)).toEqual({ kind: "download", done: 1_500_000, total: 17_941_783, firstLine: true });
  });

  it("loading L1 counts only the file still downloading when the other is cached", () => {
    const l = load({ from: "cache", done: true }, { from: "network", loaded: 7, total: 14_756_557 });
    expect(scanLoading(l, false, true)).toMatchObject({ kind: "download", done: 7, total: 14_756_557 });
  });

  it("loading L1 with no total known: no figures (an indeterminate bar)", () => {
    expect(scanLoading(load({ from: "network", loaded: 9, total: null }, { from: "cache" }), false, false)).toMatchObject({ kind: "download", total: null });
  });

  it("drops the first-time line where the page has no Cache Storage", () => {
    const l = load({ from: "network" }, { from: "network" }, { cacheless: true });
    expect(scanLoading(l, false, false)).toMatchObject({ firstLine: false });
  });

  it("loading L2 once every downloaded byte is in, until the scanner can read", () => {
    const l = load({ from: "network", loaded: 3, total: 3, done: true }, { from: "cache", done: true });
    expect(scanLoading(l, false, false)).toEqual({ kind: "almost", done: 3, total: 3, firstLine: true });
  });

  it("loading L3 (the shipped looking panel) once the scanner can read", () => {
    expect(scanLoading(load({ from: "network", done: true }, { from: "network", done: true }), true, true)).toBeNull();
    expect(scanLoading(null, true, true)).toBeNull();
  });

  it("a cached open holds the looking panel for 400ms, then loading L4", () => {
    const cached = load({ from: "cache" }, { from: "cache" });
    expect(scanLoading(cached, false, false)).toBeNull();
    expect(scanLoading(cached, false, true)).toEqual({ kind: "reopen" });
    expect(scanLoading(null, false, true)).toEqual({ kind: "reopen" });
  });

  it("a load that failed keeps its loading L1 while the next frame tries again", () => {
    const failed = load({ from: "network", loaded: 9, total: 20 }, { from: "network", loaded: 4, total: 30 }, { settled: true });
    expect(scanLoading(failed, false, true)).toMatchObject({ kind: "download", done: 13, total: 50 });
  });
});
