import { describe, expect, it } from "vitest";

import { JOB_FIELDS } from "./schema";
import type { Job } from "./types";

/**
 * This file held a PARITY GUARD, tying the vocabulary here to a second copy in
 * `scripts/lib/card-labels-schema.mjs`. It is gone with the copy, which is what this PR is
 * for: every script in that graph is `.mts` now and imports `src/lib/labels`, so there is
 * one source and a guard over it would assert nothing.
 *
 * It was worth having for the one PR it existed. Written from memory instead of from the
 * file, `TRIGGERS` came out with `endStep` in it — a value no validator accepts — and in
 * the wrong order; the guard failed on its first run and named the array.
 *
 * What remains here is the half a single source cannot give you: `JOB_FIELDS` is the WIRE
 * key order, not a restatement of `Job`, so the two still have to be checked against each
 * other.
 */
describe("Job's fields are the wire format's fields", () => {
  // `Object.keys` reads the FIXTURE, not the type, so this catches a field added to or
  // dropped from `JOB_FIELDS`. The other direction — a field added to `Job` — is caught by
  // `pnpm typecheck` with TS2741 on the `Required<Job>` literal. Both were run.
  it("gives Job exactly the fields the wire format names, IN ORDER", () => {
    // Written in wire order, and compared WITHOUT sorting. Sorting both sides made the
    // assertion blind to a reorder of `JOB_FIELDS` — which is explicitly the wire key
    // order, so a reorder is the one change it exists to catch.
    const job: Required<Job> = {
      space: "role", kind: "ramp", rampKind: "tapsForMana", restrictedTo: null,
      trigger: "none", recurrence: "oneShot", threshold: null, modal: false,
    };
    expect(Object.keys(job)).toEqual([...JOB_FIELDS]);
  });
});

/**
 * The relationship `kind: Role | Theme` could not express. `validateJob` picks the
 * vocabulary BY `space`, so a role kind in theme space is rejected at runtime — and used
 * to typecheck. These are compile-time assertions with a runtime shell, because a type
 * error is the whole point: `@ts-expect-error` fails the build if the line it guards
 * starts compiling, which is what makes the union's collapse visible.
 */
describe("Job encodes the space-to-kind relationship the validator enforces", () => {
  const limits = {
    restrictedTo: null, trigger: "none", recurrence: "oneShot", threshold: null, modal: false,
  } as const;

  it("accepts a role kind in role space and a theme kind in theme space", () => {
    const role: Job = { space: "role", kind: "ramp", rampKind: "tapsForMana", ...limits };
    const theme: Job = { space: "theme", kind: "tribal", ...limits };
    expect([role.kind, theme.kind]).toEqual(["ramp", "tribal"]);
  });

  it("rejects a theme kind in role space", () => {
    // @ts-expect-error — `tribal` is a Theme, and this arm's kind is a Role
    const bad: Job = { space: "role", kind: "tribal", ...limits };
    expect(bad.space).toBe("role");
  });

  it("rejects a role kind in theme space", () => {
    // @ts-expect-error — `land` is a Role, and this arm's kind is a Theme
    const bad: Job = { space: "theme", kind: "land", ...limits };
    expect(bad.space).toBe("theme");
  });

  it("rejects a rampKind on a theme job", () => {
    // @ts-expect-error — rampKind belongs to the ramp role, not to theme space
    const bad: Job = { space: "theme", kind: "treasure", rampKind: "makesTreasure", ...limits };
    expect(bad.space).toBe("theme");
  });

  // The ramp field's own three cases. `validateJob` REQUIRES it on `role:ramp` — nullable,
  // since `undefined` fails its `RAMP_KINDS.includes` check — and accepts only `undefined`
  // or `null` on every other kind. A two-arm union got all three of these wrong.
  it("requires rampKind on a ramp job", () => {
    // @ts-expect-error — the validator rejects a ramp job with no rampKind
    const bad: Job = { space: "role", kind: "ramp", ...limits };
    expect(bad.kind).toBe("ramp");
  });

  it("accepts an explicit null rampKind on a ramp job", () => {
    const job: Job = { space: "role", kind: "ramp", rampKind: null, ...limits };
    expect(job.rampKind).toBeNull();
  });

  it("rejects a rampKind on a non-ramp role", () => {
    // @ts-expect-error — the validator accepts only undefined or null off the ramp role
    const bad: Job = { space: "role", kind: "draw", rampKind: "tapsForMana", ...limits };
    expect(bad.kind).toBe("draw");
  });

  // An explicit null IS accepted off the ramp role, which is why those arms are `?: null`
  // rather than `?: never` — the first fix used `never` and would have rejected this.
  it("accepts an explicit null rampKind off the ramp role", () => {
    const job: Job = { space: "role", kind: "draw", rampKind: null, ...limits };
    expect(job.rampKind).toBeNull();
  });
});
