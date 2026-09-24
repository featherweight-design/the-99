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
  },
} as const;
