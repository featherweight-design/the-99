"use server";

import { headers } from "next/headers";
import { db } from "../db";
import { playerFeedback } from "../db/schema";
import { currentUserId } from "../lib/auth";
import { feedbackEnabled } from "../lib/feedback/flag";
import { deviceSummary, parseReport } from "../lib/feedback/report-rule";
import { overAnonymousLimit } from "../lib/rate/anon";
import { observeHit } from "../lib/rate/observe";
import { requestSwitchEnv } from "../lib/switches/request";
import { resolveSwitchEnv } from "../lib/switches/snapshot";

// Report a problem (flyer trial PR 5; handoff `Report-Phone`, `Report-Desktop`). One row per report in `feedback`
// (kind `problem`, migration 0199); the account's rows leave with it (`purgeAccount`); a signed-out visitor's row has no user and no purge touches it. The page is a path with any link
// token replaced, the device a coarse line, never the raw user agent. The reader's words are stored and shown to the
// admin only; they reach no model prompt, so none of this goes through `playerText`.

/** `invalid` wrote nothing; `off` is the switch (the form is not drawn then); `limited` is a signed-out visitor over the per-network cap. */
export type ReportOutcome = { ok: true } | { ok: false; reason: "invalid" | "off" | "limited" };

type ReportInput = Parameters<typeof parseReport>[0];

export async function sendProblemReport(input: {
  what: unknown;
  doing: unknown;
  page: unknown;
  source: unknown;
  digest: unknown;
  sentryEventId: unknown;
}): Promise<ReportOutcome> {
  const userId = await currentUserId();
  if (userId === null) return sendSignedOutReport(input);
  if (!feedbackEnabled(await requestSwitchEnv(userId))) return { ok: false, reason: "off" };
  const report = input && typeof input === "object" ? parseReport(input) : null;
  // `report` marks a row filed signed out with no user; a signed-in caller cannot claim it.
  if (!report || report.source === "report") return { ok: false, reason: "invalid" };
  await observeHit(userId, "feedback");
  await db.insert(playerFeedback).values({
    userId,
    kind: "problem",
    answers: { what: report.what, doing: report.doing },
    page: report.page,
    device: deviceSummary((await headers()).get("user-agent")),
    digest: report.digest,
    sentryEventId: report.sentryEventId,
    source: report.source,
  });
  return { ok: true };
}

/**
 * A report from a visitor with no account (the public /report page). The switch is decided for nobody
 * (`resolveSwitchEnv(null)`: the variable and the app-wide override). The row has no user and `source` `report`; the
 * network address is used only to count the visit in `rate_hits` (a daily hash) and is never stored here. Enforced
 * limits: 10 an hour (`report-anon`) AND 30 a day (`report-anon-day`) per network, the day counted only after the hour passes, fail open. The
 * words typed are stored and read in /admin only; they reach no model prompt, so no `playerText`.
 */
async function sendSignedOutReport(input: ReportInput): Promise<ReportOutcome> {
  if (!feedbackEnabled(await resolveSwitchEnv(null))) return { ok: false, reason: "off" };
  const report = input && typeof input === "object" ? parseReport({ ...input, source: "report" }) : null;
  if (!report) return { ok: false, reason: "invalid" };
  const h = await headers();
  // The day is counted only for a visit the hour let through, so a refused burst cannot spend the day's allowance.
  if (await overAnonymousLimit(h, "report-anon")) return { ok: false, reason: "limited" };
  if (await overAnonymousLimit(h, "report-anon-day")) return { ok: false, reason: "limited" };
  await db.insert(playerFeedback).values({
    userId: null,
    kind: "problem",
    answers: { what: report.what, doing: report.doing },
    page: report.page,
    device: deviceSummary(h.get("user-agent")),
    digest: report.digest,
    sentryEventId: report.sentryEventId,
    source: "report",
  });
  return { ok: true };
}
