// The shared model credits — copy.
//
// ONE line, drawn beside every control that spends a credit: Suggested changes today, and the
// deck synopsis (sub-project 6), which imports this module rather than writing its own. Both
// features spend the same units (Hugh, 2026-09-23), so a reader told two different things about
// one counter would be told at least one untrue thing.
//
// The window is a rolling 24 hours (Hugh, 2026-09-23), so the line names WHEN the next credit
// comes back in the reader's own clock, never "today" or a reset time: a rolling allowance has
// no reset. Design drew `14:20`; the reader reads 12-hour times, so `clockTime` formats it
// (READINESS-r3-audit.md, engineering note 2).
//
// PLACEHOLDER wording, owed to /copy-review: Design's rolling strings (`firstNoteRolling`,
// `exhaustedRolling`, canvas v2 :740-741) are transcribed; `again` merges Design's again note
// with the rolling form and is undrawn; a reader with every credit in hand is undrawn too, and
// the line then gives the count alone, since no credit is out to come back. The feature noun in
// `spent` is Hugh's (2026-09-23): "overview", the Analysis tab's word, where Design wrote
// "Synopses". Help me choose widens `spent` and the pause's reason to name its deeper looks too
// (READINESS-audit F9), since they spend the same units; Hugh's wording (2026-09-25) leads with
// what the panel's reader just used, in one order in both. The widening is flag-aware (below).

/** A time in the reader's clock, 12-hour: `2:20 PM`. Client-side only, where the clock is theirs. */
export function clockTime(at: Date): string {
  return at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** A month's name, `October`, read in UTC: the spend cap's months are UTC calendar months, so
 *  a pause lifting at 00:00 UTC on the 1st is named for that month in every reader's clock. */
export function monthName(at: Date): string {
  return at.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
}

/**
 * Help me choose's deeper looks spend these credits too, so the lines that name what shares them
 * name the looks as well, but only where the deployment draws them (`HELP_ME_CHOOSE_ENABLED`):
 * production shows nothing of a feature until its switch flips (orchestrator, 2026-09-25). A caller
 * passes the flag it was handed on the server; the default is the wording from before the looks.
 */
const pausedReason = (deeperLooks = false) =>
  deeperLooks
    ? "The app has reached its monthly limit for suggestions, overviews and deeper looks. Nothing you did caused this."
    : "The app has reached its monthly limit for suggestions and overviews. Nothing you did caused this.";

/** The count and, when one is out, when the next comes back. "reset at", not "next one at"
 *  (H35, engineering note 11). */
function standing(left: number, total: number, next: Date | null): string {
  return next ? `${left} of ${total} left · reset at ${clockTime(next)}` : `${left} of ${total} left`;
}

export const creditsCopy = {
  /**
   * The count and, when one is out, when the next comes back: `4 of 5 left · reset at 2:01 AM`.
   * Exported so a surface composing its own lead around the shared line (the overview's press
   * notes) says it in exactly this format rather than a copy of it.
   */
  standing,
  /** Beside a press that would spend a credit for the first time on this surface. */
  first: (left: number, total: number, next: Date | null) => `Uses a credit. ${standing(left, total, next)}.`,
  /** Beside a press that would replace what is on screen. */
  again: (left: number, total: number, next: Date | null) =>
    `Replaces these suggestions and uses a credit. ${standing(left, total, next)}.`,
  /** Every credit is out: the press is disabled and this says when it comes back. */
  spent: (total: number, next: Date | null, deeperLooks = false) =>
    `${standing(0, total, next)}. ${deeperLooks ? "Suggestions, overviews and deeper looks share" : "Your overview and suggestions share"} these credits.`,
  /**
   * The app-wide spend cap has been reached (`src/lib/model/spend-rule.ts`): every press is
   * disabled until `until`, the 1st of next month. DECIDED wording (orchestrator, 2026-09-24).
   */
  paused: (until: Date, deeperLooks = false) => `Paused until ${monthName(until)} 1. ${pausedReason(deeperLooks)}`,
  /** `paused`'s reason alone, for a surface that names the pause in its own lead (the overview's
   *  press note), so the reason is said in exactly these words and nowhere restated. */
  pausedReason,
  /** The same refusal from the server, where no date is formatted in the reader's clock. */
  pausedServer: "Paused until the 1st of next month. Nothing you did caused this.",
  /** The owner alone: their month's testing share is used. `month` is any instant in that month. */
  ownerShare: (month: Date) => `You’ve used your testing share for ${monthName(month)}. Friends aren’t affected.`,
} as const;
