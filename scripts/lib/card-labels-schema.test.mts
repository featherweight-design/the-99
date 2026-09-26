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

  // THE THREE DIVERGENCES from E1's classifier, verified by RUNNING it.
  //
  // An earlier version of this test checked three hard-coded names and a phrase in
  // `why`, under a title claiming it verified E1's behaviour. It did not: a label
  // reverting to an E1-incompatible kind, or a fourth divergence appearing, left it
  // green. `honestJobs` needs no database -- the card, the creature-type predicate and
  // the deck lens are all arguments -- so the real classifier runs here on literal
  // oracle text, and the title is now true of what the test does.
  //
  // The text is a FIXTURE, not a catalog read: what is under test is E1's behaviour on
  // that text, and printed oracle text does not move. Each card also has to record its
  // divergence, because the report claims it does and that claim broke once already.
  const DIVERGING = [
    {
      name: "Dora Milaje Elite",
      expectKind: "tapsForMana",
      typeLine: "Creature — Human Berserker",
      // Its only mana is the token's REMINDER, which `usableText` strips.
      oracleText: "First strike\nWhen this creature enters, if an opponent controls more lands than you, create a tapped Vibranium token. (It's an artifact with indestructible and \"{T}: Add {C}. This mana can't be spent to cast a nonartifact spell.\")",
    },
    {
      name: "Weathered Wayfarer",
      expectKind: "fetchesLand",
      typeLine: "Creature — Human Nomad Cleric",
      // Fetches to HAND; E1's FETCHES requires `onto the battlefield`.
      oracleText: "{W}, {T}: Search your library for a land card, reveal it, put it into your hand, then shuffle. Activate only if an opponent controls more lands than you.",
    },
    {
      name: "Marshals' Pathcruiser",
      expectKind: "fetchesLand",
      typeLine: "Artifact — Vehicle",
      oracleText: "When this Vehicle enters, search your library for a basic land card, reveal it, put it into your hand, then shuffle.\nCrew 5",
    },
  ] as const;

  const RAMP_KIND_NAMES = ["tapsForMana", "fetchesLand", "makesTreasure", "burstMana"];

  it("documents every card E1 assigns no ramp kind to", async () => {
    const { honestJobs } = await import("../../src/lib/swaps/honest");
    const { GOLD } = await import("./card-labels-gold.mjs");

    for (const fixture of DIVERGING) {
      const jobs = honestJobs(
        { ...fixture, layout: "normal", keywords: [] } as never,
        () => false,
        null,
      );
      const kinds = (jobs.roles as string[]).filter((r) => RAMP_KIND_NAMES.includes(r));
      expect(kinds, `E1 now assigns ${fixture.name} a ramp kind — the divergence has closed, so the gold row and the report's 22/0/3 both need revisiting`).toEqual([]);

      const row = (GOLD as { name: string; why: string; jobs: { space: string; kind: string; rampKind?: string }[] }[])
        .find((r) => r.name === fixture.name);
      expect(row, `${fixture.name} is not in the gold set`).toBeTruthy();

      // THE LABEL ITSELF, not only its prose. An earlier version checked `why` alone,
      // so reverting Dora to `burstMana` stayed green while the report claimed a label
      // regression was caught — the claim was in the test's reply, not in the test.
      const ramp = row!.jobs.find((x) => x.space === "role" && x.kind === "ramp");
      expect(ramp, `${fixture.name} has no role:ramp job`).toBeTruthy();
      expect(ramp!.rampKind, `${fixture.name}'s ramp kind regressed`).toBe(fixture.expectKind);

      expect(row!.why, `${fixture.name} does not record that E1 assigns it no kind`)
        .toMatch(/E1 assigns (this card )?no (ramp job|kind)/);
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
