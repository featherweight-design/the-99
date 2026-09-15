// about · copy strings — design handoff R1, input to /copy-review in PR 1.
//
// Shape follows the spec's content model exactly: ABOUT_VERSION, Entry, Chapter,
// chapters. What the handoff adds is `aboutCopy` for the page's own chrome —
// the spec's model covers the entries and says nothing about the h1, the lede,
// the eyebrow, the contents heading or the dismiss, and all five are strings.
//
// Voice rules applied, from lib/copy/refresh.ts:
//   - never explain that a state is fine;
//   - a count is the honest form of a reassuring sentence;
//   - name the thing on screen, never a noun the reader cannot see.
// Assumes the reader knows how Magic works. Explains nothing about the game.
//
// EVERY `since` below is 1. At launch the whole page is version 1 and `seen`
// is 0 for every account, so nothing is marked — the spec's rule, and the
// reason the file needs no marked example to be correct.

export const ABOUT_VERSION = 1;

type Entry = {
  title: string;
  body: string;
  route: string;
  /** Rendered as a mono --fg-faint clause after the route. Omitted, never "". */
  opens?: string;
  since: number;
};

type Chapter = { title: string; blurb: string; entries: Entry[] };

/** The page's own chrome. Not in the spec's model; all five are strings. */
export const aboutCopy = {
  heading: "What The 99 does",
  lede:
    "Everything here is scored against the cards you actually own — decks, commanders, set " +
    "completion and the buy list all read from your collection. Four chapters, in the order you " +
    "would use them, and every entry links to where it lives.",
  // Phone drops the clause after the em dash; same sentence, one string shorter.
  ledeShort:
    "Everything here is scored against the cards you actually own. Four chapters, in the order " +
    "you would use them, and every entry links to where it lives.",
  contents: "Contents",
  // The eyebrow exists ONLY when the reader is behind. It is the reason they
  // are looking at this page instead of the one they asked for, so it is a
  // count and not an apology. Pluralised because 1 is the common case.
  newSince: (n: number) => `${n} new since you were last here`,
  // On a chapter heading and on the phone contents row.
  chapterNew: (n: number) => `${n} new`,
  // Inside the plate, sr-only. The plate's visible word is "NEW".
  markLabel: "New in this version",
  mark: "NEW",
  dismiss: "Got it",
  // Two strings, not one with a fallback: "home" is a place, not a path, and
  // the app calls it that everywhere else.
  dismissDestination: (path: string) => `takes you to ${path}`,
  dismissHome: "takes you home",
} as const;

