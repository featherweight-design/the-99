// Report a problem (flyer trial PR 5; handoff `design/design_handoff_the99_flyer_trial/`, `Report-Phone` and
// `Report-Desktop`). Two doors, one form: the error screen's "Tell us what happened" and a row on About's index. The strings are
// Design's from `flyer-trial · copy strings.ts` `reportCopy` unless marked copy-reviewed below.

import { ANON_REPORT_RETENTION_DAYS } from "../feedback/retention";

export const reportCopy = {
  errorLink: "Tell us what happened",
  aboutTitle: "Something wrong?",
  aboutLine: "Tell us what happened and we’ll look.",
  aboutPress: "Report a problem",
  title: "Report a problem",
  intro: "Tell us what you saw. We’ll fix what we can.",
  what: "What happened?",
  whatPlaceholder: "What went wrong, in a sentence or two",
  doing: "What were you doing?",
  doingPlaceholder: "Which deck or page, and what you pressed",
  optional: "optional",
  attach: "We add the page you were on, your device, and the error code if there was one.",
  // Signed out only, between the attachment line and Send (small items 9, A2; copy-reviewed). The number is the sweep's own constant.
  anonRetention: `Reports sent while signed out are deleted after ${ANON_REPORT_RETENTION_DAYS} days.`,
  send: "Send",
  sending: "Sending…",
  sentTitle: "Sent. Thank you.",
  sentBody: "We’ll be in touch if we need any more insight.",
  // A signed-out reader left no contact, so this makes no promise of a reply or a follow-up, and claims nothing about who reads it
  // (the admin reader is not built yet). Copy-reviewed (Report C).
  sentSignedOut: "It helps us track down what broke.",
  close: "Close",
  cancel: "Cancel",
  failed: "We couldn’t send that. Try again.",
  // A signed-out visitor over the cap: the volume, not a fault, and it eases. No time promised, no machinery named. Copy-reviewed (report-d).
  failedLimited: "Lots of reports just now. Try again later.",
  retry: "Try again",
  // The error code line of the crash screen and of /report (small items 8, board 6: C1, R1, R4): drawn only when there is a code. Both strings are the board's, verbatim:
  // `codeLine` under the crash screen's notice (C1, C2), `sentWithCode` under the /report form (R1, R3, R4).
  codeLine: (digest: string) => `error ${digest}`,
  sentWithCode: (digest: string) => `Sent with error ${digest}`,
} as const;

// The check-in on Home (flyer trial PR 6; `Survey-Phone`, `Survey-Desktop`), refreshed by check-in R2 (addendum
// `addendum-checkin-r2`, Hugh 2026-11-15). /copy-review 2026-11-15: the card's type line takes the middle dot of the
// shipped `typeFriend` ("Friend · since …") for the draft's em dash, and the high thanks drops its exclamation point.
// The sheet's Close, Try again, Sending… and the "optional" tag are `reportCopy`'s.
export const checkInCopy = {
  title: "How’s it going?",
  intro: "You’ve been with The 99 for a couple of weeks. Three quick questions, and your answers steer what we improve next.",
  rating: "How’s it working for you?",
  /** One word per card of the hand, by index; the stored rating stays 1 to 5. */
  ratingWords: ["Rough", "Meh", "Okay", "Good", "Love it"],
  ratingAria: (n: number, word: string) => `${n} of 5, ${word}`,
  uses: "What do you use most?",
  pickAny: "pick any",
  useOptions: ["Collection", "Commanders", "Decks", "Shopping", "Friends", "Precons"],
  pod: "Would you tell your pod about it?",
  podOptions: ["Yes", "Maybe", "Already have"],
  more: "Anything else?",
  morePlaceholder: "A wish, a gripe, a feature you love",
  hint: "Takes about a minute",
  notNow: "Not now",
  send: "Send",
  /** Rated 3 to 5. */
  sentTitle: "Thank you, truly.",
  sentBody: "This genuinely helps us know what to improve. More to say later? About › Report a problem is always open.",
  /** Rated 1 or 2. */
  sentTitleLow: "Thanks for telling us straight",
  sentBodyLow:
    "Hearing what isn’t working is exactly how we know what to fix. If something broke, About › Report a problem is the quickest way to show us.",
  /** The thank-you card (the compact `FriendCard`, crowned face). `name` is also the word on its back. */
  card: {
    name: "Thank you",
    type: "Instant · Thanks",
    rules: "When this resolves, the people building The 99 read every word and choose what to make better next.",
    credit: "From the team",
    mark: "XCIX",
    aria: "Thank you, a card from The 99",
  },
  failed: "That didn’t go through. Your answers are still here.",
  failedLimited: "You’ve sent a few already. Try again later.",
} as const;
