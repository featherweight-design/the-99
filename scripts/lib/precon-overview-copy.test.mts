import { describe, expect, it } from "vitest";
import { planPreconOverviewCopy, type SourceRow } from "./precon-overview-copy";

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
