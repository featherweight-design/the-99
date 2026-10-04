import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ANSWER_TOKENS_WORST_CASE, ASK_SUGGESTIONS, MODEL_TIMEOUT_MS, THINKING_HEADROOM_TOKENS, TUNING_MAX_TOKENS, TUNING_RETRY_FLOOR_MS, intentTooLong } from "./limits";

// The deck page's maxDuration bounds the run's Server Action, so the model deadline must fit
// under it with room for the reads and writes around the call. Read from the page's source:
// Next requires the export to be a literal, and importing the page would pull in the server.
describe("MODEL_TIMEOUT_MS", () => {
  it("fits under the deck page's maxDuration, leaving time for the rest of the run", () => {
    // import.meta.url, not __dirname: Vitest runs tests as ESM.
    const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../app/decks/[id]/page.tsx"), "utf8");
    const match = page.match(/export const maxDuration = (\d+);/);
    expect(match).not.toBeNull();
    const maxDurationMs = Number(match![1]) * 1000;
    expect(MODEL_TIMEOUT_MS).toBeLessThan(maxDurationMs);
    expect(maxDurationMs - MODEL_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
  });
});

describe("TUNING_RETRY_FLOOR_MS", () => {
  it("leaves a first attempt room to fail and still retry inside the deadline", () => {
    // A floor at or past the deadline would forbid every retry; one under the p50 attempt (32s)
    // would let most doomed retries start.
    expect(TUNING_RETRY_FLOOR_MS).toBeLessThan(MODEL_TIMEOUT_MS);
    expect(TUNING_RETRY_FLOOR_MS).toBeGreaterThan(32_000);
  });
});

describe("TUNING_MAX_TOKENS", () => {
  it("holds the schema's worst-case answer and room for adaptive thinking over it", () => {
    // The schema's caps, per suggestion: add, cut, rationale, short rationale, four citations.
    const chars = 200 + 200 + 400 + 80 + 4 * 160;
    // About four characters a token, and about 60 tokens of JSON keys and punctuation.
    const perSuggestion = Math.ceil(chars / 4) + 60;
    // The schema's own ceiling (ASK_SUGGESTIONS, H35 PR 4a), not MAX_SUGGESTIONS (what is kept):
    // a reply can carry up to eight suggestions before the app slices it down to five.
    expect(ANSWER_TOKENS_WORST_CASE).toBeGreaterThanOrEqual(perSuggestion * ASK_SUGGESTIONS);
    expect(TUNING_MAX_TOKENS).toBeGreaterThanOrEqual(ANSWER_TOKENS_WORST_CASE + THINKING_HEADROOM_TOKENS);
  });
});

describe("intentTooLong", () => {
  it("accepts a description at the cap (240, H35) and refuses one over it", () => {
    expect(intentTooLong("a".repeat(240))).toBe(false);
    expect(intentTooLong("a".repeat(241))).toBe(true);
    expect(intentTooLong("")).toBe(false);
  });

  it("counts code points, as the column does", () => {
    // 240 emoji are 480 UTF-16 units and 240 code points: the column stores them.
    expect(intentTooLong("🂡".repeat(240))).toBe(false);
    expect(intentTooLong("🂡".repeat(241))).toBe(true);
  });
});

