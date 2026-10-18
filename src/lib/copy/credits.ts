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
// the line then gives the count alone, since no credit is out to come back.
//
// LINK, NEVER LIST (Hugh, 2026-10-12, Find a deck read R2 item 4, app-wide). `spent` and the old pause's
// reason used to name the features that share credits, and a table of switches decided which; every
// new spender widened the table and every caller passed its flags. They now end in `What uses
// credits?`, a link to the About `credits` entry, which says how credits work and lists what spends
// them (gated per line by switch; the list is owed Proposed cuts and Find a deck's read). A
// surface draws the line through `CreditsText`, which turns the phrase into that link.

/** A time in the reader's clock, 12-hour: `2:20 PM`. Client-side only, where the clock is theirs. */
export function clockTime(at: Date): string {
  return at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** A month's name, `October`, read in UTC: the owner's share counts UTC calendar months, so the
 *  month is named the same in every reader's clock. */
export function monthName(at: Date): string {
  return at.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
}

/** The phrase that ends a line about what shares the credits, drawn as a link to `CREDITS_HREF`. */
const link = "What uses credits?";
/** L4's own line under the spent line, a link to `/credits`. */
const getMore = "Get more credits";
/** The About entry that lists every feature spending credits, in the Reference tab (entries carry their own anchors). */
export const CREDITS_HREF = "/about?tab=reference#credits";

/** The count and, when one is out, when the next comes back. "reset at", not "next one at"
 *  (H35, engineering note 11). */
function standing(left: number, total: number, next: Date | null): string {
  return next ? `${left} of ${total} left · reset at ${clockTime(next)}` : `${left} of ${total} left`;
}

/** `Nov 16`, read in UTC like the other dates the payments copy names (a plan's expiry is an instant, not a clock time). */
function shortDay(at: Date): string {
  return at.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** The paid count a line carries: one number, plan and packs together (`/credits` is where they split). */
// A no-break space: `114 paid.` ends every line it is on, and a narrow line (Help me choose's 380px) otherwise leaves
// `paid.` alone on the last line (design follow-ups 2026-10-18, item 9). It reads and matches as a space.
const paid = (n: number) => `${n}\u00a0paid`;

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
  /** Every credit is out: the press is disabled and this says when it comes back, then links to
   *  what uses them. */
  spent: (total: number, next: Date | null) => `${standing(0, total, next)} · ${link}`,
  /**
   * PLACEHOLDER wording, owed to /copy-review (buying credits R1, `buying-credits · copy strings.ts`).
   * L2: free credits remain and paid ones are held. `left` becomes `free` once paid credits are held.
   */
  withPaid: (left: number, total: number, next: Date | null, paidTotal: number) =>
    `${next ? `${left} of ${total} free · reset at ${clockTime(next)}` : `${left} of ${total} free`} · ${paid(paidTotal)}`,
  /** L3: the free allowance is spent and the next run takes a paid credit. */
  paidNext: (total: number, next: Date | null, paidTotal: number) =>
    `${next ? `0 of ${total} free · reset at ${clockTime(next)}` : `0 of ${total} free`} · this run uses 1 of ${paidTotal} paid`,
  /** `first` / `again` beside a press that will spend a paid credit; `line` is `withPaid`'s form. */
  firstPaid: (line: string) => `Uses a paid credit. ${line}.`,
  againPaid: (line: string) => `Replaces these suggestions and uses a paid credit. ${line}.`,
  /** L5: today's paid limit is reached with the free allowance spent. `back` is the earlier of the next free credit and the limit's reset. */
  limit: (paidLimit: number, banked: number, back: Date | null) =>
    `Today’s ${paidLimit} paid credits are used. ${banked} more are banked${back ? ` · back at ${clockTime(back)}` : ""}`,
  /** L6: the paid limit is reached but a free credit is ready. */
  limitFree: (left: number, total: number, next: Date | null, paidBack: Date) =>
    `${next ? `${left} of ${total} free · reset at ${clockTime(next)}` : `${left} of ${total} free`} · paid back at ${clockTime(paidBack)} (daily limit)`,
  /** L7 and the menu chip's expiring line: a cancelled plan's credits, within three days of lapsing. */
  expiring: (n: number, on: Date) => `${n} plan credit${n === 1 ? "" : "s"} ${n === 1 ? "expires" : "expire"} ${shortDay(on)}`,
  /** Finds `expiring`'s phrase at the end of a line, so `CreditsText` can draw it in `--warning`. */
  expiringPattern: /\d+ plan credits? expires? [A-Z][a-z]{2} \d{1,2}(?=\.?(?: · |\n|$))/,
  /** L4: its own line under the spent line, a link to `/credits`. Only while payments are on for the reader. */
  getMore,
  /** L4's own line under a spent line, only while payments are on for the reader. */
  withMore: (line: string, payments: boolean) => (payments ? `${line}\n${getMore}` : line),
  /** `first` / `again` for the free-and-paid forms (L2, L6): the line is the form's own count. */
  usesCredit: (line: string) => `Uses a credit. ${line}.`,
  replacesUsesCredit: (line: string) => `Replaces these suggestions and uses a credit. ${line}.`,
  /** Appends `tail` to a credit line that may end in the `getMore` line, keeping `getMore` last so `CreditsText` still links it. */
  afterLine: (line: string, tail: string) => {
    const more = `\n${getMore}`;
    return line.endsWith(more) ? `${line.slice(0, -more.length)}${tail}${more}` : `${line}${tail}`;
  },

  /** The account menu's chip (M1b), by state. The count and the date are the server's read. */
  chip: {
    credits: (n: number) => `${n} ${n === 1 ? "credit" : "credits"}`,
    free: (n: number) => `${n} free ${n === 1 ? "credit" : "credits"}`,
    out: "Get more credits",
  },  /** The link phrase, for `CreditsText` and for a test that finds it. */
  link,
  /** The owner alone: their month's testing share is used. `month` is any instant in that month. */
  ownerShare: (month: Date) => `You’ve used your testing share for ${monthName(month)}. Friends aren’t affected.`,
} as const;
