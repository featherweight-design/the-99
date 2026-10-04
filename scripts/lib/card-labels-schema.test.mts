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

import { jobKey, normalizeJob, validateJob } from "../../src/lib/labels/schema.js";
import { METHOD_KINDS, RAMP_KINDS, ROLES, THEMES, TO_KINDS, type Job } from "../../src/lib/labels/types.js";

/** The union in the source file is the authority, not the RULES table beside it. */
const unionMembers = (file: string, decl: string) => {
  const src = readFileSync(file, "utf8");
  const at = src.indexOf(decl);
  if (at < 0) throw new Error(`${decl} not found in ${file} — the schema's source moved`);
  return [...src.slice(at, src.indexOf(";", at)).matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]);
};

// The label owns its vocabulary (the vocabulary plan's Task 2): it may name a kind the app's text
// reader does not (`tutor`, `counterspell`), but it must still carry every app member, in order.
const appMembersOf = (labels: readonly string[], app: string[]) => labels.filter((k) => app.includes(k));

describe("the label vocabulary is 2b's", () => {
  it("carries every Role in src/lib/recs/roles.ts, in order, beside any label-only role", () => {
    const app = unionMembers("src/lib/recs/roles.ts", "export type Role =");
    expect(appMembersOf(ROLES, app)).toEqual(app);
  });

  it("carries every Theme in src/lib/recs/themes.ts, in order, beside any label-only theme", () => {
    const app = unionMembers("src/lib/recs/themes.ts", "export type Theme =");
    expect(appMembersOf(THEMES, app)).toEqual(app);
  });

  it("would still pass with a label-only member added, and fails when an app member is dropped", () => {
    expect(appMembersOf(["ramp", "tutor", "draw"], ["ramp", "draw"])).toEqual(["ramp", "draw"]);
    expect(appMembersOf(["ramp"], ["ramp", "draw"])).not.toEqual(["ramp", "draw"]);
  });

  // `draw` is deliberately in both, which is why a job carries its space. If this
  // ever stops being true the space field may be removable -- but silently
  // merging the two would make a role hit indistinguishable from a theme hit.
  it("still has the collision the space field exists for", () => {
    const themes: readonly string[] = THEMES;
    expect(ROLES.filter((r) => themes.includes(r))).toEqual(["draw"]);
  });
});

