import { describe, expect, it, vi } from "vitest";

import type { Job } from "../labels/types";
import { applyConsiderLabels, considerLabels, DEFAULT_DEPS, type ConsiderLabelDeps } from "./consider-labels";

const GRAVEYARD_HATE: Job = {
  space: "theme", kind: "graveyardHate", restrictedTo: null, affects: "opponents", to: null, method: null,
  trigger: "activated", recurrence: "repeatable", threshold: null, modal: false,
} as Job;

const deps = (enabled: boolean): ConsiderLabelDeps => ({
  enabled: vi.fn(() => enabled),
  readLabels: vi.fn(async () => new Map([["lantern", [GRAVEYARD_HATE]]])),
});

const SUGGESTIONS = [
  { oracleId: "lantern", reason: "removal" as const, reasonType: "role" as const, typeLine: "Artifact" },
  { oracleId: "staple", reason: "edhrec" as const, reasonType: "edhrec" as const, typeLine: "Instant" },
];
const ARGS = { suggestionIds: SUGGESTIONS.map((s) => s.oracleId) };

describe("considerLabels", () => {
  it("off: reads nothing and answers null, so the suggestions pass through as the same list", async () => {
    const d = deps(false);
    const read = await considerLabels(ARGS, d);
    expect(read).toBeNull();
    expect(d.readLabels).not.toHaveBeenCalled();
    expect(applyConsiderLabels(SUGGESTIONS, read)).toBe(SUGGESTIONS);
  });

  // The default deps read the switch per request, exactly 'true' and nothing else. Asserted on
  // `enabled()` itself: a considerLabels call with no ids answers null whichever way the switch is.
  it("reads the default switch per request, on only for exactly 'true'", () => {
    try {
      for (const [value, on] of [["true", true], ["1", false], ["TRUE", false], ["", false]] as const) {
        vi.stubEnv("LABEL_SURFACES_ENABLED", value);
        expect(DEFAULT_DEPS.enabled()).toBe(on);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("on: calls readLabels once, with exactly the suggestion ids", async () => {
    const d = deps(true);
    await considerLabels(ARGS, d);
    expect(d.readLabels).toHaveBeenCalledTimes(1);
    expect(d.readLabels).toHaveBeenCalledWith(["lantern", "staple"]);
  });

  it("on: drops the graveyard-hate card offered as removal and keeps the EDHREC pick", async () => {
    const read = await considerLabels(ARGS, deps(true));
    expect(applyConsiderLabels(SUGGESTIONS, read).map((s) => s.oracleId)).toEqual(["staple"]);
  });

  // An empty list would draw "every card that fits is already in this deck", which a label drop makes false.
  it("leaves the list alone when the filter would empty it", async () => {
    const onlyRole = [SUGGESTIONS[0]];
    const read = await considerLabels({ suggestionIds: ["lantern"] }, deps(true));
    expect(applyConsiderLabels(onlyRole, read)).toBe(onlyRole);
  });

  it("on with no suggestions: reads nothing", async () => {
    const d = deps(true);
    expect(await considerLabels({ suggestionIds: [] }, d)).toBeNull();
    expect(d.readLabels).not.toHaveBeenCalled();
  });
});
