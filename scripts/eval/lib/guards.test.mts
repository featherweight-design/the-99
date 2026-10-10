import { join } from "node:path";

import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import { retryable } from "./batch.mjs";

import { DEFAULT_LIMITS, OVERVIEW_ACCURACY_LIMITS, readLedger, refusal, spent } from "./ledger.mjs";
import { costUsd, worstCaseUsd } from "./pricing.mjs";
import { DEV_COUNT, OVERLAY_COUNT, splitDecks } from "./split.mjs";

describe("costUsd", () => {
  it("prices every meter, and the batch halves all of them", () => {
    const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 };
    // Sonnet 5: 2 + 10 + 2 × 1.25 + 2 × 0.1
    expect(costUsd("claude-sonnet-5", usage, { batch: false })).toBeCloseTo(14.7);
    expect(costUsd("claude-sonnet-5", usage, { batch: true })).toBeCloseTo(7.35);
  });

  it("refuses to price a model it has no rate for, rather than calling it free", () => {
    expect(() => costUsd("claude-haiku-4-5-20251001", { input_tokens: 1, output_tokens: 1 }, { batch: true })).toThrow();
  });

  it("puts the worst case above any real reply: full ceiling, cache-write input, and a retry", () => {
    const real = costUsd("claude-haiku-4-5", { input_tokens: 4000, output_tokens: 3000 }, { batch: true });
    expect(worstCaseUsd("claude-haiku-4-5", 4000, 3000, { batch: true })).toBeGreaterThan(2 * real);
  });
});

describe("refusal", () => {
  const at = (usd: number) => ({ entries: [{ at: "", runId: "r", source: "s", usd, requests: 1 }] });
  it("stops a batch whose worst case would cross the cap", () => {
    expect(refusal(at(20), 6, 0.9)).toMatch(/cross/);
    expect(refusal(at(20), 4, 0.9)).toBeNull();
  });
  it("stops and asks at $15 before the plan is half done, not after", () => {
    expect(refusal(at(15), 0, 0.4)).toMatch(/ask/);
    expect(refusal(at(15), 0, 0.6)).toBeNull();
  });
});

describe("splitDecks", () => {
  const ids = Array.from({ length: 19 }, (_, i) => `deck-${String(i).padStart(2, "0")}`);
  it("is fixed by the ids alone, whatever order they arrive in", () => {
    expect(splitDecks([...ids].reverse())).toEqual(splitDecks(ids));
  });
  it("keeps development and held-out decks disjoint, and the overlay inside the held-out set", () => {
    const s = splitDecks(ids);
    expect(s.dev).toHaveLength(DEV_COUNT);
    expect(s.heldOut).toHaveLength(19 - DEV_COUNT);
    expect(s.dev.filter((d) => s.heldOut.includes(d))).toEqual([]);
    expect(s.overlay).toEqual(s.heldOut.slice(0, OVERLAY_COUNT));
  });
});

describe("acquireRunLock", () => {
  it("refuses a second run while the first holds the ledger", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { acquireRunLock } = await import("./ledger.mjs");
    const ledger = join(mkdtempSync(join(tmpdir(), "eval-lock-")), "ledger.jsonl");
    acquireRunLock(ledger);
    expect(() => acquireRunLock(ledger)).toThrow(/another run holds the ledger lock/);
  });
});

describe("spent", () => {
  const e = (over: object) => ({ at: "", runId: "r", source: "s", usd: 0, requests: 1, ...over });
  it("counts a pending batch's worst case until it settles, then only what it cost", () => {
    const pending = e({ usd: 5, pending: "r/a1" });
    expect(spent({ entries: [pending] })).toBe(5);
    expect(spent({ entries: [pending, e({ usd: 1.25, settles: "r/a1" })] })).toBe(1.25);
  });
});

describe("retryable (callModel's split)", () => {
  const h = new Headers();
  it("retries a rate limit, a server error and a lost connection", () => {
    expect(retryable(new Anthropic.RateLimitError(429, {}, "slow down", h))).toBe(true);
    expect(retryable(new Anthropic.InternalServerError(529, {}, "overloaded", h))).toBe(true);
    expect(retryable(new Anthropic.APIConnectionError({ message: "reset" }))).toBe(true);
  });
  it("never retries a timeout, an abort or a request the API refused", () => {
    expect(retryable(new Anthropic.APIConnectionTimeoutError())).toBe(false);
    expect(retryable(new Anthropic.APIUserAbortError())).toBe(false);
    expect(retryable(new Anthropic.BadRequestError(400, {}, "bad", h))).toBe(false);
    expect(retryable(new Anthropic.AuthenticationError(401, {}, "no key", h))).toBe(false);
  });
});

describe("refusal with the Overview accuracy limits", () => {
  const at = (usd: number) => ({ entries: [{ at: "", runId: "r", source: "s", usd, requests: 1 }] });
  it("stops at $15 and asks at $11, where the original campaign allows $25 and asks at $15", () => {
    expect(refusal(at(14), 2, 0.9, OVERVIEW_ACCURACY_LIMITS)).toMatch(/cross the \$15 cap/);
    expect(refusal(at(11), 0, 0.4, OVERVIEW_ACCURACY_LIMITS)).toMatch(/ask/);
    expect(refusal(at(11), 0, 0.6, OVERVIEW_ACCURACY_LIMITS)).toBeNull();
  });
  it("leaves the original ledger's behaviour as it was when no limits are passed", () => {
    expect(refusal(at(14), 2, 0.9)).toBeNull();
    expect(refusal(at(14), 2, 0.9, DEFAULT_LIMITS)).toBeNull();
    expect(refusal(at(24), 2, 0.9)).toMatch(/\$25 cap/);
  });
  it("the committed campaign ledger parses, holds at least the seeded $0.1031, and is under the cap", () => {
    const l = readLedger(join(process.cwd(), "docs/superpowers/eval/ledger-overview-accuracy.jsonl"));
    expect(spent(l)).toBeGreaterThanOrEqual(0.1031);
    expect(spent(l)).toBeLessThan(OVERVIEW_ACCURACY_LIMITS.hardCapUsd);
  });
});
