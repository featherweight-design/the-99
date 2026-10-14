// Additions to src/lib/copy/notices.ts for the tile's marker. Queued for /copy-review.
// Unchanged and reused: tag.spoken.unread / tag.spoken.notLegal (the tile link's name).

const notices = (n: number) => (n === 1 ? "1 notice" : `${n} notices`);
const cards = (n: number) => (n === 1 ? "1 card" : `${n} cards`);

export const tileMarkerCopy = {
  /** FactTooltip `sentence`, desktop only. */
  tooltip: {
    notLegal: (n: number) => `${cards(n)} not legal in this deck. Open the deck to see which.`,
    unread: (n: number) => `${notices(n)} since this deck was analyzed. Open the deck to read them.`,
    both: (legal: number, data: number) =>
      `${cards(legal)} not legal in this deck, and ${notices(data)} since it was analyzed. Open the deck to see them.`,
  },
  /** MarkKey entries on /decks; each drawn only when a shown tile draws that mark. */
  key: {
    regionAria: "Deck marks",
    notLegal: "not legal in this deck",
    unread: "notices since analyzed",
  },
  /** The link's name when both kinds stand: `${spoken.notLegal(n)}, ${spoken.unread(m)}`. No new string. */
} as const;
