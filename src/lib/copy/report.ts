// Report a problem (flyer trial PR 5; handoff `design/design_handoff_the99_flyer_trial/`, `Report-Phone` and
// `Report-Desktop`). Two doors, one form: the error screen's "Tell us what happened" and a row on About's index. Every string
// is Design's placeholder for /copy-review, verbatim from `flyer-trial · copy strings.ts` `reportCopy`.

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
  send: "Send",
  sending: "Sending…",
  sentTitle: "Sent. Thank you.",
  sentBody: "We’ll be in touch if we need any more insight.",
  // A signed-out reader left no contact, so this makes no promise of a reply or a follow-up, and claims nothing about who reads it
  // (the admin reader is not built yet). Copy-reviewed 2026-11-01.
  sentSignedOut: "It helps us track down what broke.",
  close: "Close",
  cancel: "Cancel",
  failed: "We couldn’t send that. Try again.",
  // A signed-out visitor over the cap: the volume, not a fault, and it eases. No time promised, no machinery named. Copy-reviewed 2026-11-01.
  failedLimited: "Lots of reports just now. Try again later.",
  retry: "Try again",
  // The error code line of the crash screen and of /report (small items 8, board 6: C1, R1, R4): drawn only when there is a code. Both strings are the board's, verbatim:
  // `codeLine` under the crash screen's notice (C1, C2), `sentWithCode` under the /report form (R1, R3, R4).
  codeLine: (digest: string) => `error ${digest}`,
  sentWithCode: (digest: string) => `Sent with error ${digest}`,
} as const;

// The check-in on Home (flyer trial PR 6; `Survey-Phone`, `Survey-Desktop`), verbatim from `flyer-trial · copy strings.ts`
// `checkInCopy`. The sheet's Close and Try again and the "optional" tag are `reportCopy`'s.
export const checkInCopy = {
  title: "How’s it going?",
  intro: "You’ve been using The 99 for a couple of weeks. Three quick questions.",
  rating: "How is it working for you?",
  ratingEnds: ["not well", "really well"],
  uses: "What do you use most?",
  pickAny: "pick any",
  useOptions: ["Collection", "Commanders", "Decks", "Shopping", "Friends", "Precons"],
  pod: "Would you tell your pod about it?",
  podOptions: ["Yes", "Maybe", "Already have"],
  more: "Anything else?",
  morePlaceholder: "Anything you’d change, or love",
  hint: "Takes a minute",
  notNow: "Not now",
  send: "Send",
  sentTitle: "Thanks, that helps.",
  sentBody: "We read every answer. You can always tell us more from About › Report a problem.",
  failed: "We couldn’t send that. Try again.",
} as const;
