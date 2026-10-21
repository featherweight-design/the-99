// Welcome credits R2 (launch D2): the Home strip, the `Where credits work` sheet and the /credits Welcome cell's line.
// Handoff `design/design_handoff_the99_welcome_credits/` (`welcome-credits · copy strings.ts`), through /copy-review.
// Figures arrive as arguments and dates as already-formatted days (`stripDay`, `sheetDay`): this module formats no
// numbers and reads no clock. Reused shipped strings are not restated here: the L6 line is `creditsPageCopy.viewsFree`,
// the lock line `refreshCopy.firstRun.step2Locked`, the reason line `showcaseCopy.needsADeck`, and the rows are
// `writtenForYouCopy.rows`.

const credits = (n: number) => `${n} welcome credit${n === 1 ? "" : "s"}`;
const inDays = (days: number) => `in ${days} day${days === 1 ? "" : "s"}`;
const expire = (n: number) => (n === 1 ? "expires" : "expire");
/** The reader's own daily allowance (`dailyLimitFor`): one for most, more for a group that sets it. The handoff's
 *  sentence is the one-credit form; a larger allowance is named, so the line is never false (copy-review 2026-10-21). */
const freeFirst = (free: number) => (free === 1 ? "Your free credit each day is spent first." : `Your ${free} free credits each day are spent first.`);

/**
 * `Nov 20`, in the zone of whatever runtime calls it: drawn after hydration, so it is the reader's own day (G4). Before
 * hydration a surface holds the text back (`useLocalDay`), formatting it in `timeZone` (UTC) only to keep its room.
 */
export function stripDay(at: Date, timeZone?: string): string {
  return at.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
}

/** `November 20`, the sheet's grant line, under the same rule as `stripDay`. */
export function sheetDay(at: Date, timeZone?: string): string {
  return at.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone });
}

/** A line with a bold lead: the lead is drawn in `--fg` (or `--warning` when expiring), between `before` and `rest`. */
export type LeadLine = { before?: string; lead: string; rest: string };

export const welcomeCreditsCopy = {
  /** The strip's landmark name. */
  region: "Welcome credits",
  strip: {
    held: (n: number, day: string): LeadLine => ({ lead: credits(n), rest: ` to try the tools, until ${day}.` }),
    partly: (left: number, units: number, day: string): LeadLine => ({
      lead: `${left} of your ${units} welcome credits`,
      rest: ` ${left === 1 ? "is" : "are"} left, until ${day}.`,
    }),
    expiring: (n: number, days: number, day: string): LeadLine => ({ lead: credits(n), rest: ` ${expire(n)} ${inDays(days)}, on ${day}.` }),
    usedUp: (units: number) => `You’ve used all ${units} welcome credits.`,
    /** Opens the sheet. */
    where: "Where they work",
    /** Used up, while payments are on and nothing was bought: to /credits. */
    more: "See packs and the monthly plan",
    /** Used up otherwise. */
    freeBack: (free: number) => (free === 1 ? "Your free credit comes back each day." : `Your ${free} free credits come back each day.`),
    /** The bare ✕'s name, as every strip's ✕ in the app is named (copy-review 2026-10-21: the handoff's `Close`). */
    dismiss: "Dismiss",
  },
  sheet: {
    title: "Where credits work",
    close: "Close",
    /** The grant line, the free credit named after it. `day` is `sheetDay`'s. */
    held: (n: number, day: string, free: number): LeadLine => ({
      before: "You have ",
      lead: credits(n),
      rest: ` until ${day}. ${freeFirst(free)}`,
    }),
    partly: (left: number, units: number, day: string, free: number): LeadLine => ({
      lead: `${left} of your ${units} welcome credits`,
      rest: ` ${left === 1 ? "is" : "are"} left, until ${day}. ${freeFirst(free)}`,
    }),
    expiring: (n: number, days: number, day: string, free: number): LeadLine => ({
      lead: credits(n),
      rest: ` ${expire(n)} ${inDays(days)}, on ${day}. ${freeFirst(free)}`,
    }),
    tryIt: "Try it",
    /** At the foot while payments are on and nothing was bought: to /credits. */
    teaser: "See packs and the monthly plan",
  },
  cell: {
    /** Under the Welcome cell's count. `day` is `stripDay`'s. */
    expire: (n: number, day: string) => `${expire(n)} ${day}`,
    expiring: (n: number, days: number, day: string) => `${expire(n)} ${inDays(days)}, ${day}`,
    where: "Where they work",
  },
} as const;
