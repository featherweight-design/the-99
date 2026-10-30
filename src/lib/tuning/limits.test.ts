import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { RESERVATION_TTL_MS } from "../model/allowance-rule";
import {
  ANSWER_TOKENS_WORST_CASE, ASK_PER_LIST, CUTS_MAX_TOKENS, CUTS_MODEL_TIMEOUT_MS, MODEL_TIMEOUT_MS, REAPER_CUTOFF_MS, THINKING_HEADROOM_TOKENS, TUNING_MAX_TOKENS,
  TUNING_RETRY_FLOOR_MS, V2_REAPER_CUTOFF_MS, V2_RUN_BUDGET_MS, intentTooLong, ownedCopyOffered, spareBeforeHeld, tieClosed,
} from "./limits";

/** The deck page's `maxDuration`, in ms. Read from the page's source: Next requires the export to be a literal, and
 *  importing the page would pull in the server. import.meta.url, not __dirname: Vitest runs tests as ESM. */
function pageLimitMs(): number {
  const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../app/decks/[id]/page.tsx"), "utf8");
  const match = page.match(/export const maxDuration = (\d+);/);
  expect(match).not.toBeNull();
  return Number(match![1]) * 1000;
}

// The deck page's maxDuration bounds the run's Server Action, so the model deadline must fit
// under it with room for the reads and writes around the call.
describe("MODEL_TIMEOUT_MS", () => {
  it("fits under the deck page's maxDuration, leaving time for the rest of the run", () => {
    const maxDurationMs = pageLimitMs();
    expect(MODEL_TIMEOUT_MS).toBeLessThan(maxDurationMs);
    expect(maxDurationMs - MODEL_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
  });

  it("is v10's 110s, unchanged by v2's limit (plan P1)", () => {
    expect(MODEL_TIMEOUT_MS).toBe(110_000);
    expect(REAPER_CUTOFF_MS).toBe(5 * 60 * 1000);
  });
});

// Plan P2: the page's limit is v2's, the run's budget sits under it with room for the writes, and the v2 reaper never
// reaps a run the platform could still be running.
describe("V2_RUN_BUDGET_MS", () => {
  it("is 600s's budget, less a margin for the writes", () => {
    const limit = pageLimitMs();
    expect(limit).toBe(600_000);
    expect(V2_RUN_BUDGET_MS).toBeLessThan(limit);
    expect(limit - V2_RUN_BUDGET_MS).toBeGreaterThanOrEqual(20_000);
  });

  it("is reaped only past the limit, and the unit is settled no later than its reservation stops counting", () => {
    expect(V2_REAPER_CUTOFF_MS).toBeGreaterThan(pageLimitMs());
    expect(V2_RUN_BUDGET_MS + 20_000).toBeLessThanOrEqual(RESERVATION_TTL_MS);
    // A run cannot outlive the request that reserved its unit, so the reservation outlives every live run.
    expect(pageLimitMs()).toBeLessThanOrEqual(RESERVATION_TTL_MS);
  });
});

// Proposed cuts' own ceiling and deadline (small items G2, d9's option b): Suggested changes keeps
// TUNING_MAX_TOKENS and MODEL_TIMEOUT_MS.
describe("CUTS_MODEL_TIMEOUT_MS", () => {
  const SLOWEST_TOKENS_PER_SECOND = 79; // measured on Sonnet 5 (TUNING_RETRY_FLOOR_MS); Sonnet 5.5's is unmeasured

  it("fits under the deck page's maxDuration with the same ~10s for the rest of the run", () => {
    // 600s since Suggested changes v2 (plan P2); the cuts deadline keeps its ~10s and more.
    const maxDurationMs = pageLimitMs();
    expect(maxDurationMs - CUTS_MODEL_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
  });

  it("holds a whole reply at the cuts ceiling at the slowest measured rate, and leaves Suggested changes as it was", () => {
    expect(CUTS_MAX_TOKENS).toBe(10_500);
    expect((CUTS_MAX_TOKENS / SLOWEST_TOKENS_PER_SECOND) * 1000).toBeLessThan(CUTS_MODEL_TIMEOUT_MS);
    expect([TUNING_MAX_TOKENS, MODEL_TIMEOUT_MS]).toEqual([8_000, 110_000]);
  });

  it("leaves a first attempt room to fail and still retry inside it", () => {
    expect(TUNING_RETRY_FLOOR_MS).toBeLessThan(CUTS_MODEL_TIMEOUT_MS);
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
    // The schema's caps, per line: the card, rationale, short rationale, four citations.
    const chars = 200 + 400 + 80 + 4 * 160;
    // About four characters a token, and about 60 tokens of JSON keys and punctuation.
    const perLine = Math.ceil(chars / 4) + 60;
    // The schema's own ceiling (ASK_PER_LIST in each of the two lists), not MAX_SUGGESTIONS (what is
    // kept): a reply can carry up to six a list before the app slices each down to five.
    expect(ANSWER_TOKENS_WORST_CASE).toBeGreaterThanOrEqual(perLine * ASK_PER_LIST * 2);
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


describe("ownedCopyOffered", () => {
  it("offers a free copy, or a card the read has no row for, under every owned-only run", () => {
    expect(ownedCopyOffered(1, {})).toBe(true);
    expect(ownedCopyOffered(undefined, {})).toBe(true);
  });

  it("offers a held copy only with Include my other decks", () => {
    expect(ownedCopyOffered(0, {})).toBe(false);
    expect(ownedCopyOffered(-1, { otherDecks: false })).toBe(false);
    expect(ownedCopyOffered(0, { otherDecks: true })).toBe(true);
    expect(ownedCopyOffered(-2, { otherDecks: true })).toBe(true);
  });
});

describe("spareBeforeHeld", () => {
  type R = { name: string; rank: number; held: boolean };
  const r = (name: string, rank: number, held = false): R => ({ name, rank, held });
  const order = (rows: R[]) => spareBeforeHeld(rows, (a, b) => a.rank === b.rank, (x) => x.held).map((x) => x.name);

  it("puts a spare copy ahead of a held one only among equally ranked cards", () => {
    expect(order([r("a", 3, true), r("b", 3), r("c", 3, true), r("d", 3)])).toEqual(["b", "d", "a", "c"]);
    // A held card ranked higher stays ahead: the ranking is the run's, the tie-break is all this decides.
    expect(order([r("a", 5, true), r("b", 3), r("c", 3, true), r("d", 1)])).toEqual(["a", "b", "c", "d"]);
  });

  it("leaves a list with no held card exactly as it was", () => {
    expect(order([r("a", 3), r("b", 3), r("c", 2)])).toEqual(["a", "b", "c"]);
    expect(order([])).toEqual([]);
  });
});

describe("tieClosed", () => {
  const same = (a: number, b: number) => a === b;

  it("stops at max with no held copy offered, since no tie can reorder", () => {
    expect(tieClosed([5, 3, 3], 2, same, false)).toBe(true);
  });

  it("keeps reading until the tier holds max cards", () => {
    expect(tieClosed([5, 4], 3, same, true)).toBe(false);
  });

  it("keeps reading while the last card read still ties the max-th, so a spare past a page boundary is seen", () => {
    expect(tieClosed([5, 3, 3], 2, same, true)).toBe(false);
    expect(tieClosed([5, 3, 3, 2], 2, same, true)).toBe(true);
    expect(tieClosed([5, 4, 3], 2, same, true)).toBe(true);
  });
});

