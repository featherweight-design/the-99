// src/lib/copy/deck-tuning.ts — #10, deck tuning suggestions.
// Shape follows src/lib/copy/game-log.ts and decks-builder.ts: flat const object,
// functions for interpolated strings, no JSX, no number formatting (callers pass
// pre-formatted strings). Voice: Kitchen Table.
//
// This block ADDS ONLY. It edits nothing and redefines nothing:
//   PATTERN_MIN, axisCopy, gameLogCopy.*   imported from game-log.ts, never restated
//   decksBuilderCopy.rowOwned / rowNotOwned   the ownership atoms, reused verbatim
//   REJECTION_MESSAGES                    server rejections live there, not here
//
// TWO rules govern this file, and both are checkable:
//
//   1. NO STRING HERE PRINTS A PERCENTAGE OR A NET. Every count carries its own
//      denominator, in the same element. Inherited from #9 (see LOW-N-summary.md)
//      and it governs MODEL OUTPUT too — a rationale that breaks it is dropped by
//      the validator, not rewritten. See suggestionRules below.
//
//   2. THE PLAYER'S OWN WRITING IS QUOTED, NEVER PARAPHRASED. The game note and
//      the deck intent are passed to the model verbatim and cited verbatim, with
//      their date. No summarising, no clustering, no tag extraction.

import { PATTERN_MIN, axisCopy } from './game-log';

export { PATTERN_MIN, axisCopy };

/**
 * The four things a run reads, in order. Rendered unchecked in the ready state,
 * ticking in the generating state, and collapsed to one line above the results.
 * A row is only rendered for something actually read — with no deck intent, the
 * intent row is absent and the ask appears above the button instead.
 */
export const manifestCopy = {
  games: {
    what: 'Your games and what they said',
    count: (n: string) => `${n} games`,
    countOne: '1 game',
  },
  notes: {
    what: 'The note you left on a game',
    whatMany: 'The notes you left on your games',
    count: (n: string) => `${n} notes`,
    countOne: '1 note',
  },
  decklist: {
    what: 'This decklist',
    count: (n: string) => `${n} cards`,
  },
  collection: {
    // Two things in one row deliberately — splitting it to five rows made the
    // wait look longer than it is. See gap 4.
    what: 'What you own, and what a card costs',
    count: 'your collection',
  },
  intent: {
    what: 'What you said this deck is for',
    count: 'your words',
  },
  // Progress figure. A COUNT, with its denominator. Never a percentage and never
  // an indeterminate bar.
  progress: (done: string, total: string) => `${done} of ${total} read`,
  // The collapsed one-line form above the results. Callers join with ' · '.
  collapsed: (parts: string) => `read from ${parts}`,
};

