// Help me choose · the read (R1). PLACEHOLDER copy, owed to /copy-review.
// Merges into src/lib/copy/help-me-choose.ts. Never the words AI, model or LLM.
// Never a card label. A reason line never reads as a score.

export const theReadCopy = {
  intake: {
    // Replaces words / wordsPlaceholder / wordsCaption. The field moves last.
    extra: {
      label: "Anything else?",
      optional: "optional",
      placeholder: "e.g. something scary and a little nasty, or a Landfall deck unlike the ones I’ve built",
      caption: "Describe the deck in your own words: how it should feel, or how it should differ from decks you’ve built. Leave it empty and the answers above search on their own, for free.",
      captionFilled: "Read against every commander your answers allow, and your decks’ commanders and themes. It uses a credit when you press Find commanders.",
      captionSpent: "Kept here for when a credit comes back.",
      count: (n: number, max: number) => `${n} / ${max}`,
      /** Beside the press with text and no credit: the standing follows. */
      spentLine: (standing: string) => `Won’t be read: ${standing}.`, // one line beside the press
    },
  },
  readAs: {
    yourAnswers: "Your answers", // replaces label "We read this as"
    noneAll: "No answers given: every commander you haven’t built",
    wrote: "You wrote",
    // Retired: notUsed, stillNotUsed, deeperMark.
  },
  /** Replaces `deeper`. The panel no longer offers. It starts reading on arrival. */
  read: {
    cost: "1 credit",
    costSpent: "0 left",
    costPaused: "Paused",
    pressAria: "1 credit. Find commanders and read what you wrote.",
    pendingTitle: "Reading what you wrote…",
    pendingLead: "These results stay until it’s done. It usually takes under a minute.",
    stepScan: (n: string) => `Scanning the ${n} commanders your answers allow`,
    stepWeigh: "Weighing the closest few in full",
    stepNow: "now",
    stepNext: "next",
    actionPending: "Reading…",
    pendingLine: "Stopping gives the credit back.",
    stop: "Stop",
    title: "Read what you wrote",
    doneTag: "done",
    doneLead: (pool: string, short: number) =>
      `It read the ${pool} commanders your answers allow and weighed the closest ${short} in full. The ten that fit best come first, each with a line on why.`,
    heldColors: (colors: string) => `Your colors held: nothing outside ${colors} was read.`,
    noDecks: (subject: string) => `You have no decks yet, so the lines speak to ${subject} alone.`,
    doneLine: (standing: string) => `1 credit used · ${standing}`,
    repeatLine: "No credit used · you asked this already",
    stoppedTag: "stopped",
    stoppedLead: "Nothing was read, and no credit was used. These are the results for your answers alone.",
    failTag: "didn’t finish",
    failedLead: "The read didn’t finish, so your credit came back. These are the results for your answers alone.",
    retry: "Try again",
    emptyTitle: "Nothing fits what you wrote",
    emptyLead: (pool: string, what: string) =>
      `It read all ${pool} commanders your answers allow, and none of them makes ${what}. Your answers hold, so it didn’t look outside them.`,
    emptyWiden: "to let it look wider, for instance with more colors.", // after a "Change answers" link
    emptyLine: (standing: string) => `No credit used · ${standing}`,
    unreadTitle: "What you wrote wasn’t read",
    unreadLead: "No credits were left, so these results use your answers alone. Your words are kept.",
    // unread's line is the bare creditsCopy.standing, not spent: the lead already says why.
    readIt: "Read it",
    stopped: "Stopped. No credit was used.", // announced
  },
  results: {
    byWords: "Ordered by what you wrote",
    byWordsSub: "The first ten are the read’s picks, closest first, each with why. After them come the rest of your results, ordered by cards you already have.",
    pendingSub: "What you wrote isn’t in this order yet. These are your answers’ results, and they stay until the read is done.",
    notReadSub: "What you wrote isn’t in this order. These are commanders your answers allow, owned or not, whose decks run the most cards you already have.",
    restHead: "The rest of your results",
    restTail: "ordered by cards you already have",
  },
} as const;

// creditsCopy widening (credits.ts): "deeper looks" → "Help me choose".
//   spent:  "Suggestions, overviews and Help me choose share these credits."
//   paused: "The app has reached its monthly limit for suggestions, overviews and Help me choose. Nothing you did caused this."
