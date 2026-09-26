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
    // Eng-written, owed to /copy-review: the in-place edit's way out, undrawn.
    cancel: "cancel",
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
    // Help me choose's answers as the brief (design: *Built around {commander}: {theme}, with
    // {card}, under {$cap}, bracket {n}.*). Owed to /copy-review with the rest of the line's copy.
    seededAnswers: (commanders: string, parts: readonly string[]) => `Built around ${commanders}: ${parts.join(", ")}.`,
    answerThemes: (labels: readonly string[]) =>
      labels.length < 2 ? labels.join("") : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`,
    /** Themes asked as any of (Help me choose's three-answers addendum): *any of Orcs, Elves or Wizards*. */
    answerThemesAny: (labels: readonly string[]) =>
      `any of ${labels.length < 2 ? labels.join("") : `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`}`,
    answerCard: (name: string) => `with ${name}`,
    answerBudget: (dollars: number) => `under $${dollars}`,
    answerBracket: (bracket: number) => `bracket ${bracket}`,
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

  // ── Suggested changes: the panel (placement addendum v2, sections A, C, D, E) ──
  // Transcribed from canvas v2's strings (:727-781) at up to five swaps, with the handoff's
  // state 5 and failure strings rewritten: every one of those said three swaps or one note and
  // carried a dash. The eng-written forms are marked; all of them are owed to /copy-review.
  panel: {
    heading: "Suggested changes",
    suggest: "Suggest changes",
    again: "Suggest again",
    // A counted word, as the canvas writes it: "Nine games in, and cards in hand has been marked
    // against you in 7 of 9."
    readyLead: (gamesWord: string, axis: string, marked: number, games: number) =>
      `${gamesWord} games in, and ${axis} has been marked against you in ${marked} of ${games}. We will read everything below and suggest up to five swaps, each a card out, a card in, and the reason.`,
    noGamesLead:
      "No games logged yet, so we will read this list, the recommended mix and what you own, and suggest up to five swaps. Log a game and suggestions can also cite how the deck played.",
    unmarkedLead: (gamesWord: string) =>
      `${gamesWord} games logged, and none is marked for what worked or hurt. We will read the results, your game notes, this list and what you own, and suggest up to five swaps. Mark what decided a game and suggestions can point at it.`,
    loadingHeading: "Shuffling through your deck\u2026",
    loadingLead:
      "Reading your deck. This takes a few seconds, and the list below stays on screen when the suggestions arrive.",
    reading: "Reading\u2026",
    stop: "Stop",
    resultsLead: (nWord: string) =>
      `${nWord} swaps, each a card out and a card in. Nothing moves until you apply one.`,
    // Eng-written: the singular the canvas does not draw.
    resultsLeadOne: "One swap, a card out and a card in. Nothing moves until you apply it.",
    // Replaces `resultsLead` when the checks dropped some: the count is never padded back.
    fewerLead: (nWord: string, droppedWord: string) =>
      `${nWord} swaps this time. ${droppedWord} more did not hold up to checking.`,
    fewerLeadOne: (droppedWord: string) =>
      `One swap this time. ${droppedWord} more did not hold up to checking.`,
    allDoneLead: (totalWord: string, applied: number, rejected: number) =>
      `All ${totalWord} answered: ${applied} applied, ${rejected} rejected. Suggest again for a new set, read from the deck as it is now.`,
    allDoneLeadOne: (applied: boolean) =>
      `Answered: ${applied ? "applied" : "rejected"}. Suggest again for a new set, read from the deck as it is now.`,
    // Eng-written for a deck with no version when the set was read.
    retiredLead: (from: number | null, to: number) =>
      from === null
        ? `Your last suggestions were read before this deck had a version. Committing version ${to} cleared them, so a new set reads the list you committed.`
        : `Your last suggestions were for version ${from}. Committing version ${to} cleared them, so a new set reads the list you committed.`,
    tally: (applied: number, total: number, rejected: number) =>
      rejected > 0 ? `${applied} of ${total} applied · ${rejected} rejected` : `${applied} of ${total} applied`,
    // State 5, rewritten count-neutral. A successful run with an honest answer, in ordinary ink.
    unchanged: (when: string) =>
      `Nothing has changed since ${when}: no new game, no edit to the list or to what this deck is for, so a new run would only repeat these.`,
    unchangedReasonGamesKey: "games",
    unchangedReasonGames: (n: number, when: string) =>
      n === 0 ? "none logged yet" : `${n} of ${n} already read, none logged since ${when}`,
    unchangedReasonAxisKey: "weakest axis",
    unchangedReasonAxis: (axis: string, hurt: number, games: number) =>
      `${axis}, marked against you in ${hurt} of ${games}`,
    unchangedReasonIntentKey: "this deck is for",
    unchangedReasonIntent: "unchanged since you wrote it",
    unchangedReasonIntentEmpty: "still blank",
    unchangedTail:
      "Log a game or edit what this deck is for, and there will be something new to read.",
    unchangedCta: "Suggest again anyway",
  },

  // ── The manifest: what a run reads, one row per read, ticked when the read lands ──
  manifest: {
    games: "Your games",
    gamesCount: (n: number) => (n === 1 ? "1 game" : `${n} games`),
    gamesUnmarked: (n: number) => (n === 1 ? "1 game · no marks" : `${n} games · no marks`),
    noneLogged: "none logged",
    logGame: "Log a game \u2192",
    notes: "Notes on your games",
    notesCount: (m: number, n: number) => `on ${m} of ${n} games`,
    // C1 names the list alone; the no-games and unmarked frames (D1, E5) name the mix beside it.
    list: "This list",
    listVsMix: "This list, against the recommended mix",
    listCount: (n: number) => `${n} cards`,
    // Eng-written: r2 gives the intent its own row and no label (README :88).
    intent: "What you said this deck is for",
    intentCount: "your words",
    collection: "What you own, and what a card costs",
    collectionCount: "your collection",
    progress: (done: number, total: number) => `${done} of ${total} read`,
    // The collapsed form above results: parts joined with " · ".
    readFrom: (parts: readonly string[]) => `read from ${parts.join(" · ")}`,
    readGames: (n: number) => (n === 1 ? "1 game" : `${n} games`),
    readNotes: (n: number) => (n === 1 ? "1 game note" : `${n} game notes`),
    readCards: (n: number) => `${n} cards`,
    readMix: "the recommended mix",
    readCollection: "your collection",
    readNoGames: "no games logged",
  },

  // ── The failure classes: tag, body, what survived, one Try again ────────
  // Rewritten from the handoff's four (every one said "your note" or three swaps, and carried a
  // dash). `interrupted` is undrawn: built from the drawn four's shape (audit finding A). Every
  // failed run is refunded (Hugh, 2026-09-23), so "nothing was charged" is true of all five.
  failure: {
    retry: "Try again",
    unavailable: {
      tag: "unavailable",
      heading: "We couldn\u2019t reach the service",
      body: "It is not something you did, and it is usually back within a few minutes.",
      kept: "Your games, your notes and your list are untouched. Nothing was changed and no credit was used.",
      note: "or come back later: the button will be here",
    },
    timeout: {
      tag: "timed out",
      heading: "This one took too long",
      body: "We stopped it before it came back. A long list and a full game log are a lot to read, and now and then it does not finish.",
      kept: "Nothing was applied and no credit was used.",
      note: "trying again usually works",
    },
    malformed: {
      tag: "unusable answer",
      heading: "We couldn\u2019t use that answer",
      body: "We are not going to show you a guess at what it meant.",
      kept: "Your games, your notes and your list are untouched, nothing was applied, and no credit was used.",
      note: "this one is on us",
    },
    ungrounded: {
      tag: "nothing held up",
      heading: "None of the swaps held up",
      body: "Each failed a check: a card outside the deck\u2019s colors, a cut the deck does not hold, or a reason with nothing countable behind it. We would rather show you none than one we cannot back.",
      kept: "Nothing was applied, your list is untouched, and no credit was used.",
      note: "log another game and there is more to go on",
    },
    interrupted: {
      tag: "interrupted",
      heading: "That run did not finish",
      body: "Nothing you did caused it.",
      kept: "Nothing was applied and no credit was used.",
      note: "",
    },
  },

  // ── The suggestion card ────────────────────────────────────────────────
  card: {
    apply: "Apply",
    applying: "Applying\u2026",
    reject: "Reject",
    applied: "applied",
    undo: "Undo swap",
    rejected: "rejected",
    restore: "Show it again",
    noLongerApplies: "no longer applies",
    cutGone: (name: string) => `${name} has left the deck, so this swap cannot be applied.`,
    // Eng-written: the add's half of the rule, undrawn.
    addAlreadyIn: (name: string) => `${name} is already in the deck, so this swap cannot be applied.`,
    // The bracket flag. Compare the LOWEST bracket each set permits (READINESS-r3-audit.md, note
    // 1): higher raises, lower lowers, and an equal lowest with a different set changes. The
    // third is eng-written.
    bracketRaises: "Applying it raises the deck\u2019s bracket to",
    bracketLowers: "Applying it lowers the deck\u2019s bracket to",
    bracketChanges: "Applying it changes the deck\u2019s bracket to",
    // Citation chips: source · value. The source is the evidence kind, named for a reader.
    cite: { games: "games", note: "note", decklist: "list", intent: "you said", mix: "mix" },
    open: (name: string) => `Open ${name}`,
    swap: (cut: string, add: string) => `Swap ${cut} for ${add}`,
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
    citation: "Every suggestion must carry at least one citation naming what it read: the games, a note, the decklist, the intent, or the mix.",
    quotedNote: "A quoted note must be byte-identical to what the player typed, in quotation marks, with its date.",
    colourIdentity: "The added card must be legal in the commander\u2019s colour identity.",
    cutInDeck: "The cut card must currently be in the deck.",
    onePair: "Every suggestion is exactly one cut and one add: the deck count never changes.",
    ownershipNotRanking: "Ownership and price may not affect which cards are suggested or their order.",
    noBracketClaim: "No rationale or citation may name a bracket. The app says when a swap moves one.",
    noResultClaim: "No rationale or citation may promise a result: not that a swap will win, lose, or make the deck stronger.",
  },

  // ── The live region, and the reason beside a refused press ─────────────
  // Only the keys something reads today; the rest arrive with the panel.
  announce: {
    started: "Reading your deck",
    unchanged: "No new suggestions. Nothing has changed since the last run.",
    ready: (n: number) => (n === 1 ? "One suggested swap is ready." : `${n} suggested swaps are ready.`),
    stopped: "Stopped. No credit was used.",
    applied: (cut: string, add: string) => `Applied. ${add} is in the deck and ${cut} is out.`,
    undone: (cut: string) => `Put back. ${cut} is in the deck again.`,
    rejected: "Rejected.",
    restored: "Shown again.",
    intentSaved: "Saved what this deck is for.",
  },

  // ── The shared model allowance, spent: the refusal a press gets ────────
  // The panel draws `creditsCopy.spent` with the time; this is what a stale tab or a replayed
  // request is told, where there is no clock of the reader's to name a time in. PLACEHOLDER,
  // owed to /copy-review.
  allowance: {
    spent: "No credits left. The next one comes back within a day.",
  },

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
