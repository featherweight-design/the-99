import { refusal, spent, type Ledger, type Limits } from "./ledger.mjs";

/**
 * The overview-stages run's spend rules, pure so they are tested (`overview-stages-guard.test.mts`).
 *
 * THE ASK LINE HOLDS REGARDLESS OF PROGRESS here: the shared `refusal` waives it once the run plan is
 * half done, which suits the campaigns that use it, but this test's plan is three short iterations, so
 * a call is refused at `spent >= askAtUsd` unless the orchestrator has answered the ask
 * (`--ask-approved`). The shared helper is called with the plan marked done, so it applies the hard cap
 * alone and its meaning for every other caller is unchanged.
 */
export function stagesSendRefusal(input: {
  ledger: Ledger; worstUsd: number; limits: Limits; askApproved: boolean; runSpendUsd: number; capUsd: number;
}): string | null {
  const hard = refusal(input.ledger, input.worstUsd, 1, input.limits);
  if (hard) return hard;
  const now = spent(input.ledger);
  if (!input.askApproved && input.limits.askAtUsd !== null && now >= input.limits.askAtUsd) {
    return `spent $${now.toFixed(2)}, at or over the $${input.limits.askAtUsd} ask line: stop and ask the orchestrator (rerun with --ask-approved once answered)`;
  }
  if (input.runSpendUsd + input.worstUsd > input.capUsd) {
    return `this run's cap of $${input.capUsd} would be crossed (spent $${input.runSpendUsd.toFixed(4)}, this call could cost $${input.worstUsd.toFixed(4)})`;
  }
  return null;
}

/**
 * What a call settles at. Its meter is trusted only for a call that came back whole on its first
 * attempt: a failed call (a timeout, a lost connection) or one retried after a failed attempt may have
 * been billed for more than its usage reports, so it settles at its worst-case reservation, as
 * `tuning-v2.mts` does.
 */
export function settleUsd(input: { ok: boolean; failedAttempts: number; meteredUsd: number | null; worstUsd: number }): number {
  return input.ok && input.failedAttempts === 0 && input.meteredUsd !== null ? input.meteredUsd : input.worstUsd;
}

/** Whether a `callModel` log line reports a failed attempt (the same lines `tuning-v2.mts` counts). */
export const isFailedAttemptLine = (line: string) => /^\[model\] (malformed|upstream|request|unexpected|configuration|retry skipped)/.test(line);
