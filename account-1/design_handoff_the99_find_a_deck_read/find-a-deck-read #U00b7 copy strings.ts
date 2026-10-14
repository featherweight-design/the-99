// Proposed additions to src/lib/copy/swap-tools.ts, as `fits.read`, plus one widening of
// src/lib/copy/credits.ts. EVERY string here is a placeholder owed to /copy-review, the press label
// included. US English. The model's own sentence is not copy: it is validated (locks 1–3, 10) and
// carries no digit, percentage or score word. Figures below are app-drawn counts, never the model's.

export const findADeckReadCopy = {
  // ── The press band ──────────────────────────────────────────────────
  press: "Which deck needs it most?",
  pressAria: (card: string) => `Which deck needs ${card} most? Uses 1 credit.`,
  pressAriaSpent: "Which deck needs it most? No credits left.",
  /** The button's segment, after a rule: `◆ 1 credit` (the glyph is drawn, aria-hidden). */
  credit: "1 credit",
  offerLead: (n: number, card: string) =>
    `A closer read of the ${n} decks that can take ${card}: the few it really helps, how it helps each one in that deck’s own cards, and what it would replace.`,
  offerLeadOne: (deck: string, card: string) =>
    `A closer read of ${deck}, the one deck that can take ${card}: how it would help, in that deck’s own cards, and what it would replace.`,
  // The line under the press is creditsCopy.standing(left, total, next) as Proposed cuts draws it.

  // ── Running ─────────────────────────────────────────────────────────
  running: (n: number, card: string) => (n === 1 ? `Reading one deck for ${card}` : `Reading ${n} decks for ${card}`),
  /** Followed by ` · {elapsed}` (`0:12`), the cuts panel's clock. */
  runningSub: "each deck’s plan and list, against the card’s text",
  runningKeep: "The list below stays as it is. You can leave this view; the read keeps going and waits here.",
  announceStarted: "Reading your decks.",
  /** The door in card details, while a run for this card is in flight and the reader has gone back. */
  doorReading: "reading your decks…",

  // ── The result ──────────────────────────────────────────────────────
  resultHead: "Where it helps most",
  resultSubNow: (shown: number, n: number) => `read just now · ${shown} of ${n} decks`,
  resultSubNowOne: "read just now · the one deck",
  /** `when` is `Oct 11, 9:42 PM` in the reader's clock. */
  resultSubStored: (when: string, shown: number, n: number) => `read ${when} · ${shown} of ${n} decks`,
  resultSubStale: (when: string) => `read ${when} · out of date`,
  /** Followed by ` · ` and creditsCopy.standing. */
  resultFootSpent: "Used a credit",
  resultFootStored: "Free to reopen while your decks stay as they are.",
  onlyOne: (deck: string, card: string) => `${deck} is the only deck that can take ${card}`,
  // Addendum (brief item 12, open 8): the plan source, last in the commander line.
  planFrom: { v2: "from its overview", older: "from an older overview", none: "from commander and themes" },
  srcNoteOlder: "Read from an overview written the older way.",
  srcLinkOlder: "Update it on the deck page →",
  srcNoteNone: (commander: string) => `No overview yet, so this read went on ${commander} and the deck’s top themes.`,
  srcLinkNone: "Write one on the deck page →",
  staleOverview: (deck: string, when: string) => `${deck} has a new overview since this read on ${when}. Read again to use it.`,
  changedTagOverview: "new overview",
  // R2: add without swapping.
  addOnly: "Add only",
  addOnlyToBuy: "Add only, to buy",
  added: "Added",
  addedToBuy: "Added, to buy",
  addOnlyAria: (card: string, deck: string) => `Add ${card} to ${deck} without cutting anything`,
  addedAria: (card: string, deck: string) => `${card} is in the ${deck} draft, with nothing cut. Press to take it out.`,
  addedNote: (deck: string) => `In the draft, which is now at 100. Cut a card of your choice from ${deck}.`,
  cutNoteAdded: "still in · cut it or anything else",
  cutLabel: "cut",
  cutNote: "goes out when you swap it in",
  cutNoteSwapped: "out of the draft · press Swapped in to put it back",
  cutNoteChanged: "this deck has changed, so the cut may not hold",
  swapIn: "Swap in",
  swapInToBuy: "Swap in to buy",
  swapped: "Swapped in",
  swapInAria: (card: string, deck: string, cut: string) => `Swap ${card} into ${deck}, cutting ${cut}`,
  swappedAria: (card: string, deck: string, cut: string) => `${card} is in ${deck} and ${cut} is out. Press to put ${cut} back.`,
  swapRefused: "We couldn’t make that swap. The deck is unchanged.",
  undoRefused: "We couldn’t undo that swap. The deck is unchanged.",
  announceReady: (n: number) => (n === 1 ? "The read found one deck." : `The read found ${n} decks.`),
  announceSwapped: (card: string, cut: string) => `Swapped. ${card} is in the draft and ${cut} is out.`,
  announceUndone: (card: string, cut: string) => `Swap undone. ${cut} is back and ${card} is out.`,

  // ── Fewer than asked, thin (lock 4: credit back) ────────────────────
  thin: (kept: number) =>
    kept === 1 ? "Only one deck held up, so the credit came back." : `Only ${kept} decks held up, so the credit came back.`,
  /** Followed by ` · ` and creditsCopy.standing. */
  thinSub: "The other decks it named didn’t check out against their lists",

  // ── No fit ──────────────────────────────────────────────────────────
  noFitHead: "None of these decks is a real fit",
  noFitBody: (n: number, card: string) =>
    `The read went through the ${n} decks that can take ${card} and found none whose plan it really helps. The credit came back.`,
  noFitBodyOne: (deck: string, card: string) =>
    `The read went through ${deck}, the one deck that can take ${card}, and found it isn’t a real fit. The credit came back.`,
  // R2: a no fit is kept until a candidate changes.
  noFitBodyStored: (n: number, card: string) => `The read went through the ${n} decks that can take ${card} and found none whose plan it really helps.`,
  noFitFootNow: "read just now · kept until your decks change, so there’s nothing to press again",
  noFitFootStored: (when: string) => `read ${when} · kept until your decks change`,
  noFitChanged: (deck: string, when: string) => `${deck} has changed since this read on ${when}, so it’s worth asking again.`,
  announceNoFit: "No real fit. The credit came back.",

  // ── Failure ─────────────────────────────────────────────────────────
  failedTag: "Didn’t finish", // the FailMark's aria-label
  failedHead: "The read didn’t come back",
  failedBody: "The credit came back, and the list below is as it was. It isn’t something you did.",
  retry: "Try again",
  announceFailed: "The read didn’t come back. The credit came back.",

  // ── Stored, out of date (lock 6) ────────────────────────────────────
  staleOne: (deck: string, when: string) => `${deck} has changed since this read on ${when}, so the read may not hold any more.`,
  staleMany: (n: number, when: string) => `${n} of your decks have changed since this read on ${when}, so the read may not hold any more.`,
  staleSet: (when: string) => `Your decks that can take this card aren’t the same ones as at this read on ${when}, so the read may not hold any more.`,
  changedTag: "changed since",
  readAgain: "Read again",
  /** Beside Read again, in place of creditsCopy.again (which names suggestions). */
  again: (standing: string) => `Replaces this read and uses a credit. ${standing}.`,

  // ── The fold over the free list ─────────────────────────────────────
  fold: "Every deck that could take it",
  foldAria: (n: number, open: boolean) => `${open ? "Hide" : "Show"} every deck that could take it, ${n}`,
  /** Under a capped free list (canvas only shows the first rows). Not built: the shipped list is not capped. */
} as const;

// ── creditsCopy (R2, Hugh's decision, app-wide: link, never list) ─────
// No credit line names the features that share credits. Engineering: apply everywhere.
//   spent:        standing(0, total, next) + " · " + creditsLink   → "0 of 3 left · reset at 2:20 AM · What uses credits?"
//   pausedReason: "The app has reached its monthly limit for credits. Nothing you did caused this." + " · " + creditsLink
//   creditsLink:  an <a> to /about#credits (the About entry that lists them, gated per line).
// Retire the deeperLooks / tuning tables in spent and pausedReason, and the flags their callers pass.
export const creditsLink = "What uses credits?";