export const chapters: Chapter[] = [
  {
    title: "Your collection",
    blurb:
      "Everything downstream is scored against what you own, so this is where the app starts.",
    entries: [
      {
        title: "Import a collection",
        route: "/collection/replace",
        body:
          "A CSV export from Moxfield, Archidekt, Deckbox or ManaBox, or a list pasted straight " +
          "in. An import replaces what is there rather than adding to it, and you see a preview " +
          "before anything is written.",
        since: 1,
      },
      {
        title: "Rows the import could not place",
        route: "/collection/replace",
        opens: "opens the issue inspector",
        body:
          "Anything that could not be matched to a printing is listed with the reason, in an " +
          "inspector on the import screen. A pasted list carries no set or collector number, " +
          "which is why a pasted collection cannot drive set completion.",
        since: 1,
      },
      {
        title: "Browse what you own",
        route: "/collection",
        body:
          "Every card in your collection, searchable and filterable, with how many copies you " +
          "have and how many of them are committed to a deck.",
        since: 1,
      },
      {
        title: "Set completion",
        route: "/collection/sets",
        body:
          "How close each set is to complete, and what is missing from the ones you are closest " +
          "on. It reads set and collector numbers, so it needs a CSV rather than a pasted list.",
        since: 1,
      },
      {
        title: "What a card costs to buy",
        route: "/collection",
        opens: "opens the card detail",
        body:
          "Prices come from ManaPool and refresh weekly. A card with no price was never stocked " +
          "there, which is not the same as free.",
        since: 1,
      },
      {
        title: "The card itself — printings, art, both faces",
        route: "/collection",
        opens: "opens the card detail",
        body:
          "Every printing of a card, its art at full size, and the back of a double-faced card. " +
          "It opens from a card anywhere in the app, not only here.",
        since: 1,
      },
    ],
  },
  {
    title: "Finding a commander",
    blurb:
      "Two lanes: what your collection already supports, and what it would support if you " +
      "bought one card.",
    entries: [
      {
        title: "Commanders you can build today",
        route: "/commanders",
        body:
          "Ranked by how much of a deck you already own for them. Filter by colour identity and " +
          "reorder as you like.",
        since: 1,
      },
      {
        title: "Commanders worth acquiring",
        route: "/discover",
        body:
          "The same ranking run over commanders you do not own — the one card that would unlock " +
          "the most of what is already on your shelf.",
        since: 1,
      },
      {
        title: "Why this commander",
        route: "/commanders",
        opens: "opens a commander",
        body:
          "The reasoning behind a ranking: which themes in your collection it is using, and how " +
          "much of each it reaches.",
        since: 1,
      },
      {
        title: "What the deck would be made of",
        route: "/commanders",
        opens: "opens a commander",
        body:
          "The cards you already own that would go in, grouped by the job they do, before you " +
          "commit to building anything.",
        since: 1,
      },
      {
        title: "Partners",
        route: "/commanders",
        opens: "opens a commander",
        body:
          "Commanders that pair, and what the pair's wider colour identity opens up in your " +
          "collection.",
        since: 1,
      },
    ],
  },
  {
    title: "Building the 99",
    blurb: "The longest chapter, in the order a deck actually gets built.",
    entries: [
      {
        title: "Start a deck",
        route: "/decks/new",
        body: "Name it, pick a commander, and the 99 fills from there.",
        since: 1,
      },
      {
        title: "Import a decklist you already have",
        route: "/decks/import",
        body:
          "Paste a list or bring a file. Cards you own are matched to your own copies; the rest " +
          "arrive as a buy list rather than as a problem.",
        since: 1,
      },
      {
        title: "The deck page",
        route: "/decks",
        opens: "opens a deck",
        body:
          "One deck in one place: the list by role, what it still needs, its games and its " +
          "versions.",
        since: 1,
      },
      {
        title: "Adding cards",
        route: "/decks",
        opens: "opens a deck's Add panel",
        body:
          "Search your collection or all of Magic, with the cards you own marked, and add " +
          "without leaving the list you are looking at.",
        since: 1,
      },
      {
        title: "Topping off the last slots",
        route: "/decks",
        opens: "opens a deck",
        body:
          "When a deck is nearly there, this fills the remaining slots from what you own instead " +
          "of making you search for them one at a time.",
        since: 1,
      },
      {
        // The entry most likely to be misread, so it gets three sentences and
        // the only "cannot" on the page. "The deck that sleeved it first",
        // never "the oldest deck": the ordering is per-card, so a newer deck
        // can outrank an older one on a card it committed earlier.
        title: "Who holds this card",
        route: "/decks",
        opens: "opens a deck",
        body:
          "A card you own one copy of cannot be in two committed decks at once. The deck that " +
          "sleeved it first holds it, and the other deck is told which one that is. A card " +
          "staged into a draft counts against the supply from the moment you add it.",
        since: 1,
      },
      {
        title: "What you would need to buy",
        route: "/decks",
        opens: "opens the shopping roll-up",
        body:
          "Every card your decks want and you do not own, priced and grouped, across the whole " +
          "library rather than one deck at a time.",
        since: 1,
      },
      {
        title: "Shelves",
        route: "/decks",
        body:
          "Folders for decks. A deck sits on one shelf or on none, and choosing a shelf narrows " +
          "the library rather than filtering it.",
        since: 1,
      },
      {
        // Two entries, not one, because they are two surfaces: the rail is in
        // the deck's Versions tab and the review screen is its own route that
        // redirects away when there is nothing to review. Neither is linkable
        // in the abstract, so both point at /decks.
        title: "Versions",
        route: "/decks",
        opens: "opens a deck's Versions tab",
        body:
          "A deck has a committed list and a draft you are working on. Committing the draft cuts " +
          "a version, and you can read any earlier one.",
        since: 1,
      },
      {
        title: "Reviewing a draft before you commit it",
        route: "/decks",
        opens: "opens a deck's pending banner",
        body:
          "Every add and cut in the draft, beside the committed list, before any of it counts " +
          "against your collection.",
        since: 1,
      },
      {
        title: "Export a decklist",
        route: "/decks",
        opens: "opens a deck",
        body: "The list as plain text, in the format the other deck sites read.",
        since: 1,
      },
    ],
  },
  {
    title: "Playing and tuning",
    blurb: "Home is the end of the loop rather than the start of it, so it is described here.",
    entries: [
      {
        title: "Log a game",
        route: "/decks",
        opens: "opens a deck's Games tab",
        body:
          "Who played, who won, and how long it ran. A few seconds after the game, on the deck " +
          "you played.",
        since: 1,
      },
      {
        title: "What the log tells you",
        route: "/decks",
        opens: "opens a deck's Games tab",
        body:
          "How a deck has done, against whom, and how it has done since the version you are on.",
        since: 1,
      },
      {
        title: "Picking up where you left off",
        route: "/",
        body: "Home leads with the deck you touched last and what it is waiting on.",
        since: 1,
      },
      {
        title: "Where your collection is committed",
        route: "/",
        body:
          "How much of what you own is in a deck, how much is free, and which decks are asking " +
          "for more than you have.",
        since: 1,
      },
    ],
  },
];

// ─── Reuse, not re-authored ──────────────────────────────────────────────────
//
// shellCopy.accountMenu gains ONE string. Nothing else in that object changes.
//
//   about: "About The 99"
//
// Rejected: "How this works" (warmer, but the row would name the page
// differently from the /about URL it shows on hover) and "What's new" (promises
// the changelog ruling 2 and the spec's out-of-scope list both refuse).
//
// ─── Not documented, deliberately ───────────────────────────────────────────
//
// Deck tuning suggestions renders nothing, so it gets no entry. Shelves is
// ABOVE at since: 1 on the assumption its PR merges before about.ts is
// written; if it has not, the entry comes out and arrives later at since: 2.
//
// Two features in design right now are deliberately ABSENT, and the handoff
// draws them as the version-2 arrivals so the mechanism has a real example:
//
//   { title: "Which deck gets a shared copy", route: "/decks", since: 2,
//     body: "When more decks want a card than you own copies of, the deck " +
//           "that committed it first gets it — unless you say otherwise." }
//   { title: "Cards you are proxying", route: "/decks", opens: "opens a deck",
//     since: 2,
//     body: "Mark a card in a deck as one you are printing. It stops being " +
//           "something to buy, it does not become something you own, and " +
//           "the deck's list says which rows they are." }
//
// Nothing in the backlog gets a paragraph ahead of its merge; that rule is
// what makes `since` mean anything.
