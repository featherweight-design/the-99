// The card-scan lab's copy (`/lab/scan`, staging only, behind `SCAN_LAB_ENABLED`). A measuring page,
// not a feature: it is never linked, has no design handoff and owes no About entry.
export const scanLabCopy = {
  title: "Card-scan lab",
  intro:
    "Point the camera at one card. Tap ✓ when the guess is the right card and ✗ when it isn’t. Each tap saves the guess, right or wrong, and how long it took. The photo stays on this device unless you tick Keep this frame.",
  start: "Start camera",
  loading: "Loading the scanner…",
  noIndex: "The card index isn’t set up on this deployment (SCAN_LAB_INDEX_BASE).",
  failed: "The scanner didn’t load.",
  noCamera: "This browser can’t open the camera here.",
  noCard: "No card in view",
  guessing: "Best guess",
  agreed: (n: number) => `same answer on ${n} frames in a row`,
  right: "✓ Right card",
  wrong: "✗ Wrong card",
  keepFrame: "Keep this frame",
  saved: "Saved",
  saveFailed: "Didn’t save. Try the tap again.",
  timings: (det: number, emb: number, match: number) => `corners ${det} ms · embed ${emb} ms · match ${match} ms`,
  runnersUp: "Next guesses",
  taps: (n: number, right: number) => `${n} taps this session, ${right} right`,
} as const;
