"use server";

import { headers } from "next/headers";
import { db } from "../db";
import { playerFeedback } from "../db/schema";
import { requireUserId } from "../lib/auth";
import { feedbackEnabled } from "../lib/feedback/flag";
import { deviceSummary, parseReport } from "../lib/feedback/report-rule";
import { observeHit } from "../lib/rate/observe";
import { requestSwitchEnv } from "../lib/switches/request";

// Report a problem (flyer trial PR 5; handoff `Report-Phone`, `Report-Desktop`). One row per report in `feedback`
// (kind `problem`, migration 0199); the account's rows leave with it (`purgeAccount`). The page is a path with any link
// token replaced, the device a coarse line, never the raw user agent. The reader's words are stored and shown to the
// admin only; they reach no model prompt, so none of this goes through `playerText`.

/** `invalid` is a refusal that wrote nothing; `off` is the switch (the form is not drawn then). */
export type ReportOutcome = { ok: true } | { ok: false; reason: "invalid" | "off" };

export async function sendProblemReport(input: {
  what: unknown;
  doing: unknown;
  page: unknown;
  source: unknown;
  digest: unknown;
  sentryEventId: unknown;
}): Promise<ReportOutcome> {
  const userId = await requireUserId();
  if (!feedbackEnabled(await requestSwitchEnv(userId))) return { ok: false, reason: "off" };
  const report = input && typeof input === "object" ? parseReport(input) : null;
  if (!report) return { ok: false, reason: "invalid" };
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
