import { describe, expect, it, vi } from "vitest";

import type { Job } from "../labels/types";
import { applyConsiderLabels, considerLabels, type ConsiderLabelDeps } from "./consider-labels";

const GRAVEYARD_HATE: Job = {
  space: "theme", kind: "graveyardHate", restrictedTo: null, affects: "opponents", to: null, method: null,
  trigger: "activated", recurrence: "repeatable", threshold: null, modal: false,
} as Job;

const deps = (): ConsiderLabelDeps => ({
  readLabels: vi.fn(async () => new Map([["lantern", [GRAVEYARD_HATE]]])),
});

const SUGGESTIONS = [
  { oracleId: "lantern", reason: "removal" as const, reasonType: "role" as const, typeLine: "Artifact" },
  { oracleId: "staple", reason: "edhrec" as const, reasonType: "edhrec" as const, typeLine: "Instant" },
];
const ARGS = { suggestionIds: SUGGESTIONS.map((s) => s.oracleId) };

describe("considerLabels", () => {
  it("calls readLabels once, with exactly the suggestion ids", async () => {
    const d = deps();
    await considerLabels(ARGS, d);
    expect(d.readLabels).toHaveBeenCalledTimes(1);
    expect(d.readLabels).toHaveBeenCalledWith(["lantern", "staple"]);
  });

  it("drops the graveyard-hate card offered as removal and keeps the EDHREC pick", async () => {
    const read = await considerLabels(ARGS, deps());
    expect(applyConsiderLabels(SUGGESTIONS, read).map((s) => s.oracleId)).toEqual(["staple"]);
  });

  // An empty list would draw "every card that fits is already in this deck", which a label drop makes false.
  it("leaves the list alone when the filter would empty it", async () => {
    const onlyRole = [SUGGESTIONS[0]];
    const read = await considerLabels({ suggestionIds: ["lantern"] }, deps());
    expect(applyConsiderLabels(onlyRole, read)).toBe(onlyRole);
  });

  // A failed read is caught to null on the page: the suggestions pass through as the same list.
  it("a null read passes the suggestions through as the same list", () => {
    expect(applyConsiderLabels(SUGGESTIONS, null)).toBe(SUGGESTIONS);
  });

  it("with no suggestions: reads nothing", async () => {
    const d = deps();
    expect(await considerLabels({ suggestionIds: [] }, d)).toBeNull();
    expect(d.readLabels).not.toHaveBeenCalled();
  });
});