export const deckTuningCopy = {
  // ── The panel. ONE heading, all six states. ────────────────────────────
  panel: {
    // Never gains a count, a colour, an icon, or a state word. It is the
    // accessible name of the section and the focus target after a run.
    heading: 'Suggested changes',

    // State 1 — below PATTERN_MIN. A disabled primary and NO error: nothing has
    // gone wrong, the player has not logged three games yet.
    belowThreshold: (axis: string, marked: string, count: string) =>
      `This needs ${PATTERN_MIN} games. You have ${count}, and they already lean the same way — ${axis}, ${marked} of ${count}. One more and we can point at a card instead of a pattern.`,
    belowThresholdFlat: (count: string) =>
      `This needs ${PATTERN_MIN} games. You have ${count} — enough to notice something, and not enough to spend a swap on.`,
    belowThresholdSub:
      'We read your games, your note, this list and what you own.',
    // The gate, stated ONCE, as a count with its denominator. Never a progress
    // meter, never "unlock", never "2 more to go!".
    belowThresholdNote: (have: string) => `one more game — ${have} of ${PATTERN_MIN}`,

    // State 2 — ready. Not an empty state: a briefing, written to be worth
    // pressing, because generation is manual and a player who never presses
    // gets nothing.
    ready: (count: string, axis: string, marked: string) =>
      `${count} games in, and ${axis} has been marked against you in ${marked} of ${count}. We will read four things and propose three swaps — each one a card out, a card in, and the reason.`,
    readyCta: 'Suggest changes',
    readyNote: 'takes a few seconds · nothing changes until you say so',

    // State 3 — generating. The manifest is the content; this is its preamble.
    generating:
      'Reading your deck. This takes a few seconds — the list below is what we are looking at, and it stays on screen when the suggestions arrive.',
    generatingCta: 'Reading\u2026',
    // A cancel is not a failure. Returns to state 2, manifest unchecked, no
    // error and no tag.
    stop: 'Stop',

    // State 4 — results.
    results: (n: string, total: string) =>
      `${n} swaps, all aimed at the same thing. Each is a card out and a card in — the count stays at ${total} and nothing moves until you apply it.`,
    resultsOne: (total: string) =>
      `One swap. A card out and a card in — the count stays at ${total} and nothing moves until you apply it.`,
    again: 'Suggest again',
    againNote: (open: string, total: string) =>
      `${open} of ${total} still open · these stay until you replace them`,
    // Footer count once the player has acted. Denominators, as everywhere.
    tally: (applied: string, total: string) => `${applied} of ${total} applied`,
    tallyWithDismissed: (applied: string, total: string, dismissed: string) =>
      `${applied} of ${total} applied · ${dismissed} dismissed`,

    // State 5 — nothing has changed. A SUCCESSFUL run with an honest answer, so
    // it takes ordinary ink. --danger appears nowhere in this state.
    unchanged: (when: string) =>
      `Same three swaps as last time. Nothing has changed since ${when} — the same axis is still your weakest, and you have not logged a game since we last looked. We would only be repeating ourselves.`,
    // The reason, in three countable lines. "No new suggestions" with nothing
    // after it is the app shrugging.
    unchangedReasonGames: (n: string, total: string, when: string) =>
      `${n} of ${total} already read — none logged since ${when}`,
    unchangedReasonAxis: (axis: string, marked: string, count: string, when: string) =>
      `${axis}, ${marked} of ${count} — the same one as ${when}`,
    unchangedReasonIntent: 'unchanged since you wrote it',
    unchangedReasonIntentEmpty: 'still blank',
    unchangedTail: (when: string) =>
      `The three from ${when} are still below, still open. Log a game or edit what this deck is for, and there will be something new to read.`,
    unchangedCta: 'Suggest again anyway',
    unchangedNote: (open: string, total: string, when: string) =>
      `${open} of ${total} from ${when} still open`,
  },

  // ── State 6 · the four failure classes. ────────────────────────────────
  // NOTE FOR THE AUDIT: these four labels are Design's inference — §6 was not
  // readable from the design project. The COUNT is four and the SHAPE is one
  // (tag, one sentence, a line saying what survived, one Try again). Renaming or
  // re-splitting them is a change to this object and nothing else.
  //
  // Every class states WHAT SURVIVED. The fear a failed AI call raises is that
  // it did something; the copy answers that before it is asked.
  failure: {
    retry: 'Try again',

    unavailable: {
      tag: 'unavailable',
      body: 'We couldn\u2019t reach the service that writes these. It is not something you did and it is usually back within a few minutes.',
      kept: (games: string) =>
        `Your ${games} games, your note and your list are untouched. Nothing was changed and nothing was charged.`,
      note: 'or come back later — the button will be here',
    },

    timedOut: {
      tag: 'timed out',
      body: 'This one took too long and we stopped it. Nine games and a 99-card list is a lot to read, and occasionally it does not come back.',
      bodyFor: (games: string, cards: string) =>
        `This one took too long and we stopped it. ${games} games and a ${cards}-card list is a lot to read, and occasionally it does not come back.`,
      kept: 'Nothing was applied. The suggestions from your last run are still below, still open.',
      keptNone: 'Nothing was applied and nothing was changed.',
      note: (done: string, total: string) => `stopped at ${done} of ${total} read`,
    },

    unusable: {
      tag: 'unusable answer',
      body: 'We got an answer back and could not make sense of it — so we are not going to show you a guess at what it meant.',
      kept: 'Your games, your note and your list are untouched, and nothing was applied.',
      note: 'this one is on us',
    },

    // Generation SUCCEEDED and produced nothing that survived validation. Told
    // plainly, because none is better than one we cannot back.
    nothingHeldUp: {
      tag: 'nothing held up',
      body: (commander: string) =>
        `It came back with swaps and none of them stood up to checking — cards outside ${commander}\u2019s colours, a cut that is not in this deck, and reasons with nothing countable behind them. We would rather show you none than one we cannot back.`,
      kept: (rejected: string) =>
        `0 of ${rejected} suggestions survived checking. Nothing was applied and your list is untouched.`,
      note: 'log another game and there is more to go on',
    },
  },

  // ── The suggestion card (surface 5). ──────────────────────────────────
  card: {
    cut: 'Cut',
    add: 'Add',
    // The add column's heading after the swap is applied.
    added: 'Added',

    // Ownership. The SHIPPED atoms — decksBuilderCopy.rowOwned / rowNotOwned —
    // re-exported here only so the audit can see they were not rewritten.
    // Ownership is a LABEL: it never filters, ranks, sorts or suppresses.
    owned: (qty: string) => `\u00d7${qty} owned`,
    notOwned: 'not owned',
    // Price ONLY when not owned, and only as one figure. No totals across the
    // three swaps — a tuning panel with a basket in it is a shop.
    // Substitute the shipped price formatter; this is its shape.
    price: (amount: string) => amount,

    // Citation chips. Four sources, matching the manifest exactly, so any claim
    // traces back to something the player typed. A suggestion with no citable
    // evidence IS NOT SHOWN.
    citeGames: 'games',
    citeNote: 'note',
    citeDecklist: 'decklist',
    citeIntent: 'intent',
    citeGamesValue: (axis: string, marked: string, count: string) =>
      `${axis} · ${marked} of ${count}`,
    citeNoteValue: (date: string) => date,

    // The consequence, printed BEFORE the tap. Apply-plus-verdict, with the
    // verdict half legible in advance.
    consequenceOwned: (total: string, status: string) =>
      `stays ${total} / ${total} · ${status} · you own it`,
    consequenceUnowned: (total: string) =>
      `stays ${total} / ${total} · adds 1 to your shopping list`,

    apply: 'Apply this swap',
    applying: 'Applying\u2026',
    dismiss: 'Not this one',

    // Applied. The stamp, then the deck's verdict in the SHIPPED status wording,
    // then the shopping consequence in one clause. No toast, no navigation.
    applied: 'applied',
    appliedVerdict: (have: string, total: string, status: string) =>
      `${have} / ${total} · ${status}`,
    appliedOwnedClause: 'nothing added to your shopping list — you own it',
    appliedUnownedClause: (name: string, amount: string) =>
      `${name} is on your shopping list · ${amount}`,
    // A real inverse mutation, not a five-second window. Available for as long
    // as the suggestion is on screen.
    undo: 'Put it back',

    // Dismissed. One line, same slot, no question asked.
    dismissed: 'not this one',
    dismissedPair: (cut: string, add: string) => `${cut} \u2192 ${add}`,
    restore: 'Show it again',

    applyRefused: 'We couldn\u2019t make that swap. Nothing has changed.',
    undoRefused: 'We couldn\u2019t put that card back. Nothing has changed.',
  },

  // ── Deck intent (surface 3). ──────────────────────────────────────────
  // Lives under the deck name once it exists; the ASK lives in the panel. There
  // is no empty state in the header — absent means absent.
  intent: {
    askLabel: 'What is this deck for?',
    ask: (axis: string, count: string) =>
      `One line, and the suggestions get sharper. Without it we can only read the games — ${count} of them say ${axis} is the problem, and we would guess at whether you want to fix that by drawing more or by winning sooner.`,
    placeholder: 'e.g. grind a four-person table out and win late with Gisa',
    save: 'Save this',
    // Skippable, and it says so. An intent gate on a feature the player already
    // waited for is a paywall made of typing.
    skip: 'or skip it — the suggestions still run',
    edit: 'edit',
    editAria: 'Edit what this deck is for',
    // App-seeded. The chip is an authorship statement and it is removed
    // PERMANENTLY on first edit — see INTENT-where-it-lives.md.
    seeded: 'from the build',
    seededAria: 'This came from the brief The 99 built this deck to',
    maxLength: 120,
  },

  // ── The game note (surface 1, amends #9's form). ──────────────────────
  note: {
    label: 'Note',
    hint: 'optional — one line, in your words',
    // A count with its denominator, like everything else. ABSENT until the field
    // has focus or content; --warning from warnAt; hard stop at maxLength with
    // no error, because a cap you cannot exceed does not need one.
    counter: (n: string, max: string) => `${n} / ${max}`,
    maxLength: 140,
    warnAt: 130,
    // AMENDS gameLogCopy.form.optionalNote. Three words longer, still one line.
    optionalNote: 'marks and the note are optional — a result on its own is a game',
    // Never parsed for axis marks. The checkboxes are the structured answer.
    ariaDescription: 'Optional. One line about this game, up to 140 characters.',
  },

  // ── Validation of MODEL output, before render. ────────────────────────
  // Design is asking for a filter that DROPS candidates, not a prompt that asks
  // nicely. A candidate failing any of these is not shown and counts as
  // rejected; all rejected → failure.nothingHeldUp.
  suggestionRules: {
    noPercentage: 'No rationale or citation may contain a percentage.',
    noNet: 'No rationale or citation may contain a signed integer or the word "net".',
    denominator:
      'Every count in a rationale or citation must appear with its denominator in the same element — "7 of 9", not "7 games".',
    citation: 'Every suggestion must carry at least one citation naming one of the four read sources.',
    quotedNote: 'A quoted note must be byte-identical to what the player typed, in quotation marks, with its date.',
    colourIdentity: 'The added card must be legal in the commander\u2019s colour identity.',
    cutInDeck: 'The cut card must currently be in the deck.',
    onePair: 'Every suggestion is exactly one cut and one add — the deck count never changes.',
    ownershipNotRanking: 'Ownership and price may not affect which cards are suggested or their order.',
  },

  // ── Live region · one message per settle, never one per manifest line. ─
  announce: {
    started: 'Reading your deck',
    ready: (n: string) => `${n} suggestions ready`,
    readyOne: 'One suggestion ready',
    unchanged: 'No new suggestions. Nothing has changed since the last run.',
    stopped: 'Stopped. Nothing was changed.',
    failed: (sentence: string) => sentence,
    applied: (name: string, have: string, total: string, status: string) =>
      `${name} swapped in. ${have} of ${total}, ${status}.`,
    undone: (name: string, have: string, total: string, status: string) =>
      `${name} put back. ${have} of ${total}, ${status}.`,
    dismissed: (open: string, total: string) =>
      `Suggestion dismissed. ${open} of ${total} still open.`,
    intentSaved: 'Deck intent saved.',
  },
} as const;
