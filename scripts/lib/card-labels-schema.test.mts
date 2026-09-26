// The label schema's vocabulary is 2b's, not this lane's (confirmed 2026-09-25:
// "those two files as they stand on main, and nothing else"). A copy of a list
// drifts from its source silently, and the cost here is not a broken build --
// it is a SCORE THAT READS FINE. A theme dropped from this copy is a job the
// models are never scored on, and a theme invented here is one they are all
// marked wrong for missing. Either way the report's precision and recall are
// wrong in a direction nobody can see.
//
// So the vocabulary is asserted against the source files themselves.
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ROLES, THEMES, validateJob, jobKey } from "./card-labels-schema.mjs";

/** The union in the source file is the authority, not the RULES table beside it. */
const unionMembers = (file: string, decl: string) => {
  const src = readFileSync(file, "utf8");
  const at = src.indexOf(decl);
  if (at < 0) throw new Error(`${decl} not found in ${file} — the schema's source moved`);
  return [...src.slice(at, src.indexOf(";", at)).matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]);
};

describe("the label vocabulary is 2b's", () => {
  it("matches Role in src/lib/recs/roles.ts, in order", () => {
    expect(ROLES).toEqual(unionMembers("src/lib/recs/roles.ts", "export type Role ="));
  });

  it("matches Theme in src/lib/recs/themes.ts, in order", () => {
    expect(THEMES).toEqual(unionMembers("src/lib/recs/themes.ts", "export type Theme ="));
  });

  // `draw` is deliberately in both, which is why a job carries its space. If this
  // ever stops being true the space field may be removable -- but silently
  // merging the two would make a role hit indistinguishable from a theme hit.
  it("still has the collision the space field exists for", () => {
    expect(ROLES.filter((r) => THEMES.includes(r))).toEqual(["draw"]);
  });
});

describe("validateJob", () => {
  const warg = {
    space: "role" as const, kind: "ramp", rampKind: "makesTreasure",
    restrictedTo: null, trigger: "combatDamage", recurrence: "oneShot",
    threshold: null, modal: true,
  };

  it("accepts the Bejeweled Warg ramp job", () => {
    expect(validateJob(warg)).toEqual([]);
  });

  it("rejects an invented job rather than accommodating it", () => {
    expect(validateJob({ ...warg, kind: "sparkle" })).toContain('kind "sparkle" is not in role');
  });

  // A burst -- Generator Servant, Blood Pet -- fits none of E1's three kinds.
  // Recorded as null and counted, never forced into makesTreasure, which would
  // recreate the very false match the kinds exist to prevent.
  it("permits a null rampKind, which means no kind fits", () => {
    expect(validateJob({ ...warg, rampKind: null })).toEqual([]);
  });

  it("requires a rampKind on ramp, and forbids one elsewhere", () => {
    expect(validateJob({ ...warg, rampKind: undefined })).toContain('rampKind "undefined"');
    expect(validateJob({ ...warg, space: "theme", kind: "treasure" }))
      .toContain("rampKind on a non-ramp job");
  });

  // The rampKind rule keys on `kind === "ramp" && space === "role"`. The earlier
  // version of this test built `kind: "draw"`, so the `kind` half short-circuited
  // and the `space` half was never exercised -- rewriting the rule to key on
  // `kind` alone left the whole suite passing (a count is given deliberately: it
  // drifts, and a stale one reads as a claim about a suite that no longer exists).
  // A theme genuinely named `ramp` is
  // unconstructible (`ramp` is not in THEMES), so the assertion that can be made
  // is the pair: a role ramp missing its kind is rejected, and a theme job with
  // the same shape is not.
  // The rule keys on `kind === "ramp" && space === "role"`, and ONLY this input
  // separates that from keying on `kind` alone: `ramp` is not in THEMES, so a
  // theme job named `ramp` is already wrong about its kind, and the question is
  // whether it ALSO gets told off for a rampKind it has no business carrying.
  //
  // THREE earlier versions of this test could not tell the two rules apart. The
  // first built `kind: "draw"`, so the `kind` half short-circuited. The second
  // asserted a role ramp and a theme `counters`, neither of which reaches the
  // `space` half. The third duplicated the assertion in the test above and was
  // left in the file claiming to cover this. All three passed with a `kind`-only
  // rule, which is the defect.
  it("does not pile a rampKind complaint onto a theme job named ramp", () => {
    const problems = validateJob({ ...warg, space: "theme" as const, kind: "ramp", rampKind: undefined });
    expect(problems).toContain('kind "ramp" is not in theme');
    expect(problems.filter((p) => p.includes("rampKind"))).toEqual([]);
  });
});

