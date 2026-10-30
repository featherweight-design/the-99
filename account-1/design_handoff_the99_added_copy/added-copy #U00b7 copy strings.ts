// Proposed src/lib/copy/added-copy.ts, plus deltas to card-assignments.ts and i-got-it.ts.
// Placeholders until /copy-review. Hugh's working string was
// "Sol Ring goes to HD - Thorin, which needs one · Change".
//
// TWO VERBS, AND THE VERB IS THE CLAIM. `goes to` only when a deck holds the copy (seniority or a
// pick). `is free for` when a copy is loose and brews read it as theirs. "free" is availability.ts's
// noun, so a kept-free copy and a loose copy share it, and the marker must never say `none free`
// beside a kept copy (gap G6).

const n = (x: number) => x.toLocaleString("en-US");
const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export const addedCopyCopy = {
  line: {
    head: (rows: number) => (rows === 1 ? "Where it went" : "Where they went"),
    goesTo: (card: string, deck: string) => `${card} goes to ${deck}, which needs one`,
    goesToMany: (card: string, copies: number, decks: string[]) => `${n(copies)} copies of ${card} go to ${and(decks)}, one each`,
    goesToEarlier: (card: string, deck: string) => `${card} goes to ${deck}, which you picked earlier`,
    goesToPicked: (card: string, deck: string) => `${card} goes to ${deck}, as you picked`,
    freeForBrew: (card: string, brew: string) => `${card} is free for ${brew}, a brew that needs one`,
    freeForBrews: (card: string, k: number) => `${card} is free for the ${n(k)} brews that need it`,
    kept: (card: string, k: number) => (k === 1 ? `${card} is kept free. No deck counts it.` : `${n(k)} copies of ${card} are kept free. No deck counts them.`),
    nobodyOne: (card: string) => `No deck needed ${card}, so it’s free.`,
    nobodyMany: "No deck needed these, so they’re free.",
    nobodyRest: (k: number) => `No deck needed the other ${n(k)}, so they’re free.`,
    change: "Change",
    done: "Done",
    changeAria: (card: string) => `Change where ${card} goes`,
  },
  // The summary's short forms: the card is the row's own first column.
  row: {
    goesTo: (deck: string) => `goes to ${deck}`,
    goesToMany: (decks: string[]) => `goes to ${and(decks)}, one each`,
    goesToEarlier: (deck: string) => `goes to ${deck}, which you picked earlier`,
    goesToPicked: (deck: string) => `goes to ${deck}, as you picked`,
    freeForBrew: (brew: string) => `is free for ${brew}, a brew`,
    freeForBrews: (k: number) => `is free for the ${n(k)} brews that need it`,
    kept: (deck: string) => `kept free, so ${deck} still bills it`,
    keptNoDeck: "kept free",
    // Open question 3: the count persists, capped at what you own.
    capped: (was: number, now: number) => `You were keeping ${n(was)} free. You own ${n(now)} now, so ${n(now)} ${now === 1 ? "is" : "are"} kept free.`,
  },
  // Brief edge 7: a removal that lowers owned below the kept count. Said in the pre-save warning slot.
  removalCaps: (card: string, now: number) => `You’re keeping ${card} free. After this you’ll own ${n(now)}, so ${n(now)} ${now === 1 ? "stays" : "stay"} kept free.`,
  summaryNoteTail: " Change where a copy goes, or keep it free.",
};

// ── card-assignments.ts · contested (additions) ──
export const contestedAdditions = {
  /** A brew's soft share: it reads a loose copy as covered, and so does every other brew. */
  canUse: "can use it",
  keep: "Keep it free",
  keptOutcome: "kept free",
  capKept: (given: number, kept: number) => `${n(given)} given · ${n(kept)} kept free`,
  fold: (k: number, deck: string | null) => (deck ? `${n(k)} committed decks ahead of ${deck} have theirs` : `${n(k)} committed decks have theirs`),
  foldShow: "Show",
  keepNote: "Keep it free and no deck counts that copy. Decks that need it still show it missing, and it stays on their Shopping.",
  brewNote: (k: number) => `A brew holds a copy only once you pick it, so all ${k === 2 ? "both" : n(k)} can use this one. Pick one to give it the copy.`,
  a11yKeep: (card: string) => `Keep ${card} free. No deck counts it.`,
  a11yKeepCount: (card: string, k: number) => `Copies of ${card} kept free: ${n(k)}`,
  announcedKept: (card: string, deck: string) => `${card} is kept free. ${deck} buys it.`,
};

// ── i-got-it.ts · receipt (additions; claimed / claimedMany unchanged) ──
export const receiptAdditions = {
  self: "It goes to this deck.",
  softSelf: (others: string[]) => `It’s free, so this deck can use it. So can ${and(others)}, which need one too.`,
  nobody: "No deck needs this copy, so it’s free.",
  change: "Change",
  changeTitle: "Where this copy goes",
  changeSub: (card: string) => `${card} · added just now`,
  done: "Done",
};

// ── availability.ts (additions) ──
export const availabilityAdditions = {
  /** Marker state 5 (gap G6): replaces the marker when a copy of the card is kept free. Not a verdict. */
  keptFree: (k: number) => `${n(k)} kept free`,
  keptFreeAria: (k: number) => `${k === 1 ? "1 copy is" : `${n(k)} copies are`} kept free, so no deck counts ${k === 1 ? "it" : "them"}`,
  ownedKept: (owned: number, other: number, kept: number) => `you own ${n(owned)} · ${n(other)} in other decks · ${n(kept)} kept free`,
  detailSplitKept: (inUse: number, kept: number) => `${n(inUse)} in use · ${n(kept)} kept free`,
};
