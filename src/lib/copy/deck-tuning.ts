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
