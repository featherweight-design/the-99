import { describe, expect, it } from "vitest";

import type { LedgerEntry } from "./ledger.mjs";
import { isFailedAttemptLine, settleUsd, stagesSendRefusal } from "./overview-stages-guard.mjs";

const LIMITS = { hardCapUsd: 2, askAtUsd: 1.5 };
const at = (usd: number) => ({ entries: [{ at: "t", runId: "r", source: "realtime:1", usd, requests: 1 } satisfies LedgerEntry] });
const base = { worstUsd: 0.2, limits: LIMITS, askApproved: false, runSpendUsd: 0, capUsd: 1 };

describe("overview-stages send refusal", () => {
  it("sends under the ask line", () => {
    expect(stagesSendRefusal({ ...base, ledger: at(1.2) })).toBeNull();
  });
  it("refuses at the ask line whatever the plan's progress, until the ask is approved", () => {
    expect(stagesSendRefusal({ ...base, ledger: at(1.5) })).toMatch(/ask line/);
    expect(stagesSendRefusal({ ...base, ledger: at(1.6) })).toMatch(/--ask-approved/);
    expect(stagesSendRefusal({ ...base, ledger: at(1.6), askApproved: true })).toBeNull();
  });
  it("holds the hard cap even with the ask approved", () => {
    expect(stagesSendRefusal({ ...base, ledger: at(1.9), askApproved: true })).toMatch(/cross the \$2 cap/);
  });
  it("holds the run's own cap", () => {
    expect(stagesSendRefusal({ ...base, ledger: at(0), runSpendUsd: 0.9 })).toMatch(/this run's cap of \$1/);
  });
});

describe("overview-stages settlement", () => {
  it("trusts the meter only for a whole first attempt", () => {
    expect(settleUsd({ ok: true, failedAttempts: 0, meteredUsd: 0.04, worstUsd: 0.37 })).toBe(0.04);
    expect(settleUsd({ ok: true, failedAttempts: 1, meteredUsd: 0.04, worstUsd: 0.37 })).toBe(0.37);
    expect(settleUsd({ ok: false, failedAttempts: 0, meteredUsd: 0.04, worstUsd: 0.37 })).toBe(0.37);
    expect(settleUsd({ ok: true, failedAttempts: 0, meteredUsd: null, worstUsd: 0.37 })).toBe(0.37);
  });
  it("counts the client's failed-attempt lines and nothing else", () => {
    expect(isFailedAttemptLine("[model] malformed: x")).toBe(true);
    expect(isFailedAttemptLine("[model] upstream: 529 overloaded")).toBe(true);
    expect(isFailedAttemptLine("[model] onResponse threw: x")).toBe(false);
  });
});
