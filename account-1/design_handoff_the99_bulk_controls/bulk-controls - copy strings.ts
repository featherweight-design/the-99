/**
 * src/lib/copy/top-off.ts — the bulk pair (the bulk-controls brief, §5.1 / §5.2).
 *
 * ADDS one block, `topOffCopy.bulk`, and DELETES `list.tickOwned` / `list.tickOwnedAria`
 * with the single control they named. Nothing else in the file moves.
 *
 * The rules this block is written to, all of them inherited rather than invented:
 *   · every count carries its denominator or its noun in the same string;
 *   · a missing price drops the FIGURE and keeps the COUNT (src/lib/copy/price.ts);
 *   · a nil concession is a sentence, never an empty slot;
 *   · nothing is claimed from absent data — an unmeasurable mix says so;
 *   · the accessible name carries the concession, because a sibling note is read
 *     after the choice on a linear pass.
 */

export const bulk = {
  /** The pool is named; the concession is not. Both labels state the same count —
   *  the open slots — because both fills take every one of them. */
  collection: (n: string) => `Select ${n} from my collection`,
  best: (n: string) => `Select the ${n} this deck needs`,

  /** Label AND concession. The visible note is aria-hidden, so this is the only
   *  place the figure is spoken, and it is spoken before the press. */
  collectionAria: (n: string, concession: string) =>
    `Select ${n} cards from your collection — ${concession}`,
  bestAria: (n: string, concession: string) =>
    `Select the ${n} cards this deck needs — ${concession}`,

  // ── The left-hand concession: what the collection fill gives up ─────────
  //
  // 'recommendations' is the public noun for the measured composition. 'skeleton'
  // is the code's word and appears nowhere a player can see, and 'the mix' needed
  // a gloss to mean anything. If the analysis tab settles on another noun, these
  // five strings follow it and nothing else does.

  /** Nil, and still a sentence. The player came to find out whether the cheap
   *  option costs anything; 'no' is the answer, not the absence of one. */
  gapNone: 'matches every recommendation',
  gapOne: (n: string, type: string) => `${n} ${type} short of recommendations`,
  gapTwo: (n: string, type: string, m: string, other: string) =>
    `${n} ${type} and ${m} ${other} short of recommendations`,
  /** Three or more axes. A line naming five types is a table with no headings,
   *  and the worst gap is what decides whether the concession is acceptable. */
  gapMany: (types: string, worst: string, worstType: string) =>
    `short on ${types} types · ${worstType} worst at ${worst}`,
  /** SkeletonFit.basis === 'none', or no composition at all. '0 short' would be
   *  the strongest possible claim made from no data. */
  gapUnmeasured: 'no recommendation for this commander',

  /** b3: the two pools produced the same rows, so the buy control is absent and
   *  this clause says why. Appended to whichever gap string applies. */
  andNothingToBuy: (gap: string) => `${gap} · nothing to buy`,

  // ── The right-hand concession: what the best fill costs ─────────────────
  //
  // Identical in shape to the shipped commit.toBuy, deliberately: the bar
  // restates this pair of figures against the selected set a moment later, and
  // two spellings of one fact would read as two facts.
  buy: (n: string, money: string | null) =>
    money === null ? `${n} to buy` : `${n} to buy · ${money}`,

  /** b11. While a hand-made selection fills the slots, replacing it is the whole
   *  of what a press does, and that outranks the figure. Both notes take it. */
  replaces: (selected: string) => `replaces your ${selected} selections`,
  replacesOne: 'replaces your 1 selection',
} as const;

// ── Type nouns for the gap strings ──────────────────────────────────────────
//
// CompositionTargets' ten keys, pluralised for a count. 'basic' and 'nonbasic'
// are WITHIN land in fit.ts, so a note must never print land beside either or it
// double-counts in front of the player.
export const MIX_TYPE_NOUN: Record<string, [one: string, many: string]> = {
  land: ['land', 'lands'],
  basic: ['basic', 'basics'],
  nonbasic: ['nonbasic land', 'nonbasic lands'],
  creature: ['creature', 'creatures'],
  instant: ['instant', 'instants'],
  sorcery: ['sorcery', 'sorceries'],
  artifact: ['artifact', 'artifacts'],
  enchantment: ['enchantment', 'enchantments'],
  planeswalker: ['planeswalker', 'planeswalkers'],
  battle: ['battle', 'battles'],
};

// ── DELETED ─────────────────────────────────────────────────────────────────
//
// list.tickOwned / list.tickOwnedAria — 'Tick the {n} I can sleeve'.
//   Correct about its pool and silent about its concession, which is the
//   reported failure in one string. The pool survives as bulk.collection's;
//   the concession it never stated is now the line beside it.
//
// UNTOUCHED and reused verbatim:
//
// ── RENAMED, and these are SHIPPED strings outside the pair ─────────────────
//
// One verb for the surface. Nine strings carry the old one and all nine move
// together, or the head says 'select' over rows that say 'tick':
//   list.clearTicks .... 'Clear all ticks'          → 'Clear all selections'
//   list.cap ........... 'Untick one to swap another in'
//                                                   → 'Deselect one to swap another in'
//   list.head .......... '{n} of {m} slots ticked'  → '… slots selected'
//   list.headMobile .... '{n} of {m} ticked'        → '{n} of {m} selected'
//   commit.nothingTicked / .nothingTickedUnowned / .nothingTickedAllDeclined
//                        'nothing ticked: …'        → 'nothing selected: …'
//   announce.ticked / .tickedNoBuy / .capped / .declined / .restoredAll
//                        '{n} of {m} ticked[, …]'   → '… selected[, …]'
// The KEY names are eng's to keep or rename; only the strings are Design's.
//
// UNTOUCHED and reused verbatim:
//   commit.add / .consequence / .toBuy ... the bar restates both figures
//   list.decline / .restore / .restoreAll ... the set-aside cluster
//   strip.doorNote / .doorNoteNoneFree ... which of the two zeroes b9 is
