// Deck notices — copy (sub-project 9).
//
// Transcribed from the handoff's `deck-notices · copy strings.ts` (design/design_handoff_the99_deck_notices),
// and queued for /copy-review with it. Only the TAG's strings live here so far: the sheet's and the
// overview check's arrive with the PRs that first draw them, so no key ships without a caller.
//
// One split the handoff does not draw: its `tag.aria` strings end `Open notices`, which is the deck
// header's button. The tile's notice is presentation inside a link that opens the DECK, so the
// tile's accessible name carries `spoken`, the sentence without the press. The header adds `aria`
// beside these when it draws the button.

const notices = (n: number) => (n === 1 ? "1 notice" : `${n} notices`);
const cards = (n: number) => (n === 1 ? "1 card" : `${n} cards`);

export const deckNoticesCopy = {
  tag: {
    notLegal: "Not legal",
    spoken: {
      unread: (n: number) => `${notices(n)} since this deck was analyzed`,
      notLegal: (n: number) => `${cards(n)} not legal in this deck`,
    },
    /** The header's full face (`● 3 notices`). The tile draws one `!` mark instead (the tile marker addendum). */
    count: notices,
    aria: {
      unread: (n: number) => `${notices(n)} since this deck was analyzed. Open notices`,
      read: (n: number) => `${notices(n)}, read. Open notices`,
      notLegal: (n: number) => `${cards(n)} not legal in this deck. Open notices`,
    },
  },
  /**
   * The /decks tile's `!` mark (tile marker addendum, #953). Queued for /copy-review. The mark is
   * aria-hidden: the tile link's name says it with `tag.spoken`, both parts when both stand.
   */
  mark: {
    /** FactTooltip `sentence`, desktop only. */
    tooltip: {
      notLegal: (n: number) => `${cards(n)} not legal in this deck. Open the deck to see which.`,
      unread: (n: number) => `${notices(n)} since this deck was analyzed. Open the deck to read them.`,
      both: (legal: number, data: number) =>
        `${cards(legal)} not legal in this deck, and ${notices(data)} since it was analyzed. Open the deck to see them.`,
    },
    /** The /decks key; each entry drawn only when a shown tile draws that mark. */
    key: {
      regionAria: "Deck marks",
      notLegal: "not legal in this deck",
      unread: "notices since analyzed",
    },
  },
  sheet: {
    title: "Notices",
    since: (date: string) => `since analyzed ${date}`,
    closeAria: "Close notices",
    groups: {
      notLegal: "Not legal in Commander",
      outsideColors: "Outside the commander’s colors",
      // gameChangers, twoCardCombos, massLandDenial, extraTurns: deckAnalysisCopy.findings.labels
      rules: "Bracket rules",
    },
    dir: { added: "added", removed: "removed", moved: "moved" },
    combo: (result: string) => `Spellbook: ${result}.`,
    legal: {
      notLegal: "Not legal in Commander.",
      outside: (colors: string, commander: string, identity: string) =>
        `${colors}, outside ${commander}’s colors (${identity}).`,
      foot: "These stay until the cards leave the deck. Reading them does not clear them.",
    },
    foot: {
      holds: "Your bracket holds until you re-analyze. Nothing here moves it on its own.",
      dirty:
        "Your bracket holds until you re-analyze. Your own edits are waiting too: the Re-analyze on the Analysis tab reads both.",
      toTab: "Analysis tab",
      /** Undrawn in the handoff: the foot's own press failing. Queued for /copy-review. */
      failed: "We couldn’t re-analyze. Your bracket holds as it was.",
    },
  },
  /** The check before the overview (HANDOFF §6, plan D10): a new overview is withheld while any
   *  legality entry stands. `warning` is the one line no frame draws (Q4): built from `withheld`'s
   *  form over a SAVED overview (H3), and its wording goes to /copy-review with the PR's shots. */
  check: {
    note: "Reads the bracket only. The overview waits until every card is legal in this deck.",
    seeWhich: "See which",
    withheld: "No overview while this deck holds cards that aren’t legal in it.",
    warning: "This deck holds cards that aren’t legal in it right now. This overview was written before; a new one waits until every card is legal.",
  },
} as const;
