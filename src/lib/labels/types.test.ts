import { describe, expect, it } from "vitest";

import * as scripts from "../../../scripts/lib/card-labels-schema.mjs";
import {
  type Job,
  RAMP_KINDS, RECURRENCE, ROLES, SPACES, THEMES, THRESHOLD_OPS, THRESHOLD_STATS, TRIGGERS,
} from "./types";

/**
 * ONE vocabulary, in two files, because the validator has to run in a plain `.mjs`
 * script and the stored column needs a TypeScript type. Nothing stops those two drifting
 * except this test — and a drift here is SILENT in the worst way: the model would be
 * validated against one list while the consumer's types promised another, so a kind the
 * script accepts would flow into a column whose type says it cannot be there.
 *
 * `burstMana` is the case on record. It was added to the scripts vocabulary after the
 * gold set found the gap; a TypeScript copy written before that and never revisited
 * would have made every `burstMana` row unreachable to the matcher.
 */
/** The rows below, by name — so coverage can be asserted rather than assumed. */
const COMPARED = [
  "ROLES", "THEMES", "SPACES", "RAMP_KINDS", "TRIGGERS", "RECURRENCE",
  "THRESHOLD_OPS", "THRESHOLD_STATS",
] as const;

describe("the stored label vocabulary is the one the validator enforces", () => {
  // COVERAGE, which the first version asserted nothing about: it was eight hand-written
  // rows, so a list present in one module and absent from the other was invisible rather
  // than failing. `JOB_FIELDS` is the case on record — the `.mjs` exports it, nothing
  // here mirrored it, and a ninth list added to either file would have drifted silently.
  //
  // `JOB_FIELDS` is deliberately NOT compared: it is the wire key order the prompt and
  // the collector share, not a vocabulary the stored type constrains, and `Job`'s keys
  // are checked against it below instead.
  it("compares every vocabulary the validator exports", () => {
    const exported = Object.keys(scripts).filter((k) => Array.isArray((scripts as Record<string, unknown>)[k]));
    expect([...exported].sort()).toEqual([...COMPARED, "JOB_FIELDS"].sort());
  });

  // And `Job`'s own keys are the wire keys, which is the relationship `JOB_FIELDS`
  // actually has to the stored type. A field added to one and not the other is how a
  // model's answer reaches the column and is then invisible to every reader.
  //
  // **This guard is split across two tools, and mutating it is how that was found.**
  // `Object.keys` reads the FIXTURE, not the type, so adding `certainty: number` to
  // `Job` failed nothing here — `pnpm typecheck` catches that direction, with TS2741
  // on the literal (and an excess-property error when a field is REMOVED from `Job`).
  // What the assertion below catches is the OTHER side: a field added to or dropped
  // from `JOB_FIELDS` in the `.mjs`, which typecheck cannot see. Both were run.
  it("gives Job exactly the fields the wire format names", () => {
    const job: Required<Job> = {
      space: "role", kind: "ramp", rampKind: "tapsForMana", restrictedTo: null,
      trigger: "none", recurrence: "oneShot", threshold: null, modal: false,
    };
    expect(Object.keys(job).sort()).toEqual([...scripts.JOB_FIELDS].sort());
  });

  for (const [name, ts, js] of [
    ["ROLES", ROLES, scripts.ROLES],
    ["THEMES", THEMES, scripts.THEMES],
    ["SPACES", SPACES, scripts.SPACES],
    ["RAMP_KINDS", RAMP_KINDS, scripts.RAMP_KINDS],
    ["TRIGGERS", TRIGGERS, scripts.TRIGGERS],
    ["RECURRENCE", RECURRENCE, scripts.RECURRENCE],
    ["THRESHOLD_OPS", THRESHOLD_OPS, scripts.THRESHOLD_OPS],
    ["THRESHOLD_STATS", THRESHOLD_STATS, scripts.THRESHOLD_STATS],
  ] as const) {
    // ORDER as well as membership: `THEMES` mirrors THEME_ORDER, and the report's
    // tables are read positionally elsewhere, so a reordering is a real difference.
    it(`${name} matches scripts/lib/card-labels-schema.mjs, in order`, () => {
      expect([...ts]).toEqual(js);
    });
  }
});
