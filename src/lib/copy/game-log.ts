// src/lib/copy/game-log.ts — deck game log (#9).
// Shape follows src/lib/copy/decks-builder.ts and synergy-discovery.ts: flat const
// object, functions for interpolated strings, no JSX, no number formatting
// (callers pass pre-formatted strings). Voice: Kitchen Table — utility copy
// stays straight; the expressive moments are marked.
//
// This block ADDS ONLY. It edits nothing and duplicates nothing:
//   addPanelCopy.tabs.*   Decklist / Consider — untouched; 'Games' is a third entry
//   REJECTION_MESSAGES    the deck-add rejections — untouched. The game
//                         log's own refusals are defined here, below
//
// One rule governs this whole file, and it is checkable: NO STRING HERE PRINTS A
// PERCENTAGE, AND NO STRING HERE PRINTS `net`. Every count carries its own
// denominator. See LOW-N-summary.md.

import type { GameAxisKey } from "../decks/game-axes";

/**
 * The presentation threshold, and the ONLY place it lives. Below this many games
 * the summary describes; at or above it, the summary makes a finding. It is not a
 * data gate — §5 forbids one — and `summarizeGames` never sees it.
 */
export const PATTERN_MIN = 3;

/**
 * The eight axis labels and their per-column glosses.
 *
 * The KEYS are locked by the spec (§3) and are not copy. The labels are, and the
 * glosses are the reason a one-word label is safe: the same label appears in both
 * columns, so it carries no direction, and the gloss under it supplies the
 * direction for the column it is standing in.
 *
 * `src/lib/decks/game-axes.ts` stays the source of truth for which axes EXIST and
 * in what order; it holds keys and order alone. Every display string for an axis —
 * label and both glosses — lives here, so an axis has exactly one home for its
 * wording. The Record binding makes a missing or misspelt key a compile error.
 */
export const axisCopy: Record<GameAxisKey, { label: string; worked: string; hurt: string }> = {
  speed: {
    label: 'Speed',
    worked: 'got going fast',
    hurt: 'started too slow',
  },
  card_flow: {
    label: 'Cards in hand',
    worked: 'kept drawing',
    hurt: 'ran out of gas',
  },
  mana: {
    label: 'Mana',
    worked: 'hit every land drop',
    hurt: 'screwed or flooded',
  },
  interaction: {
    label: 'Answers',
    worked: 'answered the threats',
    hurt: 'nothing for their threats',
  },
  board: {
    label: 'Board presence',
    worked: 'built a board',
    hurt: 'got outsized',
  },
  resilience: {
    label: 'Comebacks',
    worked: 'recovered from a wipe',
    hurt: 'never recovered',
  },
  engine: {
    // Possessive, not 'The engine': plenty of decks have a plan and no engine.
    label: 'The deck\u2019s plan',
    worked: 'the plan fired',
    hurt: 'never came together',
  },
  closing: {
    // NOT 'Finishing' — in this product 'finish' already means foil/nonfoil
    // (collection_items_finish_check).
    label: 'Closing the game',
    worked: 'converted the win',
    hurt: 'stalled out',
  },
} as const;

