// The slice of the deck-tuning copy that is not the Tuning panels' strings: the game note and the Games
// tab's pointer to Suggested changes, for the game log and the Games panel.
//
// It is its own module so the surfaces that only need those (the game log form, the Games panel) do not pull the Tuning panels' strings into
// the page's startup chunk. `deck-tuning.ts` spreads `deckTuningGamesCopy` into `deckTuningCopy`, so
// `deckTuningCopy.note` and `deckTuningCopy.gamesLine` still read the same strings for everyone else.

export const deckTuningGamesCopy = {
  // ── The Games tab's pointer to Suggested changes (addendum r1, C1/C2) ────
  // Drawn after the findings, only when the deck has a reading and one game or more.
  gamesLine: {
    lead: "Suggested changes reads these games.",
    link: "It is on the Analysis tab \u2192",
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
    // With Suggested changes on the deck (it ships with the Analysis tab), the clause held back
    // above is true again, and the full sentence is drawn.
    readBackTuned: "Read back to you in the history, and read by Suggested changes:",
    readBackEmphasis: "quoted, never paraphrased",
  },
} as const;
