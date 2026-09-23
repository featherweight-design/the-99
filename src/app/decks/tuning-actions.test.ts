import { beforeEach, describe, expect, it, vi } from "vitest";

// The actions are public endpoints: what the tests pin is what they do with a wire value that
// is not what the TypeScript type claims.
const calls = vi.hoisted(() => ({ inputs: 0, started: 0, applied: 0, saved: 0 }));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../../db", () => ({ db: {} }));
vi.mock("../../lib/decks/tuning-read", () => ({
  EVIDENCE_STEPS: ["games", "notes", "decklist", "intent"],
  tuningInputs: async () => {
    calls.inputs += 1;
    return { head: {}, games: [], intent: null, declared: null, fingerprint: "fp" };
  },
  // A deck whose last run saw exactly this fingerprint: the gate reads `unchanged`.
  readTuningState: async () => ({
    run: { id: "r", status: "ok" }, items: [], lastOkFingerprint: "fp", lastOkAt: new Date(),
    stale: false, versionMoved: false, allowance: { used: 0, limit: 5, reopensAt: null }, gameCount: 0,
  }),
  readEvidenceStep: async () => 1,
  readOwnedOracleIds: async () => new Set(),
  profileOfHead: async () => { throw new Error("stop after the gate"); },
  withBracketAfter: async () => [],
}));
vi.mock("../../lib/tuning/run-store", () => ({
  saveIntent: async () => { calls.saved += 1; return "saved"; },
  startRun: async () => { calls.started += 1; return { kind: "in_flight" }; },
  finishRun: async () => true,
  persistRun: async () => true,
  cancelRun: async () => true,
}));
vi.mock("../../lib/tuning/verdicts", () => ({
  applyItem: async () => { calls.applied += 1; return "deck"; },
  undoItem: async () => "deck",
  setDismissed: async () => "deck",
}));

import { applySuggestion, readTuningEvidence, runTuning, saveDeckIntent } from "./tuning-actions";

const DECK = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  calls.inputs = 0;
  calls.started = 0;
  calls.applied = 0;
  calls.saved = 0;
});

describe("runTuning's `anyway`", () => {
  it("passes the unchanged gate only for the literal true", async () => {
    await runTuning(DECK, { anyway: true });
    expect(calls.started).toBe(1);
  });

  it("treats a truthy non-boolean as absent, so the gate holds", async () => {
    for (const anyway of ["false", "true", 1, {}]) {
      const result = await runTuning(DECK, { anyway } as unknown as { anyway: boolean });
      expect(result.ok).toBe(false);
    }
    expect(calls.started).toBe(0);
  });
});

describe("ids off the wire", () => {
  it("refuses a deck id that is not a uuid before reading anything", async () => {
    expect((await runTuning("not-a-uuid")).ok).toBe(false);
    expect(calls.inputs).toBe(0);
  });

  it("refuses an item id that is not a uuid before writing anything", async () => {
    expect((await applySuggestion("1; drop table")).ok).toBe(false);
    expect(calls.applied).toBe(0);
  });

  it("reads no evidence step it does not know", async () => {
    expect(await readTuningEvidence(DECK, "collection" as never)).toBeNull();
    expect(await readTuningEvidence(DECK, "games")).toBe(1);
  });
});

describe("saveDeckIntent's field", () => {
  it("refuses a missing or non-text intent rather than clearing the line", async () => {
    const file = new FormData();
    file.set("intent", new Blob(["x"]), "intent.txt");
    for (const form of [new FormData(), file, null as unknown as FormData]) {
      expect((await saveDeckIntent(DECK, form)).ok).toBe(false);
    }
    expect(calls.saved).toBe(0);
  });

  it("saves a text intent, empty included, since clearing is a real edit", async () => {
    const form = new FormData();
    form.set("intent", "");
    expect((await saveDeckIntent(DECK, form)).ok).toBe(true);
    expect(calls.saved).toBe(1);
  });
});