describe("validateJob", () => {
  const warg = {
    space: "role" as const, kind: "ramp", rampKind: "makesTreasure",
    restrictedTo: null, affects: null, to: null, method: null, trigger: "combatDamage", recurrence: "oneShot",
    threshold: null, modal: true,
  };

  // `affects`, `to` and `method` (the vocabulary plan's Task 2) are REQUIRED and nullable, like
  // `restrictedTo`: an omitted key is an unanswered question, and the consumer gates on two of them.
  it("requires affects, to and method, and accepts null for each", () => {
    for (const field of ["affects", "to", "method"] as const) {
      const { [field]: _, ...missing } = warg;
      expect(validateJob(missing).some((p) => p.startsWith(`${field} is missing`))).toBe(true);
      expect(validateJob({ ...warg, [field]: null })).toEqual([]);
      expect(validateJob({ ...warg, [field]: "sideways" })).toContain(`${field} "sideways"`);
    }
  });

  it("accepts each value the consumer reads, on the jobs it belongs to", () => {
    const recursion = { ...warg, space: "theme" as const, kind: "recursion", rampKind: undefined };
    const removal = { ...warg, kind: "removal", rampKind: undefined };
    for (const affects of ["self", "opponents", "each"]) expect(validateJob({ ...warg, affects })).toEqual([]);
    for (const to of ["hand", "battlefield", "top"]) expect(validateJob({ ...recursion, to })).toEqual([]);
    for (const method of ["destroy", "exile", "bounce", "shrink"]) expect(validateJob({ ...removal, method })).toEqual([]);
  });

  // As `rampKind` is ramp's alone: the consumer gates on `to`, so one on a draw job would refuse a
  // stand-in for a reason the card does not have.
  it("refuses a to or a method on a job that cannot carry one", () => {
    expect(validateJob({ ...warg, to: "hand" })).toContain("to on a ramp job");
    expect(validateJob({ ...warg, method: "exile" })).toContain("method on a ramp job");
  });

  // The ONE repair (Hugh, 2026-10-04): a `to` or a `method` on a kind that does not take it says
  // nothing the consumer reads, so it is stripped and the rest of the job kept. `validateJob` stays
  // strict, which the case above pins, so the repair is visible as a separate step.
  describe("normalizeJob", () => {
    const theme = (kind: string) => ({ ...warg, space: "theme" as const, kind, rampKind: undefined });

    it("strips a to from a ramp job, which then validates", () => {
      const fixed = normalizeJob({ ...warg, to: "battlefield" });
      expect(fixed).toEqual({ ...warg, to: null });
      expect(validateJob(fixed)).toEqual([]);
    });

    it("strips a to from a castFree job and a method from a blink job", () => {
      const castFree = normalizeJob({ ...theme("castFree"), to: "battlefield" }) as Record<string, unknown>;
      expect(castFree.to).toBeNull();
      expect(validateJob(castFree)).toEqual([]);
      const blink = normalizeJob({ ...theme("blink"), method: "exile" }) as Record<string, unknown>;
      expect(blink.method).toBeNull();
      expect(validateJob(blink)).toEqual([]);
    });

    it("keeps a to on a tutor and a method on a removal job, where the consumer reads them", () => {
      const tutor = { ...warg, kind: "tutor", rampKind: undefined, to: "hand" };
      const removal = { ...warg, kind: "removal", rampKind: undefined, method: "exile" };
      expect(normalizeJob(tutor)).toBe(tutor);
      expect(normalizeJob(removal)).toBe(removal);
    });

    it("repairs nothing else: a misplaced to beside a real defect still fails", () => {
      const fixed = normalizeJob({
        ...warg, to: "battlefield", threshold: { stat: "creatures", op: ">=", value: "X" },
      });
      expect(validateJob(fixed)).toContain("threshold.value");
      expect(validateJob(fixed).some((p) => p.startsWith("to on a"))).toBe(false);
    });

    it("never mutates its input, and passes a non-object through for validateJob to refuse", () => {
      const given = { ...warg, to: "battlefield", method: "exile" };
      const fixed = normalizeJob(given);
      expect(given.to).toBe("battlefield");
      expect(given.method).toBe("exile");
      expect(fixed).not.toBe(given);
      expect(normalizeJob(null)).toBeNull();
      expect(normalizeJob("ramp")).toBe("ramp");
    });
  });

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
  const base: Job = {
    space: "role", kind: "ramp", rampKind: "tapsForMana", restrictedTo: null, affects: null, to: null, method: null,
    trigger: "none", recurrence: "repeatable", threshold: null, modal: false,
  };

  // The whole false match, reduced to one assertion: same job, different limits.
  it("separates Runadi's ramp from the Warg's", () => {
    const runadi = jobKey(base);
    const wargRamp = jobKey({ ...base, rampKind: "makesTreasure", trigger: "combatDamage", recurrence: "oneShot", modal: true });
    expect(runadi).not.toBe(wargRamp);
  });

  it("separates a Wolf-restricted counter from an unrestricted one", () => {
    // `rampKind` is DROPPED rather than set to undefined: the union forbids it on a theme
    // job, and the shared type is what makes that visible here.
    const { rampKind: _drop, ...limits } = base;
    const anyone = jobKey({ ...limits, kind: "counters", space: "theme" });
    const wolves = jobKey({ ...limits, kind: "counters", space: "theme", restrictedTo: "Wolf" });
    expect(anyone).not.toBe(wolves);
  });

  it("is equal for two jobs that genuinely agree", () => {
    expect(jobKey(base)).toBe(jobKey({ ...base }));
  });

  // The three consumer fields are part of a job's identity: self-mill and opponent-mill, a regrowth and a
  // reanimation, a bounce and an exile are different jobs, and a key that dropped one would merge them.
  it("separates jobs that differ only in affects, to or method", () => {
    expect(jobKey({ ...base, affects: "self" })).not.toBe(jobKey({ ...base, affects: "opponents" }));
    const recursion = { ...base, space: "theme", kind: "recursion", rampKind: undefined } as const;
    const removal = { ...base, space: "role", kind: "removal", rampKind: undefined } as const;
    expect(jobKey({ ...recursion, to: "hand" })).not.toBe(jobKey({ ...recursion, to: "battlefield" }));
    expect(jobKey({ ...removal, method: "bounce" })).not.toBe(jobKey({ ...removal, method: "exile" }));
    expect(jobKey({ ...base, affects: null })).not.toBe(jobKey({ ...base, affects: "each" }));
  });

  // INJECTIVITY. The joined form rendered `restrictedTo: null` and the literal string "-"
  // identically, and a value containing the `|` separator could shift the field
  // boundaries — either way two different labels produced one key and would have been
  // reported as agreeing. Neither shape occurs in the gold set, which is why nothing
  // caught it.
  it("separates a null restriction from the literal string that used to render the same", () => {
    expect(jobKey(base)).not.toBe(jobKey({ ...base, restrictedTo: "-" }));
  });

  it("does not let a restriction containing the old separator shift the fields", () => {
    const piped = jobKey({ ...base, restrictedTo: "a|b" });
    const shifted = jobKey({ ...base, restrictedTo: "a", trigger: "b" as typeof base.trigger });
    expect(piped).not.toBe(shifted);
  });

  // The one collapse that is DELIBERATE: an absent `rampKind` and an explicit null are the
  // same label, which is the rule `validateJob` applies too.
  it("treats an absent rampKind and an explicit null as one label", () => {
    const { rampKind: _drop, ...noKind } = base;
    expect(jobKey({ ...noKind, rampKind: null })).toBe(jobKey(noKind as typeof base));
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

  // Derived from E1's TYPE ALGEBRA, not from a copy of its kind names.
  // `SwapRole = Exclude<Role, "land" | "ramp"> | RampKind`, so anything `honestJobs`
  // returns that is NOT a coarse role IS a ramp kind — whatever it is called. A copied
  // list of four names would go stale the moment E1 added a fifth, and the test would
  // stay green while a divergence had actually closed. `ROLES` is itself pinned to
  // `src/lib/recs/roles.ts` by the first test in this file, so the derivation is held
  // at both ends.
  const COARSE = ROLES.filter((r) => r !== "land" && r !== "ramp");
  const coarse: readonly string[] = COARSE;
  const isRampKind = (role: string) => !coarse.includes(role);

  // TITLE SAYS THREE FIXTURES, because that is all this test visits.
  //
  // It cannot verify the report's 22/0/3 partition: doing that means running
  // `honestJobs` over all 25 ramp-labelled gold rows, which needs their oracle text,
  // which needs the catalog — a probe, not a unit test. So a FOURTH divergence
  // appearing, or an unlisted row's kind changing, leaves this green while that
  // measurement goes stale. The report says as much rather than implying coverage it
  // does not have, and an earlier title here ("every card E1 assigns no ramp kind to")
  // claimed exactly the completeness this does not establish.
  it("holds the three known divergences: E1 silent, label expected, note present", async () => {
    const { honestJobs } = await import("../../src/lib/swaps/honest");
    const { GOLD } = await import("./card-labels-gold.mjs");

    for (const fixture of DIVERGING) {
      const jobs = honestJobs(
        { ...fixture, layout: "normal", keywords: [] } as never,
        () => false,
        null,
      );
      const kinds = (jobs.roles as string[]).filter(isRampKind);
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

  // The prompt's "By job" rule for `affects`, which gate 2 depends on: a gold row that answers a kind
  // differently from the instruction would score a model wrong for following it. `each` is always allowed,
  // because the rule yields to a card that does the same for every player.
  it("answers affects by job, as the prompt instructs", async () => {
    const { GOLD } = await import("./card-labels-gold.mjs");
    const byJob: Record<string, string> = {
      clones: "self", pump: "self", protection: "self", fog: "self", recursion: "self", land: "self",
      removal: "opponents", counterspell: "opponents", theft: "opponents", graveyardHate: "opponents",
    };
    const off = GOLD.flatMap((r) => r.jobs
      .filter((x) => x.kind in byJob && x.affects !== byJob[x.kind] && x.affects !== "each")
      .map((x) => `${r.name} [${x.kind}=${x.affects}]`));
    expect(off).toEqual([]);
  });

  // A bar is a fact about the gold set: a job with few positives has a precision nobody can trust, and one
  // with no HARD NEGATIVES cannot measure over-labelling at all. The vocabulary plan's Task 4 floor, for every
  // job new or redefined by Task 3, every value d9 ruled in, and the five that had no gold case before.
  // A hard negative is a row picked FOR that job (`klass: "<key>Neg"`) that does not carry it.
  it("holds 8 positives and 4 hard negatives for every new, redefined or uncovered job", async () => {
    const { GOLD } = await import("./card-labels-gold.mjs");
    const keys = [
      "tutor", "counterspell", "graveyardHate", "discard", "stax", "clones", "theft", "poison", "goad",
      "doublers", "fog", "costReduction", "extraLandDrop", "multiplies", "sacrifice", "bottom",
      "drain", "removal", "protection", "castFree", "finisher", "tribal", "etbDraw", "blink", "deathTrigger",
    ];
    const carries = (r: (typeof GOLD)[number], k: string) =>
      (r.jobs as { kind: string; rampKind?: string | null; method?: string | null }[])
        .some((x) => x.kind === k || x.rampKind === k || x.method === k);
    const short = keys.flatMap((k) => {
      const positives = GOLD.filter((r) => carries(r, k)).length;
      const negatives = GOLD.filter((r) => r.klass === `${k}Neg` && !carries(r, k)).length;
      return positives >= 8 && negatives >= 4 ? [] : [`${k}: ${positives} positives, ${negatives} hard negatives`];
    });
    expect(short).toEqual([]);
  });

  // Every bar the scorer computes needs at least one gold case, or `stops` names it "unmeasured" on every
  // run and the gate can never be met, whatever the model answers. A null `affects` bar did exactly that
  // once the by-job rule left no gold row answering null.
  it("gives every job bar and every field bar at least one gold case", async () => {
    const { GOLD } = await import("./card-labels-gold.mjs");
    const { FIELD_VALUES, VOCABULARY_KEYS } = await import("./card-labels-bars.mjs");
    const jobs = GOLD.flatMap((r) => r.jobs as (Job & { rampKind?: string | null })[]);
    const seen = (f: string, v: string) => jobs.some((x) => {
      if (f === "rampKind") return x.kind === "ramp" && (x.rampKind ?? "none") === v;
      if (f === "to" && !TO_KINDS.includes(x.kind)) return false;
      if (f === "method" && !METHOD_KINDS.includes(x.kind)) return false;
      if (f === "restrictedTo") return (x.restrictedTo == null ? "none" : "restricted") === v;
      return String((x as Record<string, unknown>)[f] ?? "none") === v;
    });
    const unmeasured = [
      ...VOCABULARY_KEYS.filter((k) => !jobs.some((x) => `${x.space}:${x.kind}` === k)),
      ...Object.entries(FIELD_VALUES).flatMap(([f, vs]) => vs.filter((v) => !seen(f, v)).map((v) => `${f}=${v}`)),
    ];
    expect(unmeasured).toEqual([]);
  });

  it("covers every ramp kind, including the one it found", async () => {
    const { GOLD } = await import("./card-labels-gold.mjs");
    const kinds = new Set(
      GOLD.flatMap((r) => r.jobs as { rampKind?: string | null }[])
        .map((j) => j.rampKind)
        .filter(Boolean),
    );
    expect([...kinds].sort()).toEqual([...RAMP_KINDS].sort());
  });
});
