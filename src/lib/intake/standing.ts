import { creditsCopy } from "../copy/credits";
import { helpMeChooseCopy as copy } from "../copy/help-me-choose";
import { hasCredit, type Allowance } from "../model/allowance-rule";
import { creditCount, creditFirst, creditLineKind, creditSpent, type LineAllowance } from "../model/credit-line";

/**
 * A player's credit standing as Help me choose's surfaces draw it: the form's press (rework plan
 * PR 3, F7) and the results panel. Pure and client-safe.
 */

/** The allowance as the page read it, serialized: dates as ISO strings. */
export type Standing = {
  used: number;
  limit: number;
  nextAt: string | null;
  reopensAt: string | null;
  ownerShare: boolean;
  /** Paid credits left, as the `Allowance` carries them: absent while the player holds no lot. */
  plan?: number;
  pack?: number;
  /** The paid limit's counter, as the `Allowance` carries it: `hasCredit` shuts paid credits at it. */
  paidUsedToday?: number;
  paidLimit?: number;
  /** When the paid limit has room again, and when a cancelled plan's credits lapse (ISO), as the `Allowance` carries them. */
  paidBackAt?: string | null;
  planExpiresAt?: string | null;
  /** `PAYMENTS_ENABLED` for this reader: whether a spent line offers `Get more credits`. */
  payments?: boolean;
  now: string;
};

export function toStanding(a: Allowance, now: Date): Standing {
  return {
    used: a.used,
    limit: a.limit,
    nextAt: a.nextAt?.toISOString() ?? null,
    reopensAt: a.reopensAt?.toISOString() ?? null,
    ownerShare: a.ownerShare === true,
    ...(a.plan !== undefined ? { plan: a.plan } : {}),
    ...(a.pack !== undefined ? { pack: a.pack } : {}),
    ...(a.paidUsedToday !== undefined ? { paidUsedToday: a.paidUsedToday } : {}),
    ...(a.paidLimit !== undefined ? { paidLimit: a.paidLimit } : {}),
    ...(a.paidBackAt ? { paidBackAt: a.paidBackAt.toISOString() } : {}),
    ...(a.planExpiresAt ? { planExpiresAt: a.planExpiresAt.toISOString() } : {}),
    ...(a.payments !== undefined ? { payments: a.payments } : {}),
    now: now.toISOString(),
  };
}

/** The Standing as the credit line's rule reads it: dates back from their ISO strings. */
export function lineOf(s: Standing): LineAllowance {
  const at = (v: string | null | undefined) => (v ? new Date(v) : null);
  return {
    used: s.used, limit: s.limit, nextAt: at(s.nextAt), reopensAt: at(s.reopensAt),
    plan: s.plan, pack: s.pack, paidUsedToday: s.paidUsedToday, paidLimit: s.paidLimit,
    paidBackAt: at(s.paidBackAt), planExpiresAt: at(s.planExpiresAt), payments: s.payments,
  };
}

/** Why a press is closed, in the tuning panel's precedence: the owner's share, then spent. */
export type Closed = "ownerShare" | "spent" | null;

export function closedBy(s: Standing): Closed {
  if (s.ownerShare) return "ownerShare";
  return hasCredit(s) ? null : "spent";
}

/** The line under the results panel's press, by allowance (STATES "Credit line, by allowance"). */
export function standingLine(s: Standing): string {
  switch (closedBy(s)) {
    case "ownerShare": return creditsCopy.ownerShare(new Date(s.now));
    case "spent": return creditSpent(lineOf(s));
    default: return creditFirst(lineOf(s), new Date(s.now));
  }
}

/**
 * The count alone: `4 of 5 left · reset at 2:01 AM`. Spent, it is 0, never negative when more are
 * out than the limit, and the time is when the next credit returns: the oldest counted unit's
 * leaving, which is later than the next one's then.
 */
export function bareStanding(s: Standing): string {
  const line = lineOf(s);
  // At the paid limit the count would hide the banked paid credits and show the free reset (L5 says both).
  if (creditLineKind(line) === "limit") return creditSpent(line);
  // The FREE count and its reset time (and, once paid credits are held, the paid total): what this line counts.
  return creditCount(line, new Date(s.now));
}

/**
 * The line under the FORM's press (states 7b, 7c, 7n): what pressing will do with the words. A credit
 * free is the shared first-use line; none left says the words will not be read and when one comes
 * back; the owner's share says why, as the results panel does.
 */
export function formLine(s: Standing): string {
  if (closedBy(s) !== "spent") return standingLine(s);
  // At the paid limit the words say so (L5); otherwise the form's own spent line, with `Get more credits` under it while payments are on (L4).
  if (creditLineKind(lineOf(s)) === "limit") return creditSpent(lineOf(s));
  const line = copy.intake.extra.spentLine(bareStanding(s));
  return creditsCopy.withMore(line, s.payments === true);
}