describe("jobKey", () => {
  const base = {
    space: "role" as const, kind: "ramp", rampKind: "tapsForMana", restrictedTo: null,
    trigger: "none", recurrence: "repeatable", threshold: null, modal: false,
  };

  // The whole false match, reduced to one assertion: same job, different limits.
  it("separates Runadi's ramp from the Warg's", () => {
    const runadi = jobKey(base);
    const wargRamp = jobKey({ ...base, rampKind: "makesTreasure", trigger: "combatDamage", recurrence: "oneShot", modal: true });
    expect(runadi).not.toBe(wargRamp);
  });

  it("separates a Wolf-restricted counter from an unrestricted one", () => {
    const anyone = jobKey({ ...base, kind: "counters", space: "theme", rampKind: undefined });
    const wolves = jobKey({ ...base, kind: "counters", space: "theme", rampKind: undefined, restrictedTo: "Wolf" });
    expect(anyone).not.toBe(wolves);
  });

  it("is equal for two jobs that genuinely agree", () => {
    expect(jobKey(base)).toBe(jobKey({ ...base }));
  });
});

describe("the gold set", () => {
  it("is well formed, with reasoning on every row", async () => {
    const { validateGold } = await import("./card-labels-gold.mjs");
    expect(validateGold()).toEqual([]);
  });

  // The hard negatives are the rows where the right answer is NO jobs — a Saga's
  // lore counter, an artifact's charge counter. Without them the set cannot show
  // a model OVER-labelling, which is the failure mode that produced the false
  // matches in the first place.
  it("keeps hard negatives, or it cannot measure over-labelling", async () => {
    const { GOLD } = await import("./card-labels-gold.mjs");
    expect(GOLD.filter((r) => r.jobs.length === 0).length).toBeGreaterThanOrEqual(4);
  });

  // THE THREE DIVERGENCES from E1's classifier. The report claims each is "recorded in
  // its own `why`", and that claim broke the first time it was made: the note went on
  // `Weathered Wayfarer` and not on `Marshals' Pathcruiser`, its identical sibling.
  //
  // The list is hand-maintained rather than derived, deliberately. Deriving it needs
  // `honestJobs` and a database, which would make this a probe rather than a unit
  // test; the trade is that a FOURTH divergence would not be caught here. Measured
  // 2026-09-26: `honestJobs` agrees with 22 of the 25 ramp-labelled cards, contradicts
  // 0, and assigns no kind to exactly these three.
  it("documents every card E1 assigns no ramp kind to", async () => {
    const { GOLD } = await import("./card-labels-gold.mjs");
    const diverging = ["Dora Milaje Elite", "Weathered Wayfarer", "Marshals' Pathcruiser"];
    for (const name of diverging) {
      const row = (GOLD as { name: string; why: string }[]).find((r) => r.name === name);
      expect(row, `${name} is not in the gold set`).toBeTruthy();
      expect(row!.why, `${name} does not record that E1 assigns it no kind`)
        .toMatch(/E1 assigns (this card )?no (ramp job|kind)|E1 gives that card no ramp job/);
    }
  });

  it("covers all four ramp kinds, including the one it found", async () => {
    const { GOLD } = await import("./card-labels-gold.mjs");
    const kinds = new Set(
      GOLD.flatMap((r) => r.jobs as { rampKind?: string | null }[])
        .map((j) => j.rampKind)
        .filter(Boolean),
    );
    expect([...kinds].sort()).toEqual(["burstMana", "fetchesLand", "makesTreasure", "tapsForMana"]);
  });
});
