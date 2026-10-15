// The card-scan lab's copy (`/lab/scan`, staging only, behind `SCAN_LAB_ENABLED`). A measuring page,
// not a feature: it is never linked, has no design handoff and owes no About entry.
export const scanLabCopy = {
  title: "Card-scan lab",
  intro:
    "Point the camera at one card. Tap ✓ when the guess is the right card and ✗ when it isn’t. Each tap saves the guess, right or wrong, and how long it took. The photo goes with it while Keep this frame is selected. Deselect it and the photo stays on this device.",
  start: "Start camera",
  loading: "Loading the scanner…",
  noIndex: "The card index isn’t set up on this deployment (SCAN_LAB_INDEX_BASE).",
  failed: "The scanner didn’t load.",
  noCamera: "This browser can’t open the camera here.",
  noCard: "No card in view",
  unsure: "Not sure yet", // no guess has held long enough to show (low light flickers)
  guessing: "Best guess",
  held: "Held for your tap", // replaces Best guess while a finger is on the controls
  agreed: (n: number) => `same answer on ${n} frames in a row`,
  right: "✓ Right card",
  wrong: "✗ Wrong card",
  keepFrame: "Keep this frame",
  saved: "Saved",
  saveFailed: "Didn’t save. Try the tap again.",
  timings: (det: number, emb: number, match: number) => `corners ${det} ms · embed ${emb} ms · match ${match} ms`,
  runnersUp: "Next guesses",
  taps: (n: number, right: number) => `${n} ${n === 1 ? "tap" : "taps"} this session, ${right} right`,
  whatCard: "What card was it?",
  whatCardHint: "Optional. Pick it and the miss is saved with the right card.",
  whatCardField: "Card name",
  skip: "Skip",
  searching: "Searching…",
  noMatch: "No card by that name.",
  searchFailed: "The search didn’t load. Type again to retry.",
  labelled: (name: string) => `Saved as ${name}`,
  labelFailed: "That didn’t save. Pick it again or skip.",
} as const;
