// Settings (menu and Home handoff, `Settings.dc.html`; plan `2026-10-22-menu-home.md` PR 3). Strings passed
// /copy-review. The Notifications section's strings arrive with PR 4.

import type { FilterPanelCopy } from "./collection";

export const settingsCopy = {
  title: "Settings",
  sub: "Saved as you change them",
  spares: {
    /** The mono section head, drawn uppercase by CSS. */
    head: "Spares",
    explain: "A spare is a copy no deck of yours is asking for, committed or draft.",
    /** The threshold sentence, around the stepper: `Offer a card only when I have [2] or more spare copies.` */
    before: "Offer a card only when I have",
    after: "or more spare copies.",
    /** The pointer under the threshold sentence: the same number decides what the reader can offer from a friend's wishlist. */
    alsoOffer: "This also decides which cards you can offer from a friend’s wishlist.",
    stepperLabel: "Spare copies a card needs before it is offered",
    fewer: "Fewer",
    more: "More",
    /** `Offered to {pods}.` with the pod names bold, joined as a list. */
    offeredTo: "Offered to",
    offeredNone: "Not offered to any pod yet.",
    choose: "You choose on each pod.",
    friends: "Friends",
    friendsAria: "Choose who sees your spares, on each pod in Friends",
    keptHead: (spareCount: number) => (spareCount > 0 ? `Kept back · ${spareCount}` : "Kept back"),
    keptExplain: "Never offered, however many spares you have.",
    search: "Keep a card back…",
    searchLabel: "Keep a card back: search your spare cards",
    noMatch: "None of your spare cards match.",
    hitSpare: (spareCount: number) => `${spareCount} spare`,
    keepAria: (name: string, spareCount: number) => `Keep ${name} back, ${spareCount} spare`,
    releaseAria: (name: string) => `Let ${name} go back to your spares`,
    failed: "We couldn’t save that. Try again.", // toast, role alert
  },
  // Your decks (friend decks handoff, README 4b): what friends see on the reader's Decks tab. Passed
  // /copy-review.
  decks: {
    head: "Your decks",
    explain: "What friends see on your Decks tab.",
    see: { name: "Friends can see my decks", line: "Each deck’s name, commander and whole list, read-only." },
    unfinished: { name: "Include drafts and decks I’m building", line: "Off: a deck shows once its list is full and committed." },
    foot: "To keep one deck to yourself, tick Hidden from friends in its ⋯ menu.",
    failed: "We couldn’t save that. Try again.", // toast, role alert
  },
  // Cart on your wishlist (call 1): after Spares. The switch, the From row's deck picker (`wishlistDecksPanelCopy`) and the foot.
  wishlist: {
    head: "Wishlist",
    explain: "Friends see your wishlist, and their spares are matched against it.",
    sync: {
      name: "Keep my shopping on my wishlist",
      line: "Cards in Shopping for all decks go on your wishlist and follow your decks. Each leaves once you have it.",
    },
    from: "From",
    foot: "A new deck joins by itself. You can also leave a deck out from its ⋯ menu. Cards you add yourself never change here.",
    failed: "We couldn’t save that. Try again.", // toast, role alert
  },
} as const;

const decksWord = (n: number) => (n === 1 ? "1 deck" : `${n} decks`);
const cardsWord = (n: number) => (n === 1 ? "1 card" : `${n} cards`);

/** Settings › Wishlist's From row: the shipped `FilterPanel` over the reader's decks, each ticked deck on the wishlist. */
export const wishlistDecksPanelCopy: FilterPanelCopy = {
  triggerLabel: "Decks",
  triggerCount: decksWord,
  triggerAriaCollapsed: "Choose the decks your shopping comes from",
  triggerAriaWithSelection: (n: number) => `Shopping from ${decksWord(n)}, choose decks`,
  panelAriaLabel: "Decks your shopping comes from",
  sheetTitle: "Shopping from",
  searchPlaceholder: "Search your decks",
  searchAriaLabel: "Search your decks",
  clearSearch: "Clear search",
  groupDefault: "Your decks",
  groupSelected: (n: number) => `On your wishlist · ${n}`,
  groupMatches: (n: number) => `Matches · ${n}`,
  optionAria: (name: string, count: number) => (count === 0 ? `${name}, nothing to buy` : `${name}, ${cardsWord(count)} to buy`),
  optionAriaUnavailable: (name: string) => `${name}, nothing to buy`,
  footerTotal: decksWord,
  footerSelected: (n: number, total: number) => `${n} of ${decksWord(total)}`,
  clear: "Clear",
  done: "Done",
  closeLabel: "Close",
  emptyTitle: "No deck matches",
  emptyBody: (query: string) => ({ before: "No deck is called ", query, after: "." }),
  announceMatches: (n: number, query: string) => `${n === 1 ? "1 deck matches" : `${n} decks match`} ${query}`,
  announceAdded: (name: string) => `${name} added`,
  announceRemoved: (name: string) => `${name} left out`,
  announceCleared: () => "Every deck left out",
};
