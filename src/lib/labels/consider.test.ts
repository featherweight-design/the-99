import { describe, expect, it } from "vitest";

import { filterConsider, labelDisagrees } from "./consider";
import type { Job } from "./types";

const job = (kind: string, space: Job["space"] = "role"): Job => ({
  space, kind, restrictedTo: null, affects: "self", to: null, method: null,
  trigger: "none", recurrence: "oneShot", threshold: null, modal: false,
} as Job);

const SPELL = { typeLine: "Artifact Creature — Golem" };

describe("labelDisagrees", () => {
  it("keeps a card with no fresh label: absence never reads as disagreement", () => {
    expect(labelDisagrees(undefined, SPELL, "removal")).toBe(false);
    expect(labelDisagrees([], SPELL, "removal")).toBe(false);
  });

  // Mirror Golem, offered as removal for exiling a graveyard card: its label is graveyard hate.
  it("disagrees when no job is the role the pick fills", () => {
    expect(labelDisagrees([job("graveyardHate", "theme"), job("protection", "theme")], SPELL, "removal")).toBe(true);
    expect(labelDisagrees([job("counters", "theme")], SPELL, "ramp")).toBe(true);
    expect(labelDisagrees([job("removal")], SPELL, "draw")).toBe(true);
  });

  it("agrees when any job is that role, and a counterspell fills removal", () => {
    expect(labelDisagrees([job("graveyardHate", "theme"), job("removal")], SPELL, "removal")).toBe(false);
    expect(labelDisagrees([job("counterspell")], SPELL, "removal")).toBe(false);
    expect(labelDisagrees([job("ramp")], SPELL, "ramp")).toBe(false);
  });

  // Escape Tunnel was a land pick 21 times with a label of ramp and evasion.
  it("never drops a land face, whatever its label says", () => {
    expect(labelDisagrees([job("ramp")], { typeLine: "Land" }, "land")).toBe(false);
  });

  it("never judges an EDHREC reason", () => {
    expect(labelDisagrees([job("ramp")], SPELL, "edhrec")).toBe(false);
  });
});

describe("filterConsider", () => {
  const OFF = [job("graveyardHate", "theme")];
  const labels = new Map<string, Job[]>([["role-pick", OFF], ["edhrec-pick", OFF], ["top-pick", OFF]]);
  const pick = (oracleId: string, reasonType: "edhrec" | "role", reason: "edhrec" | "removal") =>
    ({ oracleId, reasonType, reason, typeLine: SPELL.typeLine });

  it("drops only the role-gap pick; an EDHREC pick, a Top pick and an unlabelled pick stay", () => {
    const out = filterConsider([
      pick("edhrec-pick", "edhrec", "edhrec"),
      pick("role-pick", "role", "removal"),
      pick("top-pick", "edhrec", "edhrec"),
      pick("unlabelled", "role", "removal"),
    ], labels);
    expect(out.map((s) => s.oracleId)).toEqual(["edhrec-pick", "top-pick", "unlabelled"]);
  });
});
