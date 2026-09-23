// Deck tuning (#10) — copy.
//
// The plan's Task 2 declares this module for the whole feature: the panel, the
// suggestion cards, the manifest, the deck intent, the failure classes. Only
// the note section is here, because only the note has shipped. The rest
// arrives with the surfaces that draw it rather than sitting here as strings
// nothing renders — a copy file full of unreachable sentences is a file the
// next copy pass has to read and cannot check.
//
// Source: `design/design_handoff_the99_deck_tuning/deck-tuning · copy strings.ts`
// and `docs/superpowers/design-tables/deck-tuning.md` §Game Log Form — Note Field.

/**
 * Characters as the database counts them.
 *
 * `String.prototype.length` counts UTF-16 code units, so an emoji is two and a
 * flag is four; Postgres `char_length` — which is what `deck_games`'s check
 * uses — counts code points. Counting the JavaScript way would let the form
 * report "142 / 140" for 71 emoji the column would have stored happily, and
 * would make the action refuse them. One definition, and it is the column's.
 *
 * It is not grapheme clusters, which is a third answer again: a family emoji is
 * several code points and one grapheme. The column is the contract, so the
 * column's counting wins.
 */
export function countCharacters(value: string): number {
  return [...value].length;
}

export const deckTuningCopy = {
  // ── What this deck is for (Surface 3) ─────────────────────────────────
  // Transcribed from the handoff's copy strings; the one dash in `ask` and `skip` is set as
  // a colon here, per the 2026-09-13 em-dash sweep. `maxLength` is read by the intent cap in
  // `src/lib/tuning/limits.ts`, which counts code points the way the column's check does.
  intent: {
    askLabel: "What is this deck for?",
    ask: (axis: string, count: string) =>
      `One line, and the suggestions get sharper. Without it we can only read the games: ${count} of them say ${axis} is the problem, and we would guess at whether you want to fix that by drawing more or by winning sooner.`,
    placeholder: "e.g. grind a four-person table out and win late with Gisa",
    save: "Save this",
    // Skippable, and it says so. An intent gate on a feature the player already waited for is
    // a paywall made of typing.
    skip: "or skip it: the suggestions still run",
    edit: "edit",
    editAria: "Edit what this deck is for",
    // App-seeded. The chip is an authorship statement, removed PERMANENTLY on first edit.
    seeded: "from the build",
    seededAria: "This came from the brief The 99 built this deck to",
    maxLength: 120,
    // PLACEHOLDER, eng-written, owed to /copy-review: the handoff draws the seeded state and not
    // its sentence. The brief a fill builds to is "around the commander, from what you own", and
    // that is all it may say: anything more is a guess, and a guess wearing the seeded chip is
    // the one thing the chip exists to prevent.
    seededBrief: (commanders: string) => `Built around ${commanders}, from the cards you own.`,
    seededBriefShort: (commanders: string) => `Built around ${commanders}.`,
    // PLACEHOLDER refusals, owed to /copy-review. The shipped MutationError draws them.
    tooLong: "Keep it to one line of 120 characters.",
    refused: "That did not save. Try again.",
  },

  // ── The server's own refusals (PLACEHOLDER, owed to /copy-review) ──────
  // The panel's drawn states replace most of these; they are what a stale tab or a replayed
  // request is told.
  run: {
    refused: "We couldn\u2019t read that deck.",
  },
  card: {
    applyRefused: "We couldn\u2019t make that swap. The deck is unchanged.",
    undoRefused: "We couldn\u2019t undo that swap. The deck is unchanged.",
    verdictRefused: "That did not save. Try again.",
  },

  // ── The rules a suggestion must obey (validator rule text) ─────────────
  // Handed to the model VERBATIM as its instructions, and named by the validator for each drop,
  // so the model's instructions and the checks cannot drift. Transcribed from the handoff; the
  // two dashes are set as colons, per the 2026-09-13 sweep.
  suggestionRules: {
    noPercentage: "No rationale or citation may contain a percentage.",
    noNet: 'No rationale or citation may contain a signed integer or the word "net".',
    denominator:
      'Every count in a rationale or citation must appear with its denominator in the same element: "7 of 9", not "7 games".',
    citation: "Every suggestion must carry at least one citation naming one of the four read sources.",
    quotedNote: "A quoted note must be byte-identical to what the player typed, in quotation marks, with its date.",
    colourIdentity: "The added card must be legal in the commander\u2019s colour identity.",
    cutInDeck: "The cut card must currently be in the deck.",
    onePair: "Every suggestion is exactly one cut and one add: the deck count never changes.",
    ownershipNotRanking: "Ownership and price may not affect which cards are suggested or their order.",
  },

  // ── The live region, and the reason beside a refused press ─────────────
  // Only the keys something reads today; the rest arrive with the panel.
  announce: {
    started: "Reading your deck",
    unchanged: "No new suggestions. Nothing has changed since the last run.",
  },

  // ── The shared model allowance, spent ──────────────────────────────────
  // PLACEHOLDER, eng-written: the handoff predates the allowance (Hugh, 2026-09-23) and draws no
  // state for it. The placement addendum returns the drawn wording, with the synopsis in view,
  // since both features show it; until then this is the refusal a press gets. No time in it —
  // the panel names when the next unit returns, in the reader's own clock.
  allowance: {
    spent: "You have used today\u2019s suggestions. They come back within a day.",
  },

  // ── The game note (Surface 1, amends #9's form) ────────────────────────
  note: {
    label: "Note",
    // The desktop gloss. The phone frame draws the short form: the label row
    // is a flex line and the full sentence would push the counter onto a
    // second one at 390px.
    //
    // NOT "optional" here. At `md:` the footer below the buttons already says
    // "marks and the note are optional", so the word appeared twice on one
    // screen. The phone keeps `hintShort` BECAUSE that footer is
    // `hidden md:block` — there this is the only marker, and dropping it would
    // leave the field looking required.
    hint: "one line, in your words",
    hintShort: "optional",
    // A count with its denominator, like everything else on this surface.
    // ABSENT until the field has focus or content; `--warning` from `warnAt`;
    // a hard stop at `maxLength` with no error, because a cap you cannot
    // exceed does not need one.
    counter: (n: string, max: string) => `${n} / ${max}`,
    maxLength: 140,
    warnAt: 130,
    // AMENDS `gameLogCopy.form.optionalNote`, which said "marks are optional".
    // Three words longer, still one line.
    optionalNote: "marks and the note are optional: a result on its own is a game",
    // Never parsed for axis marks: the checkboxes are the structured answer
    // and inferring marks from prose would corrupt the aggregate the player
    // thinks they control.
    ariaDescription: "Optional. One line about this game, up to 140 characters.",
    // The line under the field, desktop only.
    //
    // The handoff's canvas draws "Read back to you in the history, and read by
    // the tuning panel — quoted, never paraphrased". The tuning panel does not
    // exist yet, so the clause that promises it is held back rather than
    // shipped as a claim about a surface nobody can open. Restore the full
    // sentence when the panel lands — see §Errata in the design table.
    readBack: "Read back to you in the history:",
    readBackEmphasis: "quoted, never paraphrased",
  },
} as const;
