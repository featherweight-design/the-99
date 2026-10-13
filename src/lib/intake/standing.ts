import { creditsCopy } from "../copy/credits";
import { helpMeChooseCopy as copy } from "../copy/help-me-choose";
import { freeRoom, hasCredit, type Allowance } from "../model/allowance-rule";

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
  /** The 1st of next month, while the app-wide spend cap refuses every call. */
  paused: string | null;
  ownerShare: boolean;
  /** Paid credits left, as the `Allowance` carries them: absent while the player holds no lot. */
  plan?: number;
  pack?: number;
  now: string;
};

export function toStanding(a: Allowance, now: Date): Standing {
  return {
    used: a.used,
    limit: a.limit,
    nextAt: a.nextAt?.toISOString() ?? null,
    reopensAt: a.reopensAt?.toISOString() ?? null,
    paused: a.paused?.until.toISOString() ?? null,
    ownerShare: a.ownerShare === true,
    ...(a.plan !== undefined ? { plan: a.plan } : {}),
    ...(a.pack !== undefined ? { pack: a.pack } : {}),
    now: now.toISOString(),
  };
}

/** Why a press is closed, in the tuning panel's precedence: paused, the owner's share, spent. */
export type Closed = "paused" | "ownerShare" | "spent" | null;

export function closedBy(s: Standing): Closed {
  if (s.paused) return "paused";
  if (s.ownerShare) return "ownerShare";
  return hasCredit(s) ? null : "spent";
}

/** The line under the results panel's press, by allowance (STATES "Credit line, by allowance"). */
export function standingLine(s: Standing): string {
  const next = s.nextAt ? new Date(s.nextAt) : null;
  switch (closedBy(s)) {
    case "paused": return creditsCopy.paused(new Date(s.paused!));
    case "ownerShare": return creditsCopy.ownerShare(new Date(s.now));
    case "spent": return creditsCopy.spent(s.limit, s.reopensAt ? new Date(s.reopensAt) : next);
    default: return creditsCopy.first(s.limit - s.used, s.limit, next);
  }
}

/**
 * The count alone: `4 of 5 left · reset at 2:01 AM`. Spent, it is 0, never negative when more are
 * out than the limit, and the time is when the next credit returns: the oldest counted unit's
 * leaving, which is later than the next one's then.
 */
export function bareStanding(s: Standing): string {
  // The FREE count and its reset time: what this line counts, whatever a paid lot holds.
  const spent = !freeRoom(s);
  const at = spent ? s.reopensAt ?? s.nextAt : s.nextAt;
  return creditsCopy.standing(Math.max(0, s.limit - s.used), s.limit, at ? new Date(at) : null);
}

/**
 * The line under the FORM's press (states 7b, 7c, 7n): what pressing will do with the words. A credit
 * free is the shared first-use line; none left says the words will not be read and when one comes
 * back; paused and the owner's share say why, as the results panel does.
 */
export function formLine(s: Standing): string {
  if (closedBy(s) !== "spent") return standingLine(s);
  return copy.intake.extra.spentLine(bareStanding(s));
}
