import { describe, expect, it } from "vitest";

import * as scripts from "../../../scripts/lib/card-labels-schema.mjs";
import {
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
describe("the stored label vocabulary is the one the validator enforces", () => {
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
