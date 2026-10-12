// Commander precons (handoff `design/design_handoff_the99_precons/`, R2). Ownership is a count
// ("you own 74 of 85"), never a verdict. Every total is the count the ingest kept, never a literal
// (audit finding 4).

const n = (x: number) => x.toLocaleString("en-US");
const plural = (x: number, one: string, many: string) => `${n(x)} ${x === 1 ? one : many}`;

/** `2026-10-02` as `Oct 2026`. UTC, so the server and the browser draw the same month. */
export const preconMonth = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** `2026-10-02` as `Oct 2, 2026`. */
export const preconDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** What the arrival strip says went in: the whole list, or what the catalog holds of it. */
function cardsIn(cards: number, unmapped: number): string {
  return unmapped === 0
    ? `All ${n(cards)} cards are in, as the precon lists them.`
    : `${n(cards)} cards are in. ${unmapped === 1 ? "1 more from the precon isn’t" : `${n(unmapped)} more from the precon aren’t`} in our catalog yet.`;
}

export const preconsCopy = {
  door: {
    head: "Start from a precon",
    body: "Any Commander precon, with how many of its cards you already own. It starts as a draft you can change.",
    cta: "Browse precons →",
    line: "Commander precons",
    lineMeta: (count: number, newest: string) => `${plural(count, "decklist", "decklists")} · newest ${newest}`,
    linePhone: "Precons",
    lineMetaPhone: (count: number) => plural(count, "decklist", "decklists"),
  },
  list: {
    title: "Commander precons",
    back: "‹ Decks",
    backNew: "‹ New deck",
    sub: (count: number, first: string, last: string) =>
      `${plural(count, "decklist", "decklists")}, ${first} to ${last} · the count is the cards you own, basic lands not counted`,
    subPhone: (count: number, first: string, last: string) =>
      `${plural(count, "decklist", "decklists")} · ${first} to ${last} · basic lands not counted`,
    search: "Search by name, commander or set",
    sortHeading: "Sort",
    sort: { newest: "Newest", owned: "Most owned" },
    sortTrigger: (label: string) => `Sort · ${label.toLowerCase()}`,
    result: (shown: number, total: number, order: "newest" | "owned") =>
      shown === total
        ? `${plural(total, "decklist", "decklists")} · ${order === "newest" ? "newest first" : "most owned first"}`
        : `${n(shown)} of ${plural(total, "decklist", "decklists")}`,
    year: (count: number) => plural(count, "decklist", "decklists"),
  },
  row: {
    ownLead: "you own",
    colorless: "Colorless",
    own: (owned: number, of: number) => `${n(owned)} of ${n(of)}`,
    built: "your deck",
    builtTwo: "your decks",
    builtAnd: " and ",
    builtShared: (shared: number) => ` · ${n(shared)} shared`,
    twin: "also sold as a Collector’s Edition · same list",
    unmapped: (count: number) => `${plural(count, "card", "cards")} not in our catalog yet`,
    aria: (name: string, owned: number, of: number) => `${name}. You own ${n(owned)} of ${n(of)} of its cards.`,
  },
  open: {
    back: "‹ Commander precons",
    backNew: "‹ New deck",
    eyebrow: "Precon decklist · read-only",
    meta: (ident: string, set: string, setName: string | null, date: string) =>
      [ident, set, setName, date].filter(Boolean).join(" · "),
    ownLead: "You own",
    own: (owned: number, of: number) => `${n(owned)} of ${n(of)}`,
    ownTail: "of its cards",
    basics: (count: number) => `${plural(count, "basic land", "basic lands")} not counted`,
    builtSame: (deck: string, shared: number, pair: boolean) =>
      `Your deck ${deck} has the same ${pair ? "commanders" : "commander"} and ${n(shared)} of its cards.`,
    builtAny: (deck: string, shared: number) => `Your deck ${deck} shares ${n(shared)} of its cards.`,
    twin: (twin: string) => `Also sold as ${twin}, with the same list.`,
    pair: (body: number, total: number) => `2 commanders and ${n(body)} cards · ${n(total)} in all`,
    unmapped: (count: number, listed: number) =>
      `${count === 1 ? "1 card in this precon isn’t" : `${n(count)} cards in this precon aren’t`} in our catalog yet, so ${n(listed)} are listed.`,
    listNote: "By type, A–Z within each group · press a card for its details, hover for its art · each row shows the precon’s printing",
    listNotePhone: "By type · press a card for its details",
  },
  group: {
    commander: "Commander",
    commanders: "Commanders",
    own: (owned: number, of: number) => `you own ${n(owned)} of ${n(of)}`,
    own1: "you own it",
    own0of1: "you own 0 of 1",
    ownBoth: "you own both",
    ownNeither: "you own neither",
    basics: (count: number) => `${plural(count, "basic", "basics")} not counted`,
    basicTag: "basic · not counted",
  },
  start: {
    button: "Start a deck from this",
    dock: (name: string, cards: number, owned: number, of: number) =>
      `${name} · ${n(cards)} cards · you own ${n(owned)} of ${n(of)}`,
    title: (name: string) => `Start a deck from ${name}`,
    lead: (cards: number, unmapped: number) =>
      unmapped === 0
        ? `It starts as a draft with the precon’s ${n(cards)} cards. Change anything before you commit.`
        : `It starts as a draft with the ${n(cards)} cards we have of the precon’s list. Change anything before you commit.`,
    beside: (ident: string, body: number, pair: boolean) => `${ident} · ${n(body)} cards beside ${pair ? "them" : "it"}`,
    nameLabel: "Deck name",
    facts: {
      cards: "Cards",
      cardsValue: (cards: number, unmapped: number) =>
        unmapped === 0
          ? `all ${n(cards)}, as the precon lists them`
          : `${n(cards)}; ${unmapped === 1 ? "1 isn’t" : `${n(unmapped)} aren’t`} in our catalog yet`,
      own: "You own",
      ownValue: (owned: number, of: number) => `${n(owned)} of ${n(of)} · basic lands not counted`,
      printings: "Printings",
      printingsValue: "picked from the copies you hold",
    },
    illegal: (names: string[]) =>
      `${names.length === 1 ? "1 card isn’t" : `${n(names.length)} cards aren’t`} legal in Commander: ${names.join(", ")}. ${names.length === 1 ? "It stays" : "They stay"} in, so the deck matches the box.`,
    already: (deck: string) => `You already have ${deck} with this commander. This makes a second deck.`,
    cancel: "Cancel",
    submit: "Start the deck",
    pending: "Starting…",
    failed: "Couldn’t start the deck. Nothing was saved.",
    nameInvalid: (max: number) => `Name must be 1–${max} characters, with no control characters.`,
  },
  arrival: {
    head: (name: string) => `Started from the ${name} precon`,
    body: (cards: number, unmapped: number, owned: number, of: number, toBuy: number) =>
      `${cardsIn(cards, unmapped)} You own ${n(owned)} of its ${n(of)}, and the ${n(toBuy)} you don’t are in Shopping. It’s a draft until you commit it.`,
    bodyAll: (cards: number, unmapped: number) =>
      `${cardsIn(cards, unmapped)} You own every one. It’s a draft until you commit it.`,
    meta: (set: string) => `${set} · printings picked from the copies you hold`,
  },
  // R3 addendum: the built-from link (`precons-link · copy strings.ts`, placeholders until
  // /copy-review). No verdict word on any share; selection says select / unselect. Every card count
  // is the precon's own, never a literal 100 (audit finding 6).
  link: {
    suggestion: {
      lead: (precon: string) => `Looks like this started as ${precon}.`,
      leadOtherCommander: (precon: string) => `Looks like this started as ${precon}, with a different commander.`,
      metaSame: (shared: number, of: number) => `${n(shared)} of its ${n(of)} cards are in this deck · same commander`,
      metaOther: (shared: number, of: number, commander: string) =>
        `${n(shared)} of its ${n(of)} cards are in this deck · led by ${commander}`,
      leadTwo: "Looks like this started as one of two precons",
      metaTwo: "link the one it came from",
      rowMeta: (set: string, released: string, commanderClause: string, shared: number, of: number) =>
        `${set} · ${released} · ${commanderClause} · ${n(shared)} of its ${n(of)} cards are in this deck`,
      sameClause: "same commander",
      ledBy: (commander: string) => `led by ${commander}`,
      link: "Link it",
      linkOne: "Link",
      dismissAria: (precon: string) => `Dismiss the suggestion that this started as ${precon}`,
      dismissAriaTwo: (a: string, b: string) => `Dismiss the suggestion that this started as ${a} or ${b}`,
    },
    versionsRow: {
      head: "Built from a precon?",
      body: "Link it, and this history starts from the box as v0. Your cards don’t change.",
      cta: "Link a precon",
    },
    confirm: {
      title: (deck: string, precon: string) => `Link ${deck} to ${precon}`,
      lead: "Its history gains a v0, the precon’s list, before v1. Nothing in the deck changes.",
      factLabels: { v0: "v0", shared: "Shared", v1: "v1" },
      facts: {
        v0: (precon: string, cards: number) => `${precon} · ${n(cards)} cards · before v1`,
        shared: (shared: number, of: number) => `${n(shared)} of its ${n(of)}`,
        v1: "now diffs against v0",
      },
      cancel: "Cancel",
      submit: "Link",
      pending: "Linking…",
      failed: "That didn’t link. Try again.",
    },
    pickPrecon: {
      title: (deck: string) => `Which precon was ${deck} built from?`,
      lead: "Link the precon you started from, and its list becomes v0, before v1.",
      search: "Search by name, commander or set",
      label: "Shares the most with this deck",
      fig: (shared: number, of: number) => `${n(shared)} of ${n(of)}`,
      figSub: "in this deck",
      sameClause: "same commander",
      foot: "Linking adds v0 before v1. Your cards don’t change.",
      footNone: "Select a precon to link.",
      none: "No precon shares a card with this deck.",
      submit: (precon: string) => `Link ${precon}`,
      selectAria: (name: string) => `Select ${name}`,
      unselectAria: (name: string) => `Unselect ${name}`,
    },
  },
  empty: {
    body: "Every count reads 0 until your collection is in.",
    action: "Upload your collection",
  },
  none: {
    head: (q: string) => `No precon matches “${q}”`,
    headColours: "No precon matches those colors",
    body: "The search looks at each precon’s name, its commanders and its set.",
    clear: "Clear the search",
    clearColours: "Clear the colors",
  },
  down: {
    head: "The precons couldn’t be read just now",
    body: "Your decks and your collection aren’t affected. The list is read again when you come back.",
    back: "Back to Decks",
  },
} as const;
