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

export const preconsCopy = {
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
    own: (owned: number, of: number) => `${n(owned)} of ${n(of)}`,
    built: "your deck",
    builtTwo: "your decks",
    builtAnd: " and ",
    builtShared: (shared: number) => ` · ${n(shared)} shared`,
    twin: "also sold as a Collector’s Edition · same list",
    unmapped: (count: number) => `${plural(count, "card", "cards")} not in our catalog yet`,
    aria: (name: string, owned: number, of: number) => `${name}. You own ${n(owned)} of ${n(of)} of its cards.`,
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
