import { describe, expect, it } from "vitest";

import { planCopy, type SourceLabel, type TargetCard } from "./copy";
import { labelInputHash, PROMPT_SYSTEM_SHA256 } from "./prompt";
import type { Job } from "./types";

const JOB: Job = {
  space: "role", kind: "ramp", rampKind: "tapsForMana", restrictedTo: null, affects: null, to: null, method: null,
  trigger: "none", recurrence: "repeatable", threshold: null, modal: false,
};
const card = (oracleId: string, over: Partial<TargetCard> = {}): TargetCard => ({
  oracleId, name: `Card ${oracleId}`, mana_cost: "{G}", type_line: "Creature — Elf Druid",
  oracle_text: "{T}: Add {G}.", layout: "normal", ...over,
});
/** A source row written for `c` as it stands, under `version` and `model`. */
const row = (c: TargetCard, over: Partial<SourceLabel> = {}, registry = PROMPT_SYSTEM_SHA256): SourceLabel => {
  const model = over.model ?? "m";
  const promptVersion = over.promptVersion ?? "8";
  return { oracleId: c.oracleId, labels: [JOB], model, promptVersion, inputHash: labelInputHash(c, model, promptVersion, registry), ...over };
};

describe("planCopy", () => {
  it("installs a row that is fresh against the target's own card", () => {
    const a = card("a");
    const p = planCopy([row(a)], [a], []);
    expect(p.install.map((r) => r.oracleId)).toEqual(["a"]);
    expect(p.mismatched).toEqual([]);
  });

  // The rule that matters: the target's card, never the source's. The two databases can hold
  // different catalog states, and a label describing text the target does not have is worse than
  // no label, because nothing downstream can tell it from a current one.
  it("refuses a row written for text the TARGET does not hold", () => {
    const a = card("a");
    const p = planCopy([row(a)], [card("a", { oracle_text: "{T}: Add {G}{G}." })], []);
    expect(p.install).toEqual([]);
    expect(p.mismatched).toEqual(["a"]);
  });

  // Version-aware freshness (Hugh, 2026-10-04): an older-version row that is fresh against the
  // target is copied, because the target judges it under its own version too and keeps it.
  it("installs a fresh row written under an older prompt version than the current one", () => {
    const V9 = { ...PROMPT_SYSTEM_SHA256, "9": "9".repeat(64) };
    const a = card("a");
    const b = card("b");
    const p = planCopy([row(a, { promptVersion: "8" }, V9), row(b, { promptVersion: "9" }, V9)], [a, b], [], V9);
    expect(p.install.map((r) => [r.oracleId, r.promptVersion])).toEqual([["a", "8"], ["b", "9"]]);
  });

  it("installs a fresh row written by another model than the target builds with", () => {
    const a = card("a");
    const p = planCopy([row(a, { model: "claude-haiku-4-5" })], [a], []);
    expect(p.install[0]).toMatchObject({ oracleId: "a", model: "claude-haiku-4-5" });
  });

  // An unknown version cannot be checked here; it is neither installed nor a catalog difference.
  it("reports a row of a version the registry does not hold, apart from mismatches", () => {
    const a = card("a");
    const p = planCopy([{ ...row(a), promptVersion: "7" }], [a], []);
    expect(p.install).toEqual([]);
    expect(p.mismatched).toEqual([]);
    expect(p.unknownVersion).toEqual(["a"]);
  });

  // Never a downgrade: a fresh target row of a newer version keeps its place, compared numerically.
  describe("a fresh target row of a newer prompt version", () => {
    const V = { ...PROMPT_SYSTEM_SHA256, "9": "9".repeat(64), "10": "a".repeat(64) };
    const a = card("a");
    const held = (version: string, c: TargetCard = a) => ({ ...row(c, { promptVersion: version }, V), oracleId: "a" });

    it("is not replaced by an older-version source row, and is reported", () => {
      const p = planCopy([row(a, { promptVersion: "9" }, V)], [a], [held("10")], V);
      expect(p.install).toEqual([]);
      expect(p.targetNewer).toEqual(["a"]);
      expect(p.mismatched).toEqual([]);
    });

    it("is replaced by an equal or newer source row", () => {
      expect(planCopy([row(a, { promptVersion: "10" }, V)], [a], [held("10")], V).install).toHaveLength(1);
      expect(planCopy([row(a, { promptVersion: "10" }, V)], [a], [held("9")], V).install).toHaveLength(1);
    });

    it("is replaced when it is itself stale against the target's card", () => {
      const stale = held("10", card("a", { oracle_text: "old text" }));
      const p = planCopy([row(a, { promptVersion: "9" }, V)], [a], [stale], V);
      expect(p.install.map((r) => r.oracleId)).toEqual(["a"]);
      expect(p.targetNewer).toEqual([]);
    });

    // A rollback, or an old manual run: this checkout knows v8 and v9, the target holds a v10 row.
    it("is not replaced when its newer version is one this checkout does not know", () => {
      const older = { ...PROMPT_SYSTEM_SHA256, "9": "9".repeat(64) };
      const p = planCopy([row(a, { promptVersion: "9" }, older)], [a], [held("10")], older);
      expect(p.install).toEqual([]);
      expect(p.targetNewer).toEqual(["a"]);
    });
  });

  // Task 4b as ruled: mismatches are REPORTED. The plan originally said they are "picked up by the
  // next db:build:labels against that target", which runs the model against production — the exact
  // thing pay-once exists to prevent, for labels that already exist on the source.
  it("reports mismatches rather than queueing them for anything", () => {
    const p = planCopy(
      [{ ...row(card("a")), inputHash: "x" }, { ...row(card("b")), inputHash: "y" }],
      [card("a"), card("b")],
      [],
    );
    expect(p.mismatched.sort()).toEqual(["a", "b"]);
    expect(p.install).toEqual([]);
    // The PROPERTY the name claims, which the two assertions above do not test: the plan has no
    // bucket that would feed a paid rebuild. Asserting the exact key set means reintroducing a
    // `rebuild`/`queue` field fails here, which is the thing Task 4b's edit exists to prevent.
    expect(Object.keys(p).sort())
      .toEqual(["absentFromSource", "install", "mismatched", "notInTargetCatalog", "targetNewer", "unknownVersion"]);
  });

  // Counted, not silent. A source generated against a newer catalog always carries some of these,
  // and the count is what distinguishes that from the target's catalog refresh having stopped.
  it("counts a card the target's catalog does not hold, and does not call it a mismatch", () => {
    const p = planCopy([row(card("ghost"))], [], []);
    expect(p.install).toEqual([]);
    expect(p.mismatched).toEqual([]);
    expect(p.notInTargetCatalog).toEqual(["ghost"]);
  });

  it("never deletes: a card the source has not labelled is reported and left alone", () => {
    const p = planCopy([], [card("a")], [{ oracleId: "a", model: "m", promptVersion: "8", inputHash: "h" }]);
    expect(p.install).toEqual([]);
    expect(p.absentFromSource).toEqual(["a"]);
  });

  it("carries the model and prompt version across, so a copied row says what produced it", () => {
    const a = card("a");
    const p = planCopy([row(a)], [a], []);
    expect(p.install[0]).toMatchObject({ model: "m", promptVersion: "8" });
  });

  it("plans nothing from an empty source", () => {
    const p = planCopy([], [card("a")], []);
    expect(p).toEqual({ install: [], mismatched: [], unknownVersion: [], targetNewer: [], notInTargetCatalog: [], absentFromSource: [] });
  });
});

