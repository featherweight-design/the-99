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

/** A moment (an ISO timestamp) as the reader's own day, `Oct 13, 2026`: when they added a precon to their collection. */
export const preconAddedDate = (isoTimestamp: string) =>
  new Date(isoTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** The catalog gap the arrival band still owes: a leading space and a sentence, or nothing when every card mapped. */
function catalogGap(unmapped: number): string {
  return unmapped === 0 ? "" : ` ${unmapped === 1 ? "1 card isn’t" : `${n(unmapped)} cards aren’t`} in our catalog yet.`;
}

export const preconsCopy = {
  door: {
    head: "Start from a precon",
    body: "Any Commander precon, with how many of its cards you already own.",
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
  // R4: the list in tiles (`precons-tiles · copy strings.ts`). The caption's lead, figure and
  // unmapped line are the row's own (`row.ownLead`, `row.own`, `row.unmapped`).
  tile: {
    meta: (setCode: string, month: string) => `${setCode} · ${month}`,
    footShared: (shared: number) => `${n(shared)} shared`,
    footBuilt: (shared: number) => `built from this · ${n(shared)} shared`,
    footTwin: "also sold as a Collector’s Edition",
    noArt: "no art on file",
    // The link's accessible name: the caption is clipped, and the commander is on the art only.
    aria: (name: string, commanders: string[], owned: number, of: number) =>
      `${name}, with ${commanders.join(" and ")}. You own ${n(owned)} of ${n(of)} of its cards.`,
  },
  open: {
    // The edition switch, shown only for a precon whose set also printed a Collector's Edition.
    edition: {
      aria: "Edition",
      regular: "Regular",
      collector: "Collector’s Edition",
      collectorNote: "Every card in the Collector’s Edition is foil.",
      /** Beside a read-only row's `SET number` when its printing is foil. */
      foil: "foil",
    },
    back: "‹ Commander precons",
    backNew: "‹ New deck",
    eyebrow: "Precon decklist · read-only",
    meta: (ident: string, set: string, setName: string | null, date: string) =>
      [ident, set, setName, date].filter(Boolean).join(" · "),
    ownLead: "You own",
    own: (owned: number, of: number) => `${n(owned)} of ${n(of)}`,
    ownTail: "of its cards",
    builtSame: (deck: string, shared: number, pair: boolean) =>
      `Your deck ${deck} has the same ${pair ? "commanders" : "commander"} and ${n(shared)} of its cards.`,
    builtAny: (deck: string, shared: number) => `Your deck ${deck} shares ${n(shared)} of its cards.`,
    twin: (twin: string) => `Also sold as ${twin}, with the same list.`,
    pair: (body: number, total: number) => `2 commanders and ${n(body)} cards · ${n(total)} in all`,
    unmapped: (count: number, listed: number) =>
      `${count === 1 ? "1 card in this precon isn’t" : `${n(count)} cards in this precon aren’t`} in our catalog yet, so ${n(listed)} are listed.`,
    listNote: "By type, A–Z within each group · press a card for its details, hover for its art · each row shows the precon’s printing",
    listNotePhone: "By type · press a card for its details",
    // R4 §6, Card view. The phone note is the list's own (`listNotePhone`).
    listNoteCard: "By type, A–Z within each group · press a card for its details · each card shows the precon’s printing",
    // The read-only tile has no buy tag to carry it, and a lone dot is too quiet at tile density.
    tileNotOwned: "not owned",
    /** A basic's sub-line when the precon holds it in more than one art (at one, the printing). */
    basicArts: (setCode: string, arts: number) => `${setCode} · first of ${n(arts)} arts`,
    basicCount: (copies: number) => `×${n(copies)}`,
    /** Spoken with a card tile's name when the precon lists more than one copy. */
    copiesAria: (copies: number) => `${n(copies)} copies in this precon`,
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
    button: "Start with this precon",
    dock: (name: string, cards: number, owned: number, of: number) =>
      `${name} · ${n(cards)} cards · you own ${n(owned)} of ${n(of)}`,
    title: (name: string) => `Start a deck from ${name}`,
    beside: (ident: string, body: number, pair: boolean) => `${ident} · ${n(body)} cards beside ${pair ? "them" : "it"}`,
    nameLabel: "Deck name",
    facts: {
      cards: "Cards",
      cardsValue: (cards: number, unmapped: number) =>
        unmapped === 0
          ? `all ${n(cards)}`
          : `${n(cards)}; ${unmapped === 1 ? "1 isn’t" : `${n(unmapped)} aren’t`} in our catalog yet`,
      own: "You own",
      ownValue: (owned: number, of: number) => `${n(owned)} of ${n(of)} · basic lands not counted`,
      printings: "Printings",
      printingsValue: "this precon’s copies",
    },
    /** "I own this precon" (copy-reviewed 2026-10-13): the opt-in to add the precon's cards and tokens first. */
    owned: {
      label: "I own this precon. Add its cards and tokens to my collection.",
      addedOn: (date: string) => `You added this precon on ${date}`,
      addFailed: "We couldn’t add those. Your collection is unchanged.",
      /** The add threw, so it may have committed with its response lost: no claim of a rollback. */
      addUnsure: "Couldn’t confirm the cards were added. Try again and they won’t be added twice.",
    },
    illegal: (names: string[]) =>
      `${names.length === 1 ? "1 card isn’t" : `${n(names.length)} cards aren’t`} legal in Commander: ${names.join(", ")}. ${names.length === 1 ? "It stays" : "They stay"} in, so the deck matches the box.`,
    already: (deck: string) => `You already have ${deck} with this commander. This makes a second deck.`,
    cancel: "Cancel",
    submit: "Start the deck",
    pending: "Starting…",
    failed: "We couldn’t confirm that deck was started. Check your decks before you try again.",
    nameInvalid: (max: number) => `Name must be 1–${max} characters, with no control characters.`,
  },
  arrival: {
    head: (name: string) => `Started from the ${name} precon`,
    /** The start also added the precon to the collection (copy-reviewed 2026-10-14). */
    added: (cards: number, unmapped: number) =>
      unmapped === 0
        ? `All ${n(cards)} cards added to your collection.`
        : `${n(cards)} cards added to your collection.${catalogGap(unmapped)}`,
    history: "History",
    body: (unmapped: number, owned: number, of: number, toBuy: number) =>
      `You own ${n(owned)} of its ${n(of)}. The ${n(toBuy)} you don’t are in Shopping.${catalogGap(unmapped)}`,
    bodyAll: (unmapped: number) => `You own every card.${catalogGap(unmapped)}`,
    meta: (set: string) => `${set} · printings: this precon’s copies`,
  },
  // R3 addendum: the built-from link (`precons-link · copy strings.ts`, placeholders until
  // /copy-review). No verdict word on any share; selection says select / unselect. Every card count
  // is the precon's own, never a literal 100 (audit finding 6).
  link: {
    suggestion: {
      lead: (precon: string) => `Looks like this started as ${precon}.`,
      leadOtherCommander: (precon: string) => `Looks like this started as ${precon}, with a different commander.`,
      metaSame: (shared: number, of: number, pair: boolean) =>
        `${n(shared)} of its ${n(of)} cards are in this deck · same ${pair ? "commanders" : "commander"}`,
      metaOther: (shared: number, of: number, commander: string) =>
        `${n(shared)} of its ${n(of)} cards are in this deck · led by ${commander}`,
      leadTwo: "Looks like this started as one of two precons",
      metaTwo: "link the one it came from",
      rowMeta: (set: string, released: string, commanderClause: string, shared: number, of: number) =>
        `${set} · ${released} · ${commanderClause} · ${n(shared)} of its ${n(of)} cards are in this deck`,
      sameClause: (pair: boolean) => (pair ? "same commanders" : "same commander"),
      ledBy: (commander: string) => `led by ${commander}`,
      link: "Link it",
      linkOne: "Link",
      // Two rows each carry a `Link`: the spoken name says which precon it links.
      linkOneAria: (precon: string) => `Link ${precon}`,
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
        v1: "now compared with v0",
      },
      cancel: "Cancel",
      submit: "Link",
      pending: "Linking…",
      failed: "We couldn’t confirm that linked. Reload to see where the deck stands.",
    },
    pickPrecon: {
      title: (deck: string) => `Which precon was ${deck} built from?`,
      lead: "Link the precon you started from, and its list becomes v0, before v1.",
      search: "Search by name, commander or set",
      label: "Shares the most with this deck",
      fig: (shared: number, of: number) => `${n(shared)} of ${n(of)}`,
      figSub: "in this deck",
      sameClause: (pair: boolean) => (pair ? "same commanders" : "same commander"),
      foot: "Linking adds v0 before v1. Your cards don’t change.",
      footNone: "Select a precon to link.",
      none: "No precon shares a card with this deck.",
      submit: (precon: string) => `Link ${precon}`,
      selectAria: (name: string) => `Select ${name}`,
      unselectAria: (name: string) => `Unselect ${name}`,
    },
    pickDeck: {
      entry: "Link a deck",
      title: (precon: string) => `Link a deck to ${precon}`,
      lead: "Pick the deck you built from this precon. Its list becomes that deck’s v0.",
      search: "Search your decks",
      label: "Your decks, most shared first",
      fig: (shared: number, of: number) => `${n(shared)} of ${n(of)}`,
      figSub: "shared",
      sameClause: (pair: boolean) => (pair ? "same commanders" : "same commander"),
      linkedElsewhere: (precon: string) => `built from ${precon} · linking moves it here`,
      foot: "Linking adds v0 before v1. Its cards don’t change.",
      footNone: "Select a deck to link.",
      none: "You have no other deck to link.",
      noMatch: (q: string) => `No deck matches “${q}”`,
      submit: (deck: string) => `Link ${deck}`,
    },
    linked: {
      preconSentence: (deck: string, kept: number, of: number) =>
        `Your deck ${deck} was built from this. ${n(kept)} of its ${n(of)} cards are still in it.`,
      rowClause: " · built from this",
      dock: (precon: string, deck: string) => `${precon} · your deck ${deck} was built from this`,
    },
    // K13: the confirm, opened from v0's panel here and from the open precon (PR 6a-2). `Unlink` is
    // the bone fill, never `--danger`: nothing the player made is lost (lock 5).
    unlink: {
      entry: "Unlink",
      entryLong: "Unlink from this precon",
      title: (deck: string, precon: string) => `Unlink ${deck} from ${precon}?`,
      lead: "v0, the precon’s list, leaves this deck’s history. v1 goes back to having nothing before it.",
      factLabels: { history: "History" },
      facts: { history: "v0 leaves · v1 is first again" },
      cancel: "Cancel",
      submit: "Unlink",
      pending: "Unlinking…",
      failed: "We couldn’t confirm that unlinked. Reload to see where the deck stands.",
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
