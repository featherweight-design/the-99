// Proposed additions to src/lib/copy/help-me-choose.ts. Placeholders: /copy-review settles the wording.
// Nearest precedent: tuningHubCopy.history (src/lib/copy/tuning-hub.ts).

export const helpMeChooseHistoryCopy = {
  /** The form's way in (phone), and the New deck door's link. */
  link: "History",
  doorLink: "Your past runs ›",
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
    body: "When you describe a deck in “Anything else?”, its answer is kept here, newest first. Opening one again is free.",
  },
  foot: "Kept on your account. Opening a run uses no credit.",
  more: "Show 20 more",
  moreFailed: "Couldn’t load more runs. Try again.",
  loadFailed: { tag: "Couldn’t load", body: "Your past runs didn’t load. They’re kept; only the list failed to arrive." },
  retry: "Try again",
  row: {
    /** The no-words row's lead, before the answers line. */
    answersLead: "Your answers",
    picks: (n: number) => `${n} ${n === 1 ? "pick" : "picks"}`,
    nothing: "found nothing · no credit used",
    reading: "reading",
    now: "now",
    /** The row link's accessible name. `tail` is `9 picks` or `found nothing, no credit used`. */
    aria: (question: string, date: string, tail: string) => `${question}. ${date}, ${tail}.`,
    readingAria: (question: string) => `Running: ${question}. Opens the run’s waiting panel.`,
  },
  past: {
    back: "‹ History",
    meta: (date: string) => `${date} · a past run`,
    /** Appended to the title's accessible name when a past run opens. */
    titleAria: (day: string) => `, a past run from ${day}, read-only`,
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
} as const;

// Reused unchanged: historyDate / historyMonth (tuning-history.tsx), results.byWordsSub with `lines = false`
// for an aged run, read.emptyTitle / read.emptyLead (stored pool), readAs.change, readAs.startOver.