/**
 * The composition the SCRIPT performs, not just the rule.
 *
 * `copy-card-labels.ts` passes the target's catalog rows the source has labelled. Round 5 of review
 * read an earlier version of that filter backwards and reported that every source row would land in
 * `notInTargetCatalog`. The only way to know is to run the composition rather than read it.
 */
describe("the script's composition installs a matching row", () => {
  const llanowar = card("aaa", { name: "Llanowar Elves" });
  const notInSource = card("zzz", { name: "Not In Source" });

  /** Exactly the filter in `copy-card-labels.ts`. */
  const targetCardsFor = (catalog: TargetCard[], src: SourceLabel[]) => {
    const labelled = new Set(src.map((r) => r.oracleId));
    return catalog.filter((c) => labelled.has(c.oracleId));
  };

  it("installs a source row that is fresh against the target's own card", () => {
    const src = [row(llanowar, { model: "claude-sonnet-4-5" })];
    const plan = planCopy(src, targetCardsFor([llanowar, notInSource], src), []);
    expect(plan.install.map((r) => r.oracleId)).toEqual(["aaa"]);
    expect(plan.notInTargetCatalog).toEqual([]);
  });

  it("still reports a source row the target's catalog does not hold", () => {
    const src = [row(card("ghost"))];
    const plan = planCopy(src, targetCardsFor([llanowar], src), []);
    expect(plan.install).toEqual([]);
    expect(plan.notInTargetCatalog).toEqual(["ghost"]);
  });
});
