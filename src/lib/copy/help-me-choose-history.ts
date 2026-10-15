// Help me choose History — copy (Help me choose history PR 2).
//
// Transcribed from the handoff's `hmc-history · copy strings.ts` (R1, 2026-10-15), then run through
// /copy-review on 2026-10-14: the empty state's body drops "newest first" and "Opening one again is
// free", which the heading's sub and the foot already say (rule 7, one promise at the highest level
// it applies to). The past-run strings join with PR 3.
//
// Nearest precedent: `tuningHubCopy.history` (src/lib/copy/tuning-hub.ts).

export const helpMeChooseHistoryCopy = {
  /** The form's way in on a phone, on its back line. */
  link: "History",
  /** The view's back link (phone). */
  back: "‹ Help me choose",
  title: "History",
  sub: "your past runs · newest first",
  subEmpty: "your past runs",
  /** The nav's accessible name. */
  listLabel: "Past runs",
  /** Screen readers only, while the list loads. */
  loading: "Loading your past runs",
  empty: {
    head: "No runs yet",
    body: "When you describe a deck in “Anything else?”, its answer is kept here.",
  },
  foot: "Kept on your account. Opening a run uses no credit.",
  more: "Show 20 more",
  moreFailed: "Couldn’t load more runs. Try again.",
  loadFailed: { tag: "Couldn’t load", body: "Your past runs didn’t load. They’re kept; only the list failed to arrive." },
  retry: "Try again",
  row: {
    picks: (n: number) => `${n} ${n === 1 ? "pick" : "picks"}`,
    nothing: "found nothing · no credit used",
    reading: "reading",
    now: "now",
    /** The row link's accessible name. `tail` is `9 picks` or `found nothing, no credit used`. */
    aria: (question: string, date: string, tail: string) => `${question}. ${date}, ${tail}.`,
    ariaPicks: (n: number) => `${n} ${n === 1 ? "pick" : "picks"}`,
    ariaNothing: "found nothing, no credit used",
    readingAria: (question: string) => `Running: ${question}. Opens the run’s waiting panel.`,
  },
} as const;
