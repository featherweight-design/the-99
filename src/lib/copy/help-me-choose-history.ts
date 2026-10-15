// Help me choose History — copy (Help me choose history PR 2).
//
// Transcribed from the handoff's `hmc-history · copy strings.ts` (R1, 2026-10-15), then run through
// /copy-review on 2026-10-14: the empty state's body drops "newest first" and "Opening one again is
// free", which the heading's sub and the foot already say (rule 7, one promise at the highest level
// it applies to). The past-run note is the orchestrator's ruling (below).
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
  /** The New deck door's link, once the player has a run to list. */
  doorLink: "Your past runs ›",
  /** A run opened from History: the results page it was, read-only. */
  past: {
    back: "‹ History",
    meta: (date: string) => `${date} · a past run`,
    /** Appended to the title's accessible name when a past run opens. */
    titleAria: (day: string) => `, a past run from ${day}, read-only`,
    // One note for every listed run (orchestrator ruling 2026-10-14): the handoff's "It used 1 credit
    // on <date>" was false for a run that finished ok and was refunded, and no call status is read for a sentence.
    note: "A past run, read-only. Opening it again uses no credit.",
    noteNothing: "A past run, read-only. It found nothing, so no credit was used.",
    /** Appended to the note when some or all picks went. */
    open: (open: number, picks: number) =>
      open === 0 ? `None of its ${picks} picks are open to you now.` : `${open} of its ${picks} picks are still open to you.`,
    goneHead: (n: number) => `Not open to you now · ${n}`,
    goneLabel: "Picks not open to you now",
    goneBuilt: (deck: string) => `you built it since · ${deck}`,
    goneIndex: "no longer among the commanders we rank",
    openDeck: "Open deck",
    reasonGone: "Its line named a deck you’ve since deleted.",
    failed: "This run didn’t load. Try again from History.",
    failedBack: "Back to History",
  },
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
