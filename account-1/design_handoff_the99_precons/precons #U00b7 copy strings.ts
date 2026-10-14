// Proposed src/lib/copy/precons.ts. Placeholders until /copy-review.
// Rule: ownership is a count ("you own 74 of 85"), never a verdict. Selection copy, if any is added, is select / unselect.

const n = (x: number) => x.toLocaleString("en-US");

export const preconsCopy = {
  door: {
    // /decks head line
    line: "Commander precons",
    lineMeta: (count: number, newest: string) => `${n(count)} decklists · newest ${newest}`,
    // R2: the phone's half-width cell
    linePhone: "Precons",
    lineMetaPhone: (count: number) => `${n(count)} decklists`,
    // R2, proposed for src/lib/copy/all-decks-cart.ts (Hugh to OK): the cart's phone cell
    cartTitlePhone: "Shop all decks",
    cartMetaPhone: (copies: number, total: string) => `${n(copies)} · ${total}`,
    // create picker door
    head: "Start from a precon",
    body: "Any Commander precon, with how many of its cards you already own. It starts as a draft you can change.",
    cta: "Browse precons →",
  },
  createPicker: {
    subDoors: "Pick a commander from your collection, start from a precon, or let us help.",
    subPrecon: "Pick a commander from your collection, or start from a precon.",
  },
  list: {
    title: "Commander precons",
    back: "‹ Decks",
    backNew: "‹ New deck",
    sub: "185 decklists, 2011 to 2026 · the count is the cards you own, basic lands not counted",
    subPhone: "185 decklists · 2011 to 2026 · basic lands not counted",
    search: "Search by name, commander or set",
    sort: { newest: "Newest", owned: "Most owned" },
    result: (shown: number, total: number, order: "newest" | "owned") =>
      shown === total ? `${n(total)} decklists · ${order === "newest" ? "newest first" : "most owned first"}` : `${n(shown)} of ${n(total)} decklists`,
    year: (count: number) => `${n(count)} decklists`,
    moreYear: (count: number, year: string) => `${n(count)} more from ${year}`, // canvas only
  },
  row: {
    ownLead: "you own",
    own: (owned: number, of: number) => `${n(owned)} of ${n(of)}`,
    built: (deck: string, shared: number) => `your deck ${deck} · ${n(shared)} shared`,
    builtTwo: (a: string, b: string, shared: number) => `your decks ${a} and ${b} · ${n(shared)} shared`,
    twin: "also sold as a Collector’s Edition · the same 100 cards",
    unmapped: (count: number) => `${count === 1 ? "1 card" : `${n(count)} cards`} not in our catalog yet`,
    aria: (name: string, owned: number, of: number) => `${name}. You own ${n(owned)} of ${n(of)} of its cards.`,
  },
  empty: {
    body: "Your collection is empty, so every count reads 0. Upload it and each precon shows how many of its cards you own.",
    action: "Upload your collection",
  },
  none: {
    head: (q: string) => `No precon matches “${q}”`,
    body: "The search looks at each precon’s name, its commanders and its set.",
    clear: "Clear the search",
  },
  down: {
    head: "The precons couldn’t be read just now",
    body: "Your decks and your collection aren’t affected. The list is read again when you come back.",
    back: "Back to Decks",
  },
  open: {
    back: "‹ Commander precons",
    eyebrow: "Precon decklist · read-only",
    meta: (ident: string, set: string, setName: string, date: string) => `${ident} · ${set} · ${setName} · ${date}`,
    own: (owned: number, of: number) => `You own ${n(owned)} of ${n(of)} of its cards`,
    basics: (count: number) => `${n(count)} basic lands not counted`,
    built: (deck: string, shared: number) => `Your deck ${deck} has the same commander and ${n(shared)} of its cards.`,
    twin: (twin: string) => `Also sold as ${twin}, with the same 100 cards. One list stands for both.`,
    pair: "2 commanders and 98 cards · 100 in all",
    unmapped: (count: number, listed: number) =>
      `${count === 1 ? "1 card in this precon isn’t" : `${n(count)} cards in this precon aren’t`} in our catalog yet, so ${n(listed)} are listed.`,
    listNote: "By type, A–Z within each group · press a card for its details, hover for its art · each row shows the precon’s printing",
    listNotePhone: "By type · press a card for its details",
    start: "Start a deck from this",
    dock: (name: string, owned: number, of: number) => `${name} · 100 cards · you own ${n(owned)} of ${n(of)}`,
  },
  group: {
    own: (owned: number, of: number) => `you own ${n(owned)} of ${n(of)}`,
    own1: "you own it",
    own0of1: "you own 0 of 1",
    ownBoth: "you own both",
    ownNeither: "you own neither",
    basics: (count: number) => `${n(count)} basics not counted`,
    basicTag: "basic · not counted",
    more: (count: number, label: string) => `${n(count)} more ${label.toLowerCase()} · A–Z`, // canvas only
  },
  start: {
    title: (name: string) => `Start a deck from ${name}`,
    lead: "It starts as a draft with the precon’s 100 cards. Change anything before you commit.",
    beside: (ident: string, body: 99 | 98) => `${ident} · ${body} cards beside ${body === 98 ? "them" : "it"}`,
    nameLabel: "Deck name",
    facts: {
      cards: "Cards", cardsValue: "all 100, as the precon lists them",
      own: "You own", ownValue: (owned: number, of: number) => `${n(owned)} of ${n(of)} · basic lands not counted`,
      printings: "Printings", printingsValue: "picked from the copies you hold",
    },
    already: (deck: string) => `You already have ${deck} with this commander. This makes a second deck.`,
    cancel: "Cancel",
    submit: "Start the deck",
    pending: "Starting…",
    failed: "Couldn’t start the deck. Nothing was saved.",
  },
  arrival: {
    head: (name: string) => `Started from the ${name} precon`,
    body: (owned: number, of: number, toBuy: number) =>
      `All 100 cards are in, as the precon lists them. You own ${n(owned)} of its ${n(of)}; the ${n(toBuy)} you don’t are in Shopping. It’s a draft until you commit it.`,
    bodyAll: "All 100 cards are in, as the precon lists them, and you own every one. It’s a draft until you commit it.",
    meta: (set: string) => `${set} · printings picked from the copies you hold`,
    dismissAria: "Dismiss",
  },
} as const;
