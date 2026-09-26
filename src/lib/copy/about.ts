// src/lib/copy/about.ts — the /about reference page.
//
// Regenerated for R3 against the R3 canvas. This file previously held R1's 26
// entries under titles the canvas no longer used, with neither `caption` nor
// `keys`; the audit flagged that as the one finding that blocked build rather
// than degrading it. It now matches the canvas entry for entry, in order.
//
// R4: one entry added (`post-import`, #639/#643), `deck-import` and `export`
// corrected against source, `put-back` retitled to `undo-removal`. 33 entries.
//
// BUILD, 2026-09-15 — the six edits in `READINESS-r5-audit.md` §5, applied
// here rather than in a fifth design round. Four of them are features that
// merged after R4 was drawn; the handoff cannot outrun a repo that ships
// daily, which is the whole argument for the per-feature rule in AGENTS.md.
// 34 entries.
//
// Voice: Kitchen Table. An entry explains a thing the app already does, to a
// player who has met it and wants to know what it meant.
//
// RULES, enforced in review:
//   1. `caption` and `keys` are THIS page’s prose and may be written here.
//   2. Every string drawn INSIDE a specimen comes from that surface’s own copy
//      file at render time — never retyped into this file. A rename in
//      refresh.ts or lanes.ts must reach the figure without touching about.ts.
//   3. `keys` is 0–4 entries. Zero is a finished answer, not a gap.
//   4. A figure may only draw what the app draws. Explanatory sentences the
//      product does not ship live in `keys`, never in the specimen.
//   5. `since` is the ABOUT_VERSION in which the entry first appeared.
//
// ABOUT_VERSION is bumped when an entry is added or its caption materially
// changes. about.test.ts pins a content hash, so a change forces either a
// deliberate bump or a deliberate re-pin.

export const ABOUT_VERSION = 9;

export type AboutChapter = '01' | '02' | '03' | '04';
export type AboutWidth = 'inset' | 'plate';

/**
 * The feature switches an entry can be tied to (Hugh, 2026-09-25). An entry that names one
 * renders only while that switch is on, and turning it on is what announces it. A closed
 * union, so a misspelled switch is a type error rather than an entry that never appears.
 */
export type AboutSwitch =
  | 'NEVER_CUT_ENABLED'
  | 'SWAP_TOOLS_ENABLED'
  | 'HELP_ME_CHOOSE_ENABLED'
  | 'CHANGE_COMMANDER_ENABLED';

export interface AboutEntry {
  id: string;
  /** The feature switch this entry follows. None: always drawn, seen by `since`. */
  switch?: AboutSwitch;
  chapter: AboutChapter;
  title: string;
  route: string;
  /** Appended after the route when the link does not land on the page itself. */
  opens?: string;
  width: AboutWidth;
  caption: string;
  /** 0–4 lines, in numeral order. Read in sequence by a screen reader. */
  keys: string[];
  since: number;
}

export const aboutCopy = {
  pageTitle: 'What The 99 does',
  pageIntro:
    'Four chapters, in the order you would use them. Each entry shows the thing it describes and links to where it lives.',
  // Appended to the intro only while ABOUT_SHEET_ENABLED is on: with it off a
  // new version still redirects here, and there is no note to speak of.
  pageIntroSheet: 'When something new lands, a short note tells you once, and this page opens on what’s new.',

  contentsLabel: 'Contents',
  newBadge: 'NEW',
  newBadgeSr: 'New in this version',
  newSinceEyebrow: (n: number) =>
    n === 1 ? '1 new since you were last here' : `${n} new since you were last here`,
  newInChapter: (n: number) => `${n} new`,
  // The contents row’s figure when nothing in that chapter is new, which is
  // every chapter for every reader at launch. A row that carried a count only
  // when something was new would be blank for everyone on day one.
  entriesInChapter: (n: number) => (n === 1 ? '1 entry' : `${n} entries`),

  // The contents list and its search (About R6 §Q, §R), verbatim from §R8.
  contents: {
    searchPlaceholder: 'Find an entry',
    searchLabel: 'Find an entry by title',
    count: (m: number, n: number) => `${m} of ${n}`,
    none: (q: string) => `Nothing titled “${q}”.`,
    noneNote: 'The search reads entry titles only. The page is unchanged.',
    clear: 'Clear search',
    newRow: 'new',
    // The disclosure's name on a phone chapter row; the visible figure beside it
    // is not a name on its own.
    toggle: (chapter: string) => `Entries in ${chapter}`,
  },

  dismiss: 'Got it',
  dismissDestination: (route: string) => `takes you to ${route}`,
  dismissDestinationHome: 'takes you home',

  chapters: {
    '01': {
      title: 'Your collection',
      sub: 'Everything downstream is scored against what you own, so this is where the app starts.',
    },
    '02': {
      title: 'Finding a commander',
      sub: 'Two lanes: what your collection already supports, and what it would support if you bought one card.',
    },
    '03': {
      title: 'Building the 99',
      sub: 'The longest chapter, in the order a deck actually gets built.',
    },
    '04': {
      title: 'Playing and tuning',
      sub: 'Home is the end of the loop rather than the start of it, so it is described here.',
    },
  },
} as const;

