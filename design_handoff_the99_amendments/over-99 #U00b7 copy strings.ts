// src/lib/copy/decks-builder.ts — amendment 3, decks over 99.
//
// Shape follows the shipped file: flat const object, functions for interpolated
// strings, no JSX, no number formatting (callers pass pre-formatted strings).
// Voice: Kitchen Table. Over is a working state, so the copy never apologises
// and never warns — it states the arithmetic and names the way out.
//
// Existing strings this block does NOT touch:
//   deckImportCopy.unresolved.deckCardBadge   the other --warning line on the
//                                             deck card; the two stack
//   deckImportCopy.arrival.*                  the import arrival strip
//   availabilityCopy.deckRollup.*             the bands below the spine —
//                                             a different family entirely
//   recommendationsCopy.fill.*                the fill provenance lines, which
//                                             cannot render on an over deck
//   The four shipped statusPill values as displayed strings: 'Draft',
//   'Building', 'Playable', 'Complete' — unchanged.

export const overCopy = {
  // ── The pill ──────────────────────────────────────────────────────────
  // The fifth value. One word, like the other four, and it names the deck's
  // state rather than the player's activity ('Trimming' was the alternative
  // and it describes a person, not a list).
  pill: "Over",

  // ── The count ─────────────────────────────────────────────────────────
  figure: {
    // The denominator never becomes the total: 99 is a rule of the format, not
    // a target the deck outgrew. Callers pass both figures pre-formatted.
    // Rendered as three spans so the middle one keeps --fg-faint.
    over: (built: string) => built,
    denominator: " / 99",
    // A second figure, not a recolour — a lone amber 104 beside a 99 asks the
    // player to do the subtraction.
    delta: (n: string) => `+${n}`,
    // Absent on the phone deck card, where `toCut` carries it instead.
  },

  // ── The deck card's line ──────────────────────────────────────────────
  // Mono, --warning, in the unresolved marker's slot. Terse because it sits in
  // a card the player is scanning past, and because the spine says it properly.
  toCut: (n: string) => (n === "1" ? "1 to cut" : `${n} to cut`),

  // ── The spine's trim line ─────────────────────────────────────────────
  // Three clauses, and the third is load-bearing: it is the sentence that tells
  // a first-time overfiller they have not broken anything. Words, not digits,
  // for the same reason the completion reveal says 'Ninety-nine.' — this line
  // sits under a figure that already printed the number twice.
  trim: {
    lead: (words: string) => `${words} over the ninety-nine.`,
    body: (n: string) =>
      n === "1"
        ? "Cut one and it is legal. Building long and trimming back is a normal way to get there."
        : `Cut ${n} and it is legal. Building long and trimming back is a normal way to get there.`,
    // 390px drops the trailing clause — the same shortening RollupBands applies
    // when it stacks two lines.
    bodyShort: (n: string) =>
      n === "1" ? "Cut one and it is legal." : `Cut ${n} and it is legal.`,
    // Spelled out to nineteen, then digits. Deliberately small: past twenty the
    // player has pasted something wholesale and 'Thirty-eight' is more precious
    // than useful.
    words: [
      "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen",
    ],
  },

  // ── The export dialog's one added line ────────────────────────────────
  // Stating a fact where the list leaves the app. Not a warning, not a
  // blocker — the player is very likely exporting it in order to do the
  // cutting somewhere else.
  exportNote: (built: string, n: string) =>
    n === "1"
      ? `This list is ${built} cards. One over what a Commander deck can hold.`
      : `This list is ${built} cards. ${n} over what a Commander deck can hold.`,

  // ── Accessibility ─────────────────────────────────────────────────────
  aria: {
    // Replaces the shipped `${built} of 99 cards built` on the progressbar when
    // over. aria-valuemax moves to Math.max(99, built) in the same edit: a
    // valuenow of 104 against a max of 99 is an invalid range and some readers
    // clamp it to 100%, which is the one reading this amendment exists to stop.
    progress: (built: string, n: string) =>
      n === "1" ? `${built} cards, 1 over the 99` : `${built} cards, ${n} over the 99`,
    // The pill is a word, so it needs nothing. Named here to say so.
    pillNeedsNoLabel: true,
  },
} as const;

// ── DELETED ────────────────────────────────────────────────────────────
//
// Both of these become unreachable when the cap is lifted, and both are
// deleted rather than reworded. A rejection message for a rejection that can
// no longer happen is the kind of string that comes back as a bug report two
// years later.
//
//   DELETE  src/lib/decks/mutation-result.ts:18
//           "deck-full": "This deck is already at 99 cards, so there's no room
//                         for another."
//           …and the 'deck-full' member of the DeckAddRejection union, and the
//           assertion in mutation-result.test.ts that names the number.
//
// ── REPLACES ───────────────────────────────────────────────────────────
//
//   deck-card.tsx  aria-label `${deck.built} of 99 cards built`
//     → overCopy.aria.progress(...) when built > 99. Unchanged at or below 99.
//
// ── NOT ADDED, deliberately ────────────────────────────────────────────
//
//   No 'Review the extras' / 'Trim these' CTA string. Nothing walks the player
//   to the cards to cut, because the five most recently added are almost never
//   the five they want to lose. README gap 2.
//
//   No confirmation string for crossing 99. Crossing asks nothing.
//
//   No ceiling message. There is no state above Over.
