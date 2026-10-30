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
  close: "Close",
  cancel: "Cancel",
  failed: "We couldn’t send that. Try again.",
  retry: "Try again",
} as const;