export const gameLogCopy = {
  // ── The tab ───────────────────────────────────────────────────────────
  tab: {
    // Bare at zero games. The COUNT is absent, never the tab — a tab reading
    // 'Games · 0' advertises its own emptiness, and hiding it hides the feature
    // from everyone who has not used it.
    label: 'Games',
    // The count beside the label is aria-hidden, so the tab's whole accessible
    // name is composed here. At zero it says so in words rather than reading a
    // number the sighted tab deliberately does not draw.
    aria: (n: string) => `Games, ${n} logged`,
    ariaNone: 'Games, none logged',
    labelWithCount: (n: string) => `Games \u00b7 ${n}`,
  },

  // ── The empty state · carries the whole pitch (§8.4) ──────────────────
  empty: {
    // The headline is the COUNT, not the act. §1: the log is worth close to
    // nothing until the app can count across games, so 'Track your wins' would
    // be selling the worthless half.
    heading: 'Three games is a pattern.',
    // Quotes the panel's real output, and the quote has to STAY quotable: this
    // is the one string here that makes a promise the app must then keep.
    //
    // It used to read 'ran out of gas, 3 of 3 games' and nothing printed that.
    // The per-column glosses (`axisCopy[key].worked` / `.hurt`) render only on
    // the log form's checkboxes; the aggregate cell draws the axis LABEL, the
    // `M of N` figure and `N up · N down`. So the pitch demonstrated an output
    // no surface produced. Found by review on #585 and #590.
    //
    // `headline.finding` is quoted instead, verbatim, because it is what the
    // tab writes at N >= PATTERN_MIN today AND what it will still write once
    // #10's tuning suggestions land on their own surface. Change this only
    // alongside the sentence it quotes.
    body: 'One game you already remember. The third one is where this tab earns its keep. It starts saying things like',
    bodyQuote: 'Cards in hand is letting this deck down',
    // The sentence closes on the quote. Telling the reader the quote is worth
    // acting on explains a demonstration they have just read.
    bodyAfter: '.',
    // The objection is friction, not value, so the cost is stated in seconds.
    cost: 'Logging takes about fifteen seconds: did you win, how big was the pod, and the two or three things that decided it.',
    cta: 'Log your first game',
  },

  // ── The record line and headline (§8.5) ───────────────────────────────
  headline: {
    // N = 1 — a description. No finding, no bucket, no colour.
    oneGame: 'One game logged.',
    // The record travels as an argument rather than being written into the
    // template: the handoff's example was a win, and a hardcoded `1-0` would
    // have printed a win beside every first game that was lost or drawn.
    oneGameRecord: (record: string, result: string) => `${record} · ${result}`,
    // The clause after the record, in the handoff's own words.
    wonIt: 'won it',
    lostIt: 'lost it',
    drewIt: 'drew it',
    // The record renders beside the heading, so 'it is on the record' narrates
    // the element next to it. What is left is the only thing neither says.
    oneGameNote: 'Two more and this turns into something you can act on.',

    // N = 2 — a leaning. This is the hardest line in the feature: it must not
    // overclaim and must not apologise.
    twoGames: (axis: string) => `${axis} went wrong both times.`,
    twoGamesKeep: (axis: string) => `${axis} has held up both times.`,
    // Not 'both of them': this same note sits under `findingNone`, where no axis
    // was marked in both games and 'both' would be pointing at nothing.
    twoGamesNote: 'Two games. Worth noticing, not yet a pattern.',

    // N >= PATTERN_MIN — a finding about the deck.
    finding: (axis: string) => `${axis} is letting this deck down.`,
    findingKeep: (axis: string) => `${axis} is carrying this deck.`,
    // Fallback when every marked axis nets to zero.
    findingNone: 'Nothing has pointed one way yet.',
    // Fallback when games exist but no axis was ever marked. The record alone.
    recordOnly: (games: string, record: string) => `${games} games logged. ${record}.`,

    // The denominator is in the SENTENCE, not beside it. 'every one you have
    // logged' only prints when marked === count.
    sub: (marked: string, count: string, record: string) =>
      `Marked in ${marked} of ${count} games. Record ${record}.`,
    subAll: (count: string, record: string) =>
      `Marked in ${count} of ${count} games: every one you have logged. Record ${record}.`,

    // The record itself. An en dash between the figures, never a hyphen.
    record: (w: string, l: string) => `${w}\u2013${l}`,
    recordWithDraws: (w: string, l: string, d: string) => `${w}\u2013${l}\u2013${d}`,
    recordLong: (record: string, games: string) => `${record} across ${games} games`,
    recordLongOne: (record: string) => `${record} across 1 game`,
  },

  // ── The aggregate panel (§8.2) ────────────────────────────────────────
  buckets: {
    fix: 'Fix',
    // The gloss says what the bucket MEANS, so the heading does not have to be
    // an instruction.
    fixNote: 'marked against you more often than for you',
    keep: 'Keep',
    keepNote: 'marked for you more often than against',
    // §8.2 — shown, always, as one line under a rule. Never a third group.
    mixed: 'Mixed',
    // One clause per mixed axis, and the sentence they are joined into. Split
    // this way so a clause's whole wording lives here, rather than half here and
    // half in whichever component does the joining.
    mixedClause: (axis: string, up: string, down: string) =>
      `${axis}: ${up} up, ${down} down.`,
    mixedLine: (clauses: string) => `${clauses} Cut both ways so far.`,

    // N = 1 only. A true title for a panel that is not a finding.
    oneGameHeading: 'What that one game said',
  },

  // ── The axis cell ─────────────────────────────────────────────────────
  cell: {
    // The figure. ALWAYS carries its denominator. Never a percentage, never a
    // net, never a bare count.
    figure: (marked: string, count: string) => `${marked} of ${count}`,
    // N = 1: a direction and a count, not a ratio. '1 of 1' inside a bucket
    // called Fix reads as certainty.
    figureOneUp: '1 up',
    figureOneDown: '1 down',
    sub: (up: string, down: string) => `${up} up \u00b7 ${down} down`,
    subOneGame: '1 game',
  },

  // ── The form (§8.3) ───────────────────────────────────────────────────
  form: {
    open: 'Log a game',
    heading: 'Log a game',

    resultLabel: 'Result',
    // 'Won' / 'Lost', not 'Win' / 'Loss': the player is reporting, not
    // classifying. Draw has no past tense that reads well.
    won: 'Won',
    lost: 'Lost',
    draw: 'Draw',

    podLabel: 'Pod size',
    podHint: 'players at the table',

    // Defaults to today. The dashed underline is the affordance.
    playedToday: 'played tonight',
    played: (date: string) => `played ${date}`,

    workedLabel: 'What worked',
    hurtLabel: 'What let me down',
    // Absent at zero — a counter reading '0 marked' is a column complaining.
    marked: (n: string) => `${n} marked`,

    // The move, §6 in STATES-log-form.md. Replaces the gloss for one beat.
    movedToHurt: 'moved to what let me down',
    movedToWorked: 'moved to what worked',

    save: 'Save this game',
    saving: 'Saving\u2026',
    cancel: 'Cancel',
    // Says the quiet part out loud: two empty columns otherwise read as a
    // required field whose requirement you cannot see.
    optionalNote: 'marks are optional: a result on its own is a game',
    // Returned by logGame, rendered in the shipped MutationError. Defined here
    // rather than in REJECTION_MESSAGES, which holds the deck-add rejections.
    refused: 'We couldn\u2019t save that game. Nothing has been logged.',
  },

  // ── History ───────────────────────────────────────────────────────────
  history: {
    heading: 'History',
    headingNote: 'newest first',
    // Single letters in the row's square. W takes --success; L and D are
    // NEUTRAL — a list of losses in --danger reads as a list of errors, and
    // this is a diary, not a lint report.
    won: 'W',
    lost: 'L',
    drawn: 'D',
    // Pod size first: it is what changes how a game read. The date locates it.
    meta: (pod: string, date: string) => `${pod}-player \u00b7 ${date}`,
    // A game with no marks is valid (§3). Absence, never an empty gap that
    // reads as a rendering fault.
    noMarks: '\u2014',

    // Spoken only, and never drawn. The note's own line is a bare sentence in
    // quotes, which the eye reads as a note and the ear does not: #10's
    // deck-tuning table puts `note:` inside the row's accessible description,
    // after the marks. Lowercase because it is read mid-description rather
    // than as a heading.
    noteSpoken: 'note:',

    delete: 'Delete this game',
    // One confirm, because §4 has no edit action, so delete-and-relog is the
    // correction path and a stray tap loses the only copy of a game the player
    // will not remember. Since 2026-09-27 it is the deck delete's own pane,
    // floating under the ×, so every delete in the app reads the same (Hugh).
    // The sentence follows the deck's shape: what goes, then what does not.
    confirm: 'Delete this game?',
    confirmBody: 'Its result, its marks and its note go with it. The deck is unchanged.',
    confirmYes: 'Delete game',
    confirmNo: 'Keep it',
    deleting: 'Deleting\u2026',
    deleteRefused: 'We couldn\u2019t delete that game. Nothing has changed.',
  },

  // ── Live region · one message per settle, never one per tick ──────────
  announce: {
    moved: (axis: string, column: string) => `${axis} moved to ${column}`,
    saved: (record: string) => `Game logged. ${record}.`,
    savedFirst: 'Game logged. 1 game on the record.',
    deleted: (record: string) => `Game deleted. ${record}.`,
    deletedLast: 'Game deleted. No games logged.',
  },
} as const;