export const aboutEntries: readonly AboutEntry[] = [
  // ---- 01 · Your collection ------------------------------------------------
  {
    id: 'browse',
    chapter: '01',
    title: 'Browse what you own',
    route: '/collection',
    width: 'plate',
    caption:
      'Search by name, narrow by color, type, set or availability, and read the result as a grid or as rows. Every narrowing is a chip you can see and remove, and the count above the results says how many cards you are looking at.',
    keys: [
      'a chip per narrowing, each removable on its own, and one link that clears the lot. Nothing filters invisibly.',
      'By set takes you to your sets, each one in collector order with what you are missing.',
      'grid or rows is a reading choice and it is remembered. The filters are not: they live on the URL, so a link carries them and a fresh visit starts clean.',
    ],
    since: 1,
  },
  {
    id: 'import',
    chapter: '01',
    title: 'Import a collection',
    route: '/collection/replace',
    width: 'inset',
    caption:
      'A CSV export from Moxfield, Archidekt, Deckbox or ManaBox, or a list pasted straight in. We read owned counts, sets and finishes. An import replaces what is there rather than adding to it, and you see a preview before anything is written.',
    keys: [],
    since: 1,
  },
  {
    id: 'post-import',
    chapter: '01',
    title: 'What a replace did to your decks',
    route: '/collection/replace',
    opens: 'opens the import summary',
    width: 'plate',
    caption:
      'An import replaces your collection, so it can change what your decks can supply. The summary lists the cards your decks were billing, one row per card and the deck it was for. No deck is edited. A deck keeps every card it had; what changes is whether you own it.',
    keys: [
      'before and after, both printed, so the change is checkable rather than asserted.',
      'a row is a card and one deck. Only a contested card gathers its decks under it, oldest claim first.',
      'three sections, and each is a different answer: no longer to buy, still to buy, still short.',
      'and one choice: when two committed decks want the copy that arrived, the first to sleeve it keeps it unless you say otherwise.',
    ],
    // ⚠ R4: strings inside this figure are FIXTURES, not read from source.
    // #639/#643 landed after the last read of main; the structure is the
    // entry’s subject and holds, and the vocabulary is in
    // `src/lib/copy/card-assignments.ts` — the summary has no copy module of
    // its own. See `design/design_handoff_the99_about/READINESS-r4.md`.
    //
    // One structural decision inside it, not a fixture: a row under
    // `No longer to buy` carries NO diamond. Those copies became free, and
    // free carries nothing anywhere in the app — the availability entry two
    // above this one teaches exactly that. A solid diamond there would be the
    // `none free` mark on a row announcing the opposite.
    since: 1,
  },
  {
    id: 'import-issues',
    chapter: '01',
    title: 'Rows the import could not place',
    route: '/collection/replace',
    opens: 'opens the issue inspector',
    // A ROW figure, so it takes the full plate. The route’s own issue rows carry
    // a name, a line number, a set code and a reason on one line; at the inset’s
    // 300px cap `no Oracle match` wrapped and the copy count collided with it —
    // a figure demonstrating the route’s row while showing a shape the route
    // never produces.
    width: 'plate',
    caption:
      'Every line we could not put a card to, with the reason beside it, split into names we could not match and lines we could not read. Neither is a buy list, and neither stops the rest of the import. A pasted list carries no set or collector number, which is why a pasted collection cannot drive set completion.',
    keys: [],
    since: 1,
  },
  {
    id: 'availability',
    chapter: '01',
    title: 'Free, in a draft, in use, over-committed',
    route: '/collection?avail=inuse,over',
    width: 'plate',
    caption:
      'One copy cannot be in two committed decks at once. A card carries a diamond and a few words saying how contested it is, and a card that is free carries nothing at all.',
    keys: [
      'free — you own a copy that nothing has claimed. No diamond at all, which is the commonest state in the app.',
      'in a draft — a deck you have never committed wants it, and that deck wears the same Draft badge on your decks page. The claim is real but not binding.',
      'none free — your committed decks hold every copy you own, and none is spare.',
      'short 2 — the committed decks between them ask for two more copies than you own. The deck that sleeved it first keeps it by default, and you can hand it to another. A card you own none of never shows here; on a decklist it takes the buy mark instead.',
    ],
    since: 1,
  },
  {
    id: 'sets',
    chapter: '01',
    title: 'Set completion: what you are missing',
    route: '/collection/sets',
    width: 'plate',
    caption:
      'Every card in a set in collector order, with the ones you do not own dashed and dimmed rather than hidden. The base run is counted apart from the extras, so a set reads as complete when you have the set, not when you have every alternate printing of it.',
    keys: [
      'missing — dashed edge, dimmed art, and a price an owned cell never carries. Absent, not disabled: it still opens.',
      'the cost covers the cards ManaPool actually stocks. One that has never been stocked is counted and left out rather than priced at zero.',
      'Base run is the set; extras are counted apart and sit below, which is why the completion figure and the number of cells on screen do not match.',
    ],
    since: 1,
  },
  {
    id: 'buy-tag',
    chapter: '01',
    title: 'What a card costs to buy',
    route: '/decks',
    opens: 'opens a deck',
    width: 'inset',
    caption:
      'Prices come from ManaPool and refresh weekly. The tag has four states and they are different claims: a figure, a foil-only figure, sold out (stocked, but unavailable today) and no figure at all, which is the feed having no price for that printing rather than a price of nothing. None of those is free.',
    keys: [],
    since: 1,
  },
  {
    id: 'card-detail',
    chapter: '01',
    title: 'The card itself: printings, art, both faces',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'inset',
    caption:
      'The printings you own of a card, its art at full size, and the back of a double-faced card. A tick marks the printing you picked to represent the card; a hollow diamond marks the one being shown right now. The cost beside the name is drawn with the real mana symbols, and a card that prints two costs (a split, an adventure, or a card with a castable back) shows both. It opens from a card anywhere in the app, not only here.',
    keys: [],
    since: 1,
  },

  // ---- 02 · Finding a commander -------------------------------------------
  {
    id: 'ready-to-build',
    chapter: '02',
    title: 'Ready to build, on Home',
    route: '/',
    width: 'plate',
    caption:
      'Two commanders you could build today. We rank every commander you own and have not built yet by fit, and show you two of the top nine, changing the pair daily so Home is not the same every morning. Each card says how many of your cards fit its colors, and how many of those your built decks already hold every copy of.',
    keys: [
      "the top nine is a ranking, not a passing score. The ninth commander’s score moves as your collection grows; it is never a fixed number to beat.",
      'each card shows how many of your cards fit, then how many of those are already committed. The second figure is left out when it is zero.',
      'the pair changes at midnight UTC and never repeats a commander from the day before, so you see all nine within five days.',
      "the `N more scored X or better` line uses the ninth commander’s own score, so you can check it against the lane.",
    ],
    since: 1,
  },
  {
    id: 'fit-score',
    chapter: '02',
    title: 'How a fit score is made',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'plate',
    caption:
      "We score how well a commander fits your collection out of 100, from three things added together: how many of your cards are legal in its colors, whether you own enough ramp, draw, removal and wipes to build at all, and how much of its most-played list you already have. The bar shows those three in that order.",
    keys: [
      "the score is out of 40 instead of 100 when we could not read a commander’s most-played list. We never rescale it to look like a 100.",
      'the three parts are printed with their sum, so you can check the score yourself.',
      "a score only means something against your own collection. Comparing it to someone else’s tells you nothing.",
    ],
    since: 1,
  },
  {
    id: 'commander-lane',
    chapter: '02',
    title: 'Commanders you can build today',
    route: '/commanders',
    // A RACK figure, so it takes the full plate. `FilterRack` collapses its
    // controls behind a `Filters` sheet below the chassis stop, and at the
    // inset’s 300px that is all a reader sees — the Build from choice this
    // entry’s caption is about would be inside a sheet no specimen can open.
    width: 'plate',
    caption:
      "Every commander you own and have not built yet, ranked by fit. Build from chooses which of your cards the scores are counted against: all of them, or only the ones no committed deck is holding. Where we could not read a commander’s most-played list, the bar has two segments instead of three and the score is out of 40.",
    keys: [],
    since: 1,
  },
  {
    id: 'discover',
    chapter: '02',
    title: 'Commanders worth acquiring, and what each order means',
    route: '/discover',
    width: 'plate',
    caption:
      'Commanders you do not own, ranked by how many cards you already own that would go in the deck. Each row scores the fit the same way the commander lane does, and adds what only matters for a commander you would have to buy: what the card costs. Under each row, a line names what that commander plays and none of your decks do.',
    keys: [
      'five orders. Only Something new changes which commanders appear: it drops any whose decks run less than 30% cards you already own.',
      'Best fit, the default, reads your whole collection, because you would own this commander if you bought it.',
      'every order says what it ranks by, so Popularity is most decks tracked first rather than a score of its own.',
    ],
    since: 1,
  },
  {
    id: 'help-me-choose',
    chapter: '02',
    title: 'Help me choose',
    route: '/decks/new/choose',
    width: 'plate',
    switch: 'HELP_ME_CHOOSE_ENABLED',
    caption:
      // Audit H3: with no theme and no card the list IS ordered by ownership. H1: the hand-off
      // shipped in #1011, and Create is what fills the deck, not the pick.
      'For a deck you want but have no commander for. Answer as much or as little as you like: colors, a theme, a budget, a bracket, a card to build around, or a sentence in your own words. The results are ordered by how well each commander fits what you asked, owned or not. With no theme or card to fit, they are ordered by how many of their cards you already have. Picking one carries your answers to a new deck, and creating it fills the 99 under them.',
    keys: [
      // Audit H4: SETS RANK is drawn only when a row has more than one figure.
      "With a theme or a card, each figure is a share of that commander's decks: the share tagged with your theme, or the share that runs your card. The weakest figure orders the row, and when there is more than one it is marked SETS RANK.",
      // Audit H5. The owned-order exception is said once, in the caption, so this line drops the
      // "never orders it" that the exception made false.
      "Every row shows what you own beside the fit: the commander's own mark, how much of its 99 you own, and roughly what the rest would cost.",
      // Audit H2 (the panel shipped in #1000), and a fact 1f corrected: the cost is shown on the
      // results, in the Look deeper panel, never on the form.
      'Your sentence is matched for free. Look deeper, on the results, weighs all of it for one credit, and the cost is shown before you press.',
      // Audit H6: the page offers answers to loosen, each with a count.
      'When too few commanders fit, the page offers answers to loosen, each with how many commanders it would bring back, or you can change the answers yourself.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'role-coverage',
    chapter: '02',
    title: 'Why this commander, and what the deck would be made of',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'inset',
    caption:
      'The cards you already own that would go in this deck, grouped by the job they do. Each group shows what you have against what a deck needs, so a board wipes group reading 1 owned, 2 short of baseline tells you what to fix before you start building. You can read a group in its usual order, or by availability: free copies first, then the ones a draft wants, then the ones already in use, then anything over-committed.',
    keys: [],
    since: 1,
  },
  {
    id: 'commander-availability',
    chapter: '02',
    title: "When a card you own isn’t free",
    route: '/commanders',
    opens: 'opens a commander',
    width: 'plate',
    caption:
      "Owning a card and being free to use it are different things. A green dot means the card is yours. The note beside it says what is claiming it: one in a draft, none free, or short by however many copies your committed decks want past what you own. A card with a spare copy that nothing wants says nothing, because there is nothing to report.",
    keys: [
      'the dot means you own the card and nothing else. It stays the same color whether or not a deck is holding it.',
      'the note counts copies and never names a deck. Open the card to see which decks are holding it.',
      'the synergy list prices what you do not own, so a card you would have to buy says so before you plan around it.',
    ],
    since: 3,
  },
  {
    id: 'partners',
    chapter: '02',
    title: 'Partners',
    route: '/decks/new',
    width: 'inset',
    caption:
      "When your commander has Partner we offer the partners you own, and a pasted list’s second legend arrives as a proposal you can change or remove. Two commanders take two of the hundred cards, so a pair deck’s 99 is 98, and every count and progress bar in the app measures against that.",
    keys: [],
    since: 1,
  },

  // ---- 03 · Building the 99 -----------------------------------------------
  {
    id: 'deck-page',
    chapter: '03',
    title: 'The deck page',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'One page per deck: the commander, the status and how far along it is, then the list itself. Tabs under the header hold the deck, cards worth considering, the games you have played with it and, once you have committed it, its versions. Everything about a deck lives on the deck.',
    keys: [
      'the badge and the bar are the same pair the library shows, so a deck reads the same from either direction.',
      'Games drops its count rather than printing a zero, so a deck nobody has logged a game against has no number beside Games.',
      'Consider is the other half of the recommendation: cards this commander wants that are not in the list yet.',
    ],
    since: 1,
  },
  {
    id: 'auto-fill',
    chapter: '03',
    title: 'How much we fill in for you',
    // The canvas names /decks/new, which is where the fill is ORDERED. The
    // surface drawn below is where the rest of it is offered: the Top off
    // strip, which lives between the ledger and the decklist on a deck’s own
    // page. The route line names the page the reader is looking at.
    route: '/decks',
    opens: 'opens a deck',
    // 'inset' at the canvas, where the figure was a three-row legend. The
    // strip’s head is one baseline row on desktop and a ~300px column stacks
    // it into five lines.
    width: 'plate',
    caption:
      'Pick a commander and we build the 99 from what you own first, adding staples you don’t own where your collection runs short. Any slots still open are yours: the last-slots list ranks candidates for them, ticks the ones you can sleeve, and adds nothing until you say so. Anything auto-added can be cleared in one action if you would rather start from your own picks.',
    keys: [],
    since: 1,
  },
  {
    id: 'decklist-marks',
    chapter: '03',
    title: 'The marks on a decklist row',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'A decklist is rows, and each row answers four questions from left to right: do you own it, what is it, how many does the deck want, and is anything standing in the way. Marks after the name flag what a bracket counts: a Game Changer, mass land denial, extra turns or a tutor. A row with nothing in its way carries no obstacle mark, so the ones you do see are all things to deal with. The separate auto tag says we picked the card for you, which is a fact about where it came from rather than a problem.',
    keys: [
      'a filled green dot is a card you own; a dashed hollow one is a card you do not. Same shape, same place, every list in the app.',
      // The canvas says "the circled figure ... is there whether that is one
      // or four". The row draws neither half: the count is `×2` in mono beside
      // the name, and `decklist-row.tsx` renders it on `quantity > 1` only.
      // A single copy is the ordinary case and says so by saying nothing.
      'a count appears beside the name only when the deck wants more than one copy, as `×2`. A row with no count wants one.',
      // The red edge rides WITH `short N` rather than in the edge line below.
      // It is the same answer drawn twice — the collection saying you are a
      // copy short — where the accent edge answers a different question, and
      // the two used to share one sentence as though they were one axis. The
      // page caps an entry at four keys, so this is the split that fits: by
      // WHAT IS BEING ANSWERED, which is the distinction that was missing.
      'a mark only when there is something to say: `1 in a draft`, `none free`, `short N`, which also turns the row’s edge red, `$` for a card you would have to buy, or `P` for one you are printing. On Shopping, a card another deck holds carries its buy tag beside the mark.',
      'a bright accent edge answers a different question: you have changed this row and not committed it yet, and the edge goes when you do.',
    ],
    since: 1,
  },
  {
    id: 'locked-cards',
    chapter: '03',
    title: 'Locked cards',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    switch: 'NEVER_CUT_ENABLED',
    caption:
      "Lock a card and no tool will offer to cut it: Suggested changes won't propose it and it gets no cheaper stand-ins. The ✕ still removes it: a lock binds the app's suggestions, not you.",
    keys: [
      // Audit L2: the lock sits beside the ✕ on a row, not after the name. Its other half (what
      // else changes) is said once, where it belongs: stand-ins in the caption, Pull it in key 3.
      "A locked card shows a closed lock beside its ✕ in the list, and on its tile's caption.",
      "Lock cards, in the deck's toolbar, turns each ✕ into a lock until you press Done. It is how you lock a card from a phone or a keyboard.",
      'Clear all auto skips locked cards and says how many stayed. Pull it never takes a copy from a deck where the card is locked, and says locked instead.',
      // Audit L1: a discard brings a removed locked card back locked; a commit is what ends it.
      'Remove a locked card and bring it back with Undo, Put back or a discard, and it is still locked. Once a version is committed without it, the lock is gone.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'roles',
    chapter: '03',
    title: 'Why a card is filed under Ramp',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'The strip counts cards by the job they do, because that is usually how a deck comes up short: one board wipe is a problem in a way eleven creatures rarely is. The recommended mix comes from what other decks with your commander actually run, where we have enough of them, and from a common starting point where we do not. The strip says which. Either way it is not a rule: a role over its number is fine and says so by saying nothing.',
    keys: [
      // Named on the cell the figure actually draws. The canvas wrote "5
      // wipes against 3", which was an example rather than a reading — and
      // the strip below draws Wipes SHORT, because the caption’s own example
      // of a problem is the deck with one board wipe.
      'the second figure is the recommendation, so 12 ramp against 10 is a surplus rather than an error. Nothing is capped.',
      'a short role is the one thing here that names what to do next, and `consider` goes straight to cards that would fill it.',
    ],
    since: 1,
  },
  {
    id: 'informed-build',
    chapter: '03',
    title: 'Building toward decks like yours',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'Fill, the last 31 and the Add panel all build toward what other decks with your commander actually run, rather than one recipe for every deck. A Kinnan deck wants about twice the ramp of an Atraxa deck and no board wipes at all; both used to be told the same ten, ten, eight and three. Where there are not enough decks to measure, the old numbers still stand in, and the strip says which you are looking at.',
    keys: [
      'the land count moves too. Twenty-eight lands is a real answer for a deck that ramps, and thirty-seven was never right for all of them.',
      'a target of 0 is an answer too: the decks this commander leads run no board wipes, so the cell asks for none.',
    ],
    since: 8,
  },
  {
    id: 'combo-awareness',
    chapter: '03',
    title: 'The other half of a combo',
    route: '/collection',
    opens: 'opens your collection',
    width: 'plate',
    caption:
      'Some cards only do something remarkable next to one other card, and the app says which: on a collection row when you own both halves and no deck has put them together, and on a card the deck you are building is one away from. The card’s details list every partner it has, with whether that partner is in the deck, in your collection, or neither.',
    keys: [
      'no count of how many combos a card has. Detection leaves out combos that need a third piece, so a total would be the first thing on the surface that is not true.',
      'one partner is named on a row and all of them in the card’s details. Naming one is true whether or not there are others; the list is where the enumerating belongs.',
      'the list runs from what this deck already holds to what you would have to buy, so the cap never hides a partner already on the table.',
      'it comes from Commander Spellbook, and the details say so behind the heading’s marker rather than under every block.',
    ],
    since: 9,
  },
  {
    id: 'decklist-order',
    chapter: '03',
    title: 'Reading the 99 in a different order',
    route: '/decks',
    opens: 'opens a deck',
    // 'inset' at the canvas, where the figure was a four-row legend. It draws
    // the decklist’s own bar now, which is a full-width row on the deck page.
    width: 'plate',
    caption:
      'The 99 is always in sections, by role or by type, and the order you pick applies inside them rather than flattening the list. Name and mana value are always offered; price joins them on the shopping filter, where money is the question being asked.',
    keys: [],
    since: 1,
  },
  {
    id: 'add-cards',
    chapter: '03',
    title: 'Adding cards',
    route: '/decks',
    opens: "opens a deck’s Add panel",
    // 'inset' at the canvas, where the figure was two names and a dot each.
    // The panel’s result row is a full-width option with a meta line and an
    // availability slot, which a ~300px column cannot hold.
    width: 'plate',
    caption:
      // The canvas said "with the ownership dot on every result". The Add
      // panel draws NO dot: `card-search-row.tsx` gives each result a card
      // crop and states ownership in words — `×2 owned` or `not owned`. The
      // figure this replaced drew dots because this sentence claimed them,
      // which is the loop the rebuild exists to break.
      // Two corrections deep now. The canvas said "the ownership dot on every
      // result" and the panel draws no dot; the first fix said "how many
      // copies you have", which is true of `rowOwned` and not of the bare
      // `rowNotOwned` beside it. What both branches actually do is state
      // ownership, with a figure only where there is one to give.
      'Search what you own or all of Magic, with every result saying whether you own it and how many copies, and add without leaving the list you are looking at. A card another committed deck is holding still adds. It arrives carrying the mark that says so, rather than being refused.',
    keys: [],
    since: 1,
  },
  {
    id: 'fits-your-decks',
    chapter: '03',
    title: 'Find a deck for it',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'plate',
    switch: 'SWAP_TOOLS_ENABLED',
    caption:
      // r2's "the deck whose commander suits the card best comes first" is stale: the shipped order
      // (`shapeFits`) is a combo, then a theme, then the commander's synergy, then the name.
      "A card can belong in a deck you haven't thought of. Find a deck for it, in the details of any Commander-legal card, lists the decks that could take it and says why a deck fits when it can. Add puts it in the chosen deck's draft.",
    keys: [
      "Only decks whose colors allow the card, and that don't already run it, are offered.",
      "Decks where it completes a combo come first, then decks whose theme it joins, the most cards first, then the rest by how much their commander's decks favor it.",
      // Audit R2-A3-1: the row never shows the two shares; with no reason it shows the need alone.
      "Each deck gives its strongest reason: a combo the card completes with that deck's own cards, then the theme it would join. With neither, the row shows only what the deck needs, if anything. A staple every deck runs says staple instead, and its decks are listed by name.",
      "The need is this deck's count for the card's role against its target, left out when the card has no role or the target isn't measured. Add uses a free copy if you have one. Otherwise the card joins as one to buy.",
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'versions',
    chapter: '03',
    title: 'Changes, committing, and versions',
    route: '/decks',
    opens: "opens a deck’s Versions tab",
    width: 'plate',
    caption:
      'A deck has a committed list and the changes you are making to it. Every add and cut waits there until you commit, and committing cuts a version you can read back. On a committed deck, cards you add count against your collection for this deck straight away, and no other deck feels them until you commit.',
    keys: [
      'a version shows how many games it held, and each game in the log names its version, so you can tell whether a change helped.',
      'a deck you have never committed reads Draft once it holds a card, however many. Commit v1 and it takes the status its list earns.',
    ],
    since: 1,
  },
  {
    id: 'shopping',
    chapter: '03',
    title: 'What you would need to buy',
    route: '/decks',
    opens: 'opens a deck’s Shopping filter',
    // 'inset' at the canvas, where the figure was two legend rows. It draws
    // real Shopping-filter rows now, and a ~300px column truncated both card
    // names to `Dockside ...` and `R. —`.
    width: 'plate',
    caption:
      'Every card a deck wants and you cannot supply sits on that deck’s Shopping filter, with its price where ManaPool has one; the deck’s tile carries its count and cost, and Home adds up the cost across your whole library. A card you own can be on this list: if another deck sleeved your only copy first, this one has to buy one. Unpriced copies still count in the tally and add nothing to the total.',
    keys: [],
    since: 1,
  },
  {
    id: 'stand-ins',
    chapter: '03',
    title: 'Cheaper stand-ins',
    route: '/decks',
    opens: 'opens a deck’s Shopping filter',
    width: 'plate',
    switch: 'SWAP_TOOLS_ENABLED',
    caption:
      "Some cards Shopping asks you to buy cost more than the job they do. A limit per card marks those rows, and a marked row's ⇄ opens cheaper cards, or free copies you own, that do the same job. Cards of the same type come first, then other types. A land's stand-ins say what they make and whether they come in untapped, best mana first. Nothing is picked for you, and taking one is an ordinary draft change you can undo.",
    keys: [
      'The line under the price strip is this deck\'s limit per card. Until you set your own, it says it is the default.',
      "A row over the limit is marked, and its ⇄ opens the stand-ins. Any card on Shopping that isn't locked links to its stand-ins from its details too.",
      // Audit R2-A4-1: "each says what it gives up" is about every row, so it moves here. The order
      // within a group is the shipped lead's: shared work, then this commander's favor, staples last.
      "A spell's stand-ins do its job at its mana value or less. In each group, the cards that share more of its work lead, then the ones this commander's decks favor, and staples come last. Each says what it gives up, and a few show until you ask for all.",
      // r2 said a once-only color "doesn't count as making it"; the shipped ladder (`landRung`) counts it,
      // on the last rung.
      "Lands are ordered by their mana: untapped first, then ones that cost life or come in untapped only on a condition, then tapped ones, then utility lands that make a color only by paying for it, for a narrow use, or once.",
    ],
    since: 9,
  },
  {
    id: 'deck-import',
    chapter: '03',
    title: 'Bring a deck over, or update one',
    route: '/decks/import',
    // 'inset' at the canvas, where the figure named three labels. It draws
    // the route’s own entry surface now — a mode toggle over a full-width
    // paste field.
    width: 'plate',
    // R4: there is NO link mode. copy/deck-import.ts:26-30 — "that mode does
    // not exist and is not being built (#282)". The doors are `Paste a list`
    // and `Upload a file` (:37-40); the phone line is "Paste it or drop a
    // file". Import reads a Moxfield CSV *export*, which is the collection
    // entry’s claim, not this one’s.
    caption:
      'Paste a list or upload a file. Updating a deck you already have starts from that deck, and neither door takes a link, from Moxfield or anywhere else. A line we cannot put a card to does not stop the import: the deck is still made, the line is flagged inside it, and it counts toward the 99 but not toward what is built.',
    keys: [],
    since: 1,
  },
  {
    id: 'review-and-commit',
    chapter: '03',
    title: 'Reviewing what a commit will cost',
    route: '/decks',
    opens: 'opens the review page',
    width: 'plate',
    // Design R5, with two corrections for the 2026-09-19 vocabulary ruling:
    // the caption opened "A draft becomes a version here", which now reads as
    // the versionless deck rather than the edits, and key line 3 quoted the
    // guard tag as `deck in draft`. Both are copy, so eng resolved them.
    caption:
      'Committing turns your changes into a version, and this page lays out what that will cost. Not what the deck holds, which the deck page already shows, but what committing it asks of the rest of your collection. Cards coming in are counted into buckets, and a card another deck has already sleeved carries Pull it: take that copy and the deck holding it is cut a version. Unlike Put back, it cannot be taken back.',
    keys: [
      '`Coming in` is broken down by where each card comes from, free, sleeved or to buy, so the page says what the commit costs before a single row is read.',
      '`Pull it` takes a copy out of another deck and cuts that deck a version. It cannot be undone, which is why the deck it raids is named on the row.',
      'a deck with changes of its own cannot be raided, so the row says `deck has changes` and offers no control.',
    ],
    since: 7,
  },
  {
    id: 'new-deck',
    chapter: '03',
    title: 'Starting a deck',
    route: '/decks/new',
    opens: 'opens the commander picker',
    width: 'plate',
    caption:
      'The picker lists every commander you own, with the size of the pool each one opens up, meaning how many of your cards are legal in its colors, and a name is the only other thing a deck needs. Commanders that partner get a second slot, filtered to the ones they can legally pair with. Arriving from a commander’s own page skips the list: the commander is already chosen, any synergy picks you made there travel with you, and the page asks for the name.',
    keys: [
      'only commanders you own and could legally build are listed. The picker is your collection, not a catalog.',
      'the figure beside each one is how many of your cards are legal in its colors, which is the Pool part of a fit score seen from the other side.',
      'a name is required and everything else has a default: the deck arrives already filled, from your collection first and with staples you don’t own where it runs short, and every card of it is yours to change.',
    ],
    since: 7,
  },
  {
    id: 'change-commander',
    chapter: '03',
    title: 'Change commander',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    switch: 'CHANGE_COMMANDER_ENABLED',
    caption:
      // Audit C1 (candidates also need enough decks to measure) and C4 (a deck with no version has
      // nothing to discard back to).
      "Like the 99 but not the leader? Change commander, on the commander's art, lists the commanders in exactly this deck's colors that have enough decks to measure, or pairs for a pair deck, with the ones you own first. Each carries one figure: how many of this deck's cards its own decks run. Choosing one is a draft change like any other. It waits in pending changes, and on a committed deck, Discard puts the old commander back.",
    keys: [
      "Only commanders in exactly this deck's colors are offered, and only pairs for a pair deck, so not one card of the 99 changes.",
      "The figure counts this deck's cards that the candidate's decks run, leaving out basic lands and the staples every deck runs. Press it to see which cards.",
      // Audit C2: an owned candidate is free or held, and a buy tag may carry no price.
      'Candidates you own come first, marked free or held, and the rest carry a buy tag. Mana value is shown beside each but never sets the order.',
      // Audit C3, rewritten once the half-trade shipped (#1008). It names the pair case that works
      // and claims no more: two rarer partner cases are held (Hugh).
      'When a candidate is already in the 99, it moves to the command zone and the commander it replaces takes its slot, so the deck stays whole. A pair can bring in one half this way, and you choose which of the old pair stays.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'undo-removal',
    chapter: '03',
    title: 'Undoing a removal',
    route: '/decks',
    opens: 'opens a deck',
    // 'inset' at the canvas, where the figure was three legend rows. It draws
    // decklist rows now, which are full-width.
    width: 'plate',
    // R4: the specimen is the DECK PAGE control — `Rhystic Study removed` +
    // `Undo` (decks-builder.ts, undo.removed / undo.action). The review
    // screen’s `Put back` (deck-versioning.ts:249) is a second door and is
    // named in the caption rather than drawn. R3 drew one wearing the other.
    caption:
      "Take a card out of your deck and the row turns into an undo, naming it. The review screen offers the same thing on a cut of a single copy, reading Put back. A whole stack that came out is put back on the deck itself. Putting a card back also puts back what it cost: the deck’s count, its shopping total and any claim it had on your collection all return together, so undo never leaves the figures half-changed. Pulling a copy out of another deck is not this, and discarding a draft is not either.",
    keys: [],
    since: 1,
  },
  {
    id: 'export',
    chapter: '03',
    title: 'Take the list somewhere else',
    route: '/decks',
    opens: 'opens the export dialog',
    width: 'plate',
    // R4: the tabs are `Decklist` and `Shopping list` (export-dialog.tsx:2,52);
    // the primary is `Copy to clipboard`, swapping to `Copied ✓` for 1.5s
    // (export-copy-button.tsx:72); the secondary is `Download .txt`
    // (export-dialog.tsx:561). `Buy these at Mana Pool` was already right
    // (decks-builder.ts:472).
    caption:
      'The whole 99 as text a deckbuilding site will read, or only the cards this deck has to buy. Buying is a link out, not a checkout: Mana Pool takes the list from there.',
    keys: [
      // The canvas draws a count on the Shopping tab (`Shopping list 8`) and
      // the app draws none: `export-dialog.tsx` renders `exportTabCopy.shopping`
      // and nothing beside it. The figure below is that tab, so the claim had
      // nowhere to hide.
      'the Shopping list tab is the cards this deck has to buy, which includes one you own whose every copy another deck is already holding.',
      "the link opens in a new tab and carries the list, nothing else.",
      'Copy to clipboard reads Copied ✓ for a second and a half, then returns. It and Download .txt carry the same plain text, which Moxfield and Archidekt both read, and nothing here changes the deck.',
    ],
    since: 1,
  },

  // ---- 04 · Playing and tuning --------------------------------------------
  {
    id: 'log-a-game',
    chapter: '04',
    title: 'Log a game',
    route: '/decks',
    opens: "opens a deck’s Games tab",
    width: 'plate',
    caption:
      'About fifteen seconds after the game, on the deck you played: the result, the pod size, and the two or three things that decided it. The same eight things can be marked either way, as what worked or as what let you down, and everything past the result is optional: a result on its own is a game.',
    keys: [
      'pod size is on the form because a win into three opponents and a win into one are not the same evidence.',
      'the note is quoted back verbatim in the history and never summarized, which is why it asks for one line rather than a paragraph.',
      'the eight axes are the same eight on both sides, so a deck’s record can say a thing cut both ways.',
    ],
    since: 1,
  },
  {
    id: 'log-findings',
    chapter: '04',
    title: 'What the log tells you back',
    route: '/decks',
    opens: "opens a deck’s Games tab",
    width: 'plate',
    caption:
      'One game is a game you already remember, so the tab tells it back to you and stops there. From the second game it sorts what it has seen into what to fix and what to keep, and from the third the heading makes a finding. Nothing is ever a percentage.',
    keys: [
      'under three games the heading describes instead: one game is a note, two is a leaning, three is a finding.',
      'an axis marked for you as often as against you is stated rather than filed: one line, never a third column.',
    ],
    since: 1,
  },
  {
    id: 'statuses',
    chapter: '04',
    title: "What a deck’s status badge means",
    route: '/decks',
    width: 'plate',
    caption:
      'Seven statuses, and each one has a single next action. A hundred-card list you still have to buy four cards for is not Complete. Beside each badge the app draws a figure and no sentence, so the key below does the explaining.',
    keys: [
      'New and Draft belong to a deck you have never committed: New has nothing in it, Draft is that deck with cards in it. Building is a committed deck now short of its body size.',
      'Over is past the body size and Unresolved is at it, each with something to settle: too many cards, or lines we could not put a card to.',
      'To buy is the one that catches people: a full deck you cannot sleeve, because some of it is not on your shelf.',
      'Complete is the only status that means you can put the deck on a table.',
    ],
    since: 1,
  },
  {
    id: 'folders',
    chapter: '04',
    title: 'Sorting decks into folders',
    route: '/decks',
    // 'inset' at the canvas, where the figure was a legend. Mounted,
    // the shelf line is a full-width row of segments, and a ~300px column wraps it to three.
    width: 'plate',
    caption:
      'A deck sits in one folder or in none. On a wide screen every folder and its count sits above the filters, and on a phone they are one tap away. Choosing one narrows the library rather than filtering it: it spends no accent, appears in no filter chip, and is not cleared by Clear all filters. Unfiled appears once you have made your first folder.',
    keys: [],
    since: 1,
  },
  {
    id: 'resume',
    chapter: '04',
    title: 'Picking up where you left off',
    route: '/',
    // 'inset' at the canvas, where the figure was a legend. Mounted,
    // Home’s resume block is a list of full-width rows, each with a portrait, a status keyline and a count.
    width: 'plate',
    caption:
      'Home lists the four decks you touched last, newest first, and each row says which event put it there: edited, committed or played. Its art and its status badge are the same ones the library shows, so a deck looks the same wherever you meet it.',
    keys: [],
    since: 1,
  },
  {
    id: 'commitments',
    chapter: '04',
    title: 'Where your collection is committed',
    route: '/',
    width: 'inset',
    caption:
      'Three figures: how much of what you own is sleeved into a committed deck, against everything you own; how many cards you own that your committed decks ask for more copies of than you have; and what it would cost to buy everything your decks are short. The middle figure keeps its color at zero, because it is the row that would be red if it were not zero.',
    keys: [],
    since: 1,
  },
  {
    id: 'reservations',
    chapter: '04',
    title: 'Which deck gets a shared copy',
    route: '/decks',
    opens: 'opens a deck’s review page',
    // 'inset' at the canvas, where the figure was a legend. Mounted,
    // the contested row draws two deck choices side by side with their stamps.
    width: 'plate',
    caption:
      'When two decks want the same card and you own one, the deck that committed it first holds it by default, and you can override that, giving the copy to whichever deck you would rather sleeve it in. The other reads as short either way.',
    keys: [],
    since: 1,
  },
  {
    id: 'proxies',
    chapter: '04',
    title: 'Cards you are proxying',
    route: '/collection/proxies',
    // 'inset' STAYS. Hugh’s ruling, 2026-09-19: a figure that is genuinely
    // narrow sits beside its text and a full-width surface sits under it, so
    // the two-column rhythm follows what each figure IS rather than being
    // imposed. The proxy control is a tick and two lines; it fits.
    width: 'inset',
    caption:
      "Mark a card as one you are printing and it leaves the buy list without joining your collection. P is the mark, the deck’s shopping total drops by that card’s price, and set completion does not move: a proxy is a card you can play with, not a card you have.",
    keys: [],
    since: 1,
  },
  {
    id: 'themes',
    chapter: '04',
    title: 'Themes',
    route: '/',
    opens: 'in the account menu',
    width: 'plate',
    caption:
      'Six of them, each named for how it looks rather than where it came from. A theme changes the palette, never the meaning: owned is green in all six, over-committed is red in all six.',
    keys: [
      'the plane is the subtitle, not the name: you pick Neon Rain, not Kamigawa.',
      'the accent moves; the greens, ambers and reds that carry meaning stay green, amber and red.',
      'the choice is remembered in this browser, so a different device starts on the default until you pick there too.',
    ],
    since: 1,
  },
] as const;

// ---- Account menu ---------------------------------------------------------
// One row, first, above Manage account. No badge, at any width, ever — the
// sheet is the notification (the redirect, while ABOUT_SHEET_ENABLED is off).
export const aboutMenuCopy = {
  label: 'About The 99',
} as const;

// ---- The one-time sheet (About R6, STATES-about-r6.md §N, §R8) -------------
// Drawn by the shell over whatever page a document load opened, once per
// browser per version, while `ABOUT_SHEET_ENABLED` is on.
export const aboutSheetCopy = {
  heading: (n: number) => `${n} new in About`,
  // Only ever for two or more: at four titles the card lists all four (§N2).
  more: (n: number) => `and ${n} more`,
  // A non-breaking space binds "The 99" wherever the sheet prints it, so a
  // line break can never leave "99" on its own (copy review, 2026-09-25).
  firstRunHeading: 'What The\u00a099 does',
  firstRunLine:
    'One page that explains the marks, figures and statuses you’ll meet, and where each one lives.',
  show: 'Show me',
  later: 'Later',
  where: 'Always in your account menu, under About The\u00a099.',
  regionLabel: 'New in About',
  regionLabelFirstRun: 'About The\u00a099',
} as const;
