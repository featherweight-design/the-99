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

import { deckDescriptionCopy } from "./deck-description";
import { deckTuningGamesCopy } from "./deck-tuning-games";

export const deckTuningCopy = {
  // `intent` (what this deck is for) is RETIRED whole, replaced by `deckDescriptionCopy.description`
  // (H35, DESCRIPTION-where-it-lives.md): the ask, the seeded chip and its sentences are gone
  // with the old door. See `deck-description.ts`.

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
      `${gamesWord} games in, and ${axis} has been marked against you in ${marked} of ${games}. We will read everything below and suggest up to five cards to add and five to cut, each with its own reason.`,
    noGamesLead:
      "No games logged yet, so we will read this list, the recommended mix and what you own, and suggest up to five cards to add and five to cut. Log a game and suggestions can also cite how the deck played.",
    unmarkedLead: (gamesWord: string) =>
      `${gamesWord} games logged, and none is marked for what worked or hurt. We will read the results, your game notes, this list and what you own, and suggest up to five cards to add and five to cut. Mark what decided a game and suggestions can point at it.`,
    loadingHeading: "Shuffling through your deck\u2026",
    loadingLead:
      "Reading your deck. This takes a few seconds, and the list below stays on screen when the suggestions arrive.",
    reading: "Reading\u2026",
    resultsLead: (nWord: string) =>
      `${nWord} swaps, each a card out and a card in. Nothing moves until you apply one.`,
    // Eng-written: the singular the canvas does not draw.
    resultsLeadOne: "One swap, a card out and a card in. Nothing moves until you apply it.",
    // Replaces `resultsLead` when the checks dropped some: the count is never padded back.
    fewerLead: (nWord: string, droppedWord: string) =>
      `${nWord} swaps this time. ${droppedWord} more didn’t hold up to checking.`,
    fewerLeadOne: (droppedWord: string) =>
      `One swap this time. ${droppedWord} more didn’t hold up to checking.`,
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
      `Nothing has changed since ${when}: no new game, no edit to the list or to what this deck is for, so asking again would only repeat these.`,
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
    // Visually hidden after each row's label (manifest-affordance addendum): the mark is drawn
    // aria-hidden, so these say what the dot and the ✓ show.
    rowRead: "read",
    rowUnread: "not read yet",
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
      body: "It isn’t something you did, and it’s usually back within a few minutes.",
      kept: "Your games, your notes and your list are untouched. Nothing was changed and no credit was used.",
      note: "or come back later: the button will be here",
    },
    timeout: {
      tag: "timed out",
      heading: "This one took too long",
      body: "We stopped it before it came back. A long list and a full game log are a lot to read, and now and then it doesn’t finish.",
      kept: "Nothing was applied and no credit was used.",
      note: "trying again usually works",
    },
    malformed: {
      tag: "unusable answer",
      heading: "We couldn\u2019t use that answer",
      body: "We won’t show you a guess at what it meant.",
      kept: "Your games, your notes and your list are untouched, nothing was applied, and no credit was used.",
      note: "this one is on us",
    },
    ungrounded: {
      tag: "nothing held up",
      heading: "None of the swaps held up",
      body: "Each failed a check: a card outside the deck\u2019s colors, a cut the deck doesn’t hold, or a reason with nothing countable behind it. We would rather show you none than one we can’t back.",
      kept: "Nothing was applied, your list is untouched, and no credit was used.",
      note: "log another game and there is more to go on",
    },
    interrupted: {
      tag: "interrupted",
      heading: "That one didn’t finish",
      body: "Nothing you did caused it.",
      kept: "Nothing was applied and no credit was used.",
      note: "",
    },
  },

  // ── The two lists (sub-project 8; Design's B10, tuning-hub copy strings `lists`/`tally`) ──
  // Suggested changes answers in cards to ADD and cards to CUT, each with its own reason. The
  // swap card below stays for a set generated before the lists, which still holds pairs.
  lists: {
    additions: "Additions",
    cuts: "Cuts",
    count: (into: number, out: number) => `${into} in, ${out} out`,
    tally: (into: number, out: number, total: number, now: number) =>
      `+${into} in \u00b7 \u2212${out} out \u00b7 ${total === now ? `stays at ${total}` : `the deck goes to ${total}`}`,
    applyAll: "Apply all",
    applyRest: "Apply the rest",
    applying: "Applying\u2026",
    add: "Add",
    cut: "Cut",
    working: "Working\u2026",
    reject: "Reject",
    added: "added",
    cutDone: "cut",
    rejected: "rejected",
    undo: "Undo",
    showAgain: "Show it again",
    noLongerApplies: "no longer applies",
    addAlreadyIn: (name: string) => `${name} is already in the deck, so it can’t be added.`,
    cutGone: (name: string) => `${name} has left the deck, so it can’t be cut.`,
    emptyAdditions: "No additions this time.",
    emptyCuts: "No cuts this time.",
    open: (name: string) => `Open ${name}`,
    resultsLead: "Cards to add and cards to cut, each with its own reason. Nothing moves until you answer one.",
    fewerLead: (droppedWord: string) =>
      `${droppedWord} more didn’t hold up to checking. Nothing moves until you answer one.`,
    allDoneLead: (applied: number, rejected: number) =>
      `All answered: ${applied} applied, ${rejected} rejected. Suggest again for a new set, read from the deck as it is now.`,
    tallyOf: (applied: number, total: number, rejected: number) =>
      rejected > 0 ? `${applied} of ${total} applied \u00b7 ${rejected} rejected` : `${applied} of ${total} applied`,
    applyRefused: "We couldn\u2019t make that change. The deck is unchanged.",
    undoRefused: "We couldn\u2019t undo that change. The deck is unchanged.",
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
    cutGone: (name: string) => `${name} has left the deck, so this swap can’t be applied.`,
    // Eng-written: the add's half of the rule, undrawn.
    addAlreadyIn: (name: string) => `${name} is already in the deck, so this swap can’t be applied.`,
    // The bracket flag. Compare the LOWEST bracket each set permits (READINESS-r3-audit.md, note
    // 1): higher raises, lower lowers, and an equal lowest with a different set changes. The
    // third is eng-written.
    bracketRaises: "Applying it raises the deck\u2019s bracket to",
    bracketLowers: "Applying it lowers the deck\u2019s bracket to",
    bracketChanges: "Applying it changes the deck\u2019s bracket to",
    // Citation chips: source · value. The source is the evidence kind, named for a reader.
    cite: { games: "games", note: "note", decklist: "list", intent: "you said", mix: "mix", notes: deckDescriptionCopy.notes.cite },
    open: (name: string) => `Open ${name}`,
    swap: (cut: string, add: string) => `Swap ${cut} for ${add}`,
    applyRefused: "We couldn\u2019t make that swap. The deck is unchanged.",
    undoRefused: "We couldn\u2019t undo that swap. The deck is unchanged.",
    verdictRefused: "We couldn’t save that. The suggestion is unchanged.",
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
    quotedNote: "A quoted note must be byte-identical to the note's text as shown in its own data block, in quotation marks, with its date.",
    colourIdentity: "An added card must be legal in the commander\u2019s colour identity.",
    cutInDeck: "A cut card must currently be in the deck.",
    oneCard: "Every suggestion is one card, to add or to cut, with its own rationale and its own citations.",
    ownershipNotRanking: "Ownership and price may not affect which cards are suggested or their order.",
    noBracketClaim: "No rationale or citation may name a bracket. The app says when a change moves one.",
    noResultClaim: "No rationale or citation may promise a result: not that a change will win, lose, or make the deck stronger.",
  },

  // ── The live region, and the reason beside a refused press ─────────────
  // Only the keys something reads today; the rest arrive with the panel.
  announce: {
    started: "Reading your deck",
    unchanged: "No new suggestions. Nothing has changed since the last run.",
    ready: (n: number) => (n === 1 ? "One suggested swap is ready." : `${n} suggested swaps are ready.`),
    // The two lists (sub-project 8): a run answers in cards to add and cards to cut.
    readyLists: (into: number, out: number) => `${into} to add and ${out} to cut are ready.`,
    addedCard: (name: string) => `Added. ${name} is in the deck.`,
    cutCard: (name: string) => `Cut. ${name} is out of the deck.`,
    undoneAdd: (name: string) => `Put back. ${name} is out of the deck again.`,
    undoneCut: (name: string) => `Put back. ${name} is in the deck again.`,
    applied: (cut: string, add: string) => `Applied. ${add} is in the deck and ${cut} is out.`,
    undone: (cut: string) => `Put back. ${cut} is in the deck again.`,
    rejected: "Rejected.",
    restored: "Shown again.",
  },

  // ── The shared model allowance, spent: the refusal a press gets ────────
  // The panel draws `creditsCopy.spent` with the time; this is what a stale tab or a replayed
  // request is told, where there is no clock of the reader's to name a time in. PLACEHOLDER,
  // owed to /copy-review.
  allowance: {
    spent: "No credits left. The next one comes back within a day.",
  },

  // The game note and the Games tab's pointer live in `deck-tuning-games.ts`, which the game log and the
  // description fields import without this module.
  ...deckTuningGamesCopy,
} as const;
