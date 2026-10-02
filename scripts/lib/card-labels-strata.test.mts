import { describe, expect, it } from "vitest";

import { RAMP_KINDS, ROLES, THEMES } from "../../src/lib/labels/types.js";
import { STRATA } from "./card-labels-strata.mjs";

// The label-only jobs the text reader names none of: a random draw gives them almost no instances, so
// each needs its own stratum or its bar is scored on a handful of cards.
const APP_ROLES = ["ramp", "draw", "removal", "wipes", "land"];
const APP_THEMES = THEMES.slice(0, THEMES.indexOf("tribal") + 1);
const APP_RAMP_KINDS = ["tapsForMana", "fetchesLand", "makesTreasure", "burstMana"];

describe("the re-sample strata", () => {
  it("draw a stratum for every label-only job and ramp kind, and for each of d9's rulings", () => {
    const labelOnly = [
      ...ROLES.filter((r) => !APP_ROLES.includes(r)),
      ...THEMES.filter((t) => !APP_THEMES.includes(t)),
      ...RAMP_KINDS.filter((k) => !APP_RAMP_KINDS.includes(k)),
    ];
    const rulings = ["sacrifice", "bottom", "shroud"];
    expect([...labelOnly, ...rulings].filter((k) => !(k in STRATA))).toEqual([]);
  });
});
