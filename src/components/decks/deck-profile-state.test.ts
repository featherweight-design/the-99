import { describe, expect, it } from "vitest";
import { deckProfile } from "./__fixtures__/deck-profile";
import { tuningReading, type ProfileState, type Reading } from "./deck-profile-state";

const reading = (over: Partial<Reading> = {}): Reading =>
  ({ profile: deckProfile(), analyzedAt: "2026-01-02T00:00:00.000Z", fresh: true, versionNumber: null, ...over });
const ready = (over: Partial<Reading> = {}): ProfileState => ({ kind: "ready", ...reading(over) });

// Hugh, 2026-10-14: Tuning stays put before, during and after an analysis, and is handed no reading until the verdict
// paints, so Suggested changes stays dimmed through a first press's held write. These walks were the Analysis panel's
// hub-slot tests before tool discovery B2 moved the hub to its own tab.
describe("tuningReading", () => {
  type Step = { state: ProfileState; hold?: "reading" | "writing" | null; has: boolean };
  const walk = (steps: Step[]) => {
    for (const step of steps) expect(tuningReading(step.state, step.hold ?? null) !== null).toBe(step.has);
  };

  it("a first press that holds through the overview write", () => {
    walk([
      { state: { kind: "idle" }, has: false },
      { state: { kind: "loading", held: null }, hold: "reading", has: false },
      { state: ready(), hold: "writing", has: false },
      { state: ready(), hold: null, has: true },
    ]);
  });

  it("a press with no hold, a failure, a refusal and a re-analysis", () => {
    walk([
      { state: { kind: "idle" }, has: false },
      { state: { kind: "loading", held: null }, has: false },
      { state: { kind: "failed", held: null }, has: false },
      { state: { kind: "illegal", built: 98, size: 99, held: null }, has: false },
      { state: ready(), has: true },
      { state: { kind: "loading", held: reading() }, has: true },
      { state: ready({ fresh: false }), has: true },
    ]);
  });
});
