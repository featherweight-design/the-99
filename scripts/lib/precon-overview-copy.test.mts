import { describe, expect, it } from "vitest";
import { planPreconOverviewCopy, planReadingCopy, type SourceRow } from "./precon-overview-copy";
import { PROFILE_VERSION } from "../../src/lib/profile/version";
import { BRACKET_RULES_VERSION } from "../../src/lib/bracket/rules-version";

const src = (file: string, inputHash: string, listFingerprint = `list-${file}`): SourceRow<string> => ({
  file, inputHash, listFingerprint, model: "m", content: `content-${file}`, inputTokens: 1, outputTokens: 1, costMicroUsd: 1,
});
const req = (file: string, hash: string, list = `list-${file}`) => ({ file, ok: true as const, hash, list });

describe("planPreconOverviewCopy", () => {
  it("installs a source row only when the target's own request hashes to it, on the same list", () => {
    const plan = planPreconOverviewCopy({
      source: [src("a", "h1"), src("b", "h2"), src("c", "h3", "other-list")],
      target: [],
      requests: [req("a", "h1"), req("b", "moved"), req("c", "h3"), req("d", "h4")],
    });
    expect(plan.install.map((r) => r.file)).toEqual(["a"]);
    expect(plan.drifted).toEqual(["b", "c"]);
    expect(plan.missing).toEqual(["d"]);
  });

  it("leaves a fitting current row alone and re-stamps one a re-check had marked not current", () => {
    const plan = planPreconOverviewCopy({
      source: [src("a", "h1"), src("b", "h2")],
      target: [{ file: "a", inputHash: "h1", current: true }, { file: "b", inputHash: "h2", current: false }],
      requests: [req("a", "h1"), req("b", "h2")],
    });
    expect(plan.fresh).toBe(1);
    expect(plan.restamp).toEqual(["b"]);
    expect(plan.install).toEqual([]);
  });

  it("replaces an installed row whose inputs moved with the source's when that fits, and marks it stale only when nothing does", () => {
    const plan = planPreconOverviewCopy({
      source: [src("a", "new"), src("b", "old")],
      target: [{ file: "a", inputHash: "old", current: true }, { file: "b", inputHash: "old", current: true }],
      requests: [req("a", "new"), req("b", "newer")],
    });
    // `a` is REPLACED by the source's fitting row, so it is installed and never also marked stale
    // (the publish would otherwise undo its own install); `b` has nothing to replace it.
    expect(plan.install.map((r) => r.file)).toEqual(["a"]);
    expect(plan.stale).toEqual(["b"]);
    expect(plan.drifted).toEqual(["b"]);
  });

  it("marks a current row stale when the target can no longer build its request at all", () => {
    const plan = planPreconOverviewCopy({
      source: [src("a", "h1")],
      target: [{ file: "a", inputHash: "h1", current: true }],
      requests: [{ file: "a", ok: false, why: "card is not a legal commander" }],
    });
    expect(plan.stale).toEqual(["a"]);
    expect(plan.unbuildable).toEqual([{ file: "a", why: "card is not a legal commander" }]);
    expect(plan.install).toEqual([]);
  });
});

describe("planReadingCopy (small items 5, PR 6a)", () => {
  // A reading current for list-<file>, unless told otherwise.
  const held = (file: string, list = `list-${file}`) => ({ file, reading: { reading: { commanderOracleIds: [] } as never, readingPermits: [2], readingList: list, readingCatalog: "1", readingProfileVersion: PROFILE_VERSION, readingRulesVersion: BRACKET_RULES_VERSION, readingAnalyzedOracleIds: [], readingSeenSeq: 1, readingAt: new Date() } });
  const none = (file: string) => ({ file, reading: null });
  const plan = (install: string[]) => ({ install: install.map((f) => src(f, "h")) });
  // What each precon gets now: a whole reading of list-<file>, or none for a short list.
  const whole = (file: string, list = `list-${file}`) => held(file, list).reading;
  const empty = { reading: null, readingPermits: null, readingList: null, readingCatalog: null, readingProfileVersion: null, readingRulesVersion: null, readingAnalyzedOracleIds: null, readingSeenSeq: null, readingAt: null };
  const next = (...files: string[]) => new Map(files.map((f) => [f, whole(f)]));

  it("writes the target's reading for every row the publish leaves whose reading is missing or not current", () => {
    const out = planReadingCopy({
      plan: plan(["new"]),
      target: [held("ok"), none("empty"), held("moved-list", "old-list"), held("ghost")],
      requests: [req("ok", "h"), req("empty", "h"), req("moved-list", "h"), req("new", "h"), req("no-row", "h")],
      moved: new Set(),
      next: new Map([...next("ok", "empty", "new", "no-row"), ["moved-list", whole("moved-list", "list-moved-list")]]),
    });
    expect(out).toEqual(["empty", "moved-list", "new"]);
  });
  it("writes one whose data moved, even with its Overview's hash unchanged", () => {
    expect(planReadingCopy({ plan: plan([]), target: [held("a")], requests: [req("a", "h")], moved: new Set(["a"]), next: next("a") })).toEqual(["a"]);
  });
  it("leaves a precon the target cannot build as it is", () => {
    expect(planReadingCopy({ plan: plan([]), target: [none("a")], requests: [{ file: "a", ok: false, why: "x" }], moved: new Set(), next: new Map() })).toEqual([]);
  });
  it("clears a stored reading of a short list (Analyze would refuse it), and writes nothing where none is stored", () => {
    const shortNow = new Map([["short", empty], ["never", empty]]);
    expect(planReadingCopy({ plan: plan([]), target: [held("short"), none("never")], requests: [req("short", "h"), req("never", "h")], moved: new Set(), next: shortNow })).toEqual(["short"]);
  });
});
