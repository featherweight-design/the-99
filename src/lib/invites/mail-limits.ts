/**
 * What every app email through Resend must pass before it is fetched (`sendMail`, the one place a send leaves the app). SERVER-ONLY.
 *
 * Two walls, both counted in `rate_hits` (`src/lib/rate/`), so no new table:
 *  1. per RECIPIENT: 3 an hour and 10 a day (`mail-recipient`, `mail-recipient-day`), keyed on the address folded by
 *     `foldEmail` (so `a+1@gmail.com` and `a.b@gmail.com` share a count) and then hashed: an address is never stored or logged;
 *  2. a global DAILY cap (`mail-all-day`), the number from `RESEND_DAILY_SEND_CAP` (default 70, the free plan's 100 a day
 *     shared with Concert Crawl, less margin). At 80% of it one Sentry warning; past it nothing is sent until the UTC day ends.
 *
 * A send is COUNTED when it is attempted, before Resend answers: a refused or failed send still spent the allowance, which is
 * the safe side of a cost cap. The recipient walls come first, so one noisy inbox cannot spend everyone's day. A counting
 * failure lets the send through (fail open, reported once), as every counter in `src/lib/rate/` does.
 */
import { createHmac } from "node:crypto";
import { anonSalt } from "../rate/anon";
import { recordHit, sweepAfterResponse } from "../rate/observe";
import { overLimit, RATE_RULES, retryAfterSec } from "../rate/rules";
import { captureServerError, captureServerWarning } from "../sentry/capture";
import { logEvent } from "../sentry/log-event";
import { foldEmail } from "./rules";

/** The free plan's default: Resend's 100 a day, shared with Concert Crawl, less margin. */
export const DEFAULT_DAILY_MAIL_CAP = 70;

/** The shared `rate_hits` key for the global count. Not a Clerk id, `anon:` or `code:` key, so it collides with none. */
export const MAIL_ALL_KEY = "mail:all";

/** The day's cap: `RESEND_DAILY_SEND_CAP` when it is a positive whole number, else the free plan's default. */
export function mailDailyCap(raw: string | undefined = process.env.RESEND_DAILY_SEND_CAP): number {
  const text = raw?.trim() ?? "";
  // Digits only: `Number` would take "1e3", "0x10" and "+5", and "1e308" would make the cap no cap.
  const n = /^\d{1,7}$/.test(text) ? Number(text) : 0;
  return n > 0 ? n : DEFAULT_DAILY_MAIL_CAP;
}

/** The hit that reaches 80% of `cap`: the single warning of a day. */
export function reachesWarning(hits: number, cap: number): boolean {
  return hits === Math.ceil(cap * 0.8);
}

/** The `rate_hits` key for one recipient: the folded address, hashed with the deployment's salt, never stored. */
export function recipientKey(to: string, salt: string = anonSalt()): string {
  return "mail:" + createHmac("sha256", salt).update(foldEmail(to)).digest("hex").slice(0, 16);
}

export type MailRefusal = { reason: "limited"; waitSec: number } | { reason: "capped" };

let reportedFailure = false;

/**
 * Null to send, or why not: `limited` (this recipient is over 3 an hour or 10 a day; `waitSec` until the refusing window
 * ends) or `capped` (the day's ceiling is spent).
 */
export async function mailRefusal(to: string, now: Date = new Date()): Promise<MailRefusal | null> {
  try {
    const key = recipientKey(to);
    for (const bucket of ["mail-recipient", "mail-recipient-day"] as const) {
      const hits = await recordHit(key, bucket, now, false);
      // Each recipient's key is its own row, so the retention sweep (every aged row, anyone's) runs after the response, as the
      // anonymous counters do; without it a rotating writer's rows would stay.
      sweepAfterResponse(bucket, now);
      if (overLimit(hits, RATE_RULES[bucket])) {
        if (hits === RATE_RULES[bucket].limit + 1) console.warn(`[mail] recipient refused bucket=${bucket}`);
        return { reason: "limited", waitSec: retryAfterSec(now, RATE_RULES[bucket]) };
      }
    }
    const cap = mailDailyCap();
    const sent = await recordHit(MAIL_ALL_KEY, "mail-all-day", now, false);
    if (reachesWarning(sent, cap)) {
      console.warn(`[mail] daily send cap at 80% (${sent} of ${cap})`);
      captureServerWarning("mail-cap", "Daily mail cap reached 80%");
      logEvent("mail.cap_hit", { level: "warning", cap }, "warn");
    }
    if (sent > cap) {
      if (sent === cap + 1) {
        console.warn(`[mail] daily send cap reached (${cap})`);
        captureServerWarning("mail-cap", "Daily mail cap reached");
        logEvent("mail.cap_hit", { level: "reached", cap }, "warn");
      }
      return { reason: "capped" };
    }
    return null;
  } catch (err) {
    if (!reportedFailure) {
      reportedFailure = true;
      captureServerError("mail-limits", err);
    }
    return null;
  }
}
