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

  // A theme job named `ramp` is not a role job named `ramp`; the rampKind rule
  // keys on both fields, and keying on `kind` alone would demand a kind here.
  it("does not demand a rampKind from a theme that happens to be named ramp", () => {
    const themeDraw = { ...warg, space: "theme" as const, kind: "draw", rampKind: undefined };
    expect(validateJob(themeDraw)).toEqual([]);
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
