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
// Voice: Kitchen Table. An entry explains a thing the app already does, to a
// player who has met it and wants to know what it meant.
//
// RULES, enforced in review:
//   1. `caption` and `keys` are THIS page's prose and may be written here.
//   2. Every string drawn INSIDE a specimen comes from that surface's own copy
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

export const ABOUT_VERSION = 1;

export type AboutChapter = '01' | '02' | '03' | '04';
export type AboutWidth = 'inset' | 'plate';

export interface AboutEntry {
  id: string;
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
    'Everything here is scored against the cards you actually own. Four chapters, in the order you would use them — each entry shows the thing it is describing and links to where it lives.',

  contentsLabel: 'Contents',
  newBadge: 'NEW',
  newBadgeSr: 'New in this version',
  newSinceEyebrow: (n: number) =>
    n === 1 ? '1 new since you were last here' : `${n} new since you were last here`,
  newInChapter: (n: number) => `${n} new`,

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
      'Search by name, narrow by colour, type, set or availability, and read the result as a grid or as rows. Every narrowing is a chip you can see and remove, and the count above the results always says how much of the collection you are looking at.',
    keys: [
      'a chip per narrowing, each removable on its own, and one link that clears the lot. Nothing filters invisibly.',
      'By set is a grouping, not a filter — it reorders what is shown and never changes how much is shown.',
      'grid or rows is a reading choice. Both it and your filters are still here when you come back.',
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
      'An import replaces your collection, so it can change what your decks can supply. The summary says what moved and which decks felt it. No deck is edited — a deck keeps every card it had; what changes is whether you own it.',
    keys: [
      'before and after, both printed, so the change is checkable rather than asserted.',
      "a deck's line is the availability it gained or lost, in the same marks the deck itself draws — and a deck whose cards came free carries no mark, because free carries nothing anywhere.",
      'decks nothing happened to are counted, not listed — the summary is what changed, not an inventory.',
    ],
    // ⚠ R4: strings inside this figure are FIXTURES, not read from source.
    // #639/#643 landed after the last read of main; the structure is the
    // entry's subject and holds, the vocabulary wants one pass against
    // copy/collection-replace.ts before build. See READINESS-r4.md.
    //
    // One structural decision inside it, not a fixture: the `freed up` row
    // carries NO diamond. `3 cards freed up` means those copies became free,
    // and free carries nothing anywhere in the app — the availability entry
    // two above this one teaches exactly that. A solid diamond there would be
    // the `none free` mark on a row announcing the opposite.
    since: 1,
  },
  {
    id: 'import-issues',
    chapter: '01',
    title: 'Rows the import could not place',
    route: '/collection/replace',
    opens: 'opens the issue inspector',
    width: 'inset',
    caption:
      'Every line we could not put a card to, with the reason beside it. They are not errors and not a buy list — a misspelling and a printing we do not stock read differently and are labelled differently. A pasted list carries no set or collector number, which is why a pasted collection cannot drive set completion.',
    keys: [],
    since: 1,
  },
  {
    id: 'availability',
    chapter: '01',
    title: 'Free, in a brew, committed, over-committed',
    route: '/collection?avail=inuse,over',
    width: 'plate',
    caption:
      'One copy cannot be in two committed decks at once. Instead of a status word, a card carries a diamond that says how contested it is — and a card that is free carries nothing at all.',
    keys: [
      'free — you own it and nothing has claimed it. No diamond at all, which is the commonest state in the app.',
      'in a brew — a deck you have never committed wants it. The claim is real but not binding, and it is the state a reader is least likely to guess.',
      'none free — a committed deck holds every copy. The deck that sleeved it first keeps it.',
      'short 2 — more decks want it than you own. The last row is different again: a card you never owned at all.',
    ],
    since: 1,
  },
  {
    id: 'sets',
    chapter: '01',
    title: 'Set completion — what you are missing',
    route: '/collection/sets',
    width: 'plate',
    caption:
      'Every card in a set in collector order, with the ones you do not own dashed and dimmed rather than hidden. The base run is counted apart from the extras, so a set reads as complete when you have the set, not when you have every alternate printing of it.',
    keys: [
      'missing — dashed edge, dimmed art, and a price an owned cell never carries. Absent, not disabled: it still opens.',
      'the cost covers the cards ManaPool actually stocks. One that has never been stocked is named and left out rather than priced at zero.',
      'Base run is the set; extras are counted apart and sit below. That is why 162 of 208 and 321 cells are both true.',
    ],
    since: 1,
  },
  {
    id: 'buy-tag',
    chapter: '01',
    title: 'What a card costs to buy',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'inset',
    caption:
      'Prices come from ManaPool and refresh weekly. The tag has four states and they are different claims: a figure, a foil-only figure, sold out — stocked but unavailable today — and no figure at all, which means the feed has never carried that printing. None of those is free.',
    keys: [],
    since: 1,
  },
  {
    id: 'card-detail',
    chapter: '01',
    title: 'The card itself — printings, art, both faces',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'inset',
    caption:
      'Every printing of a card, its art at full size, and the back of a double-faced card. The filled diamond is the printing you own — the same shape, hollow, is one you do not. It opens from a card anywhere in the app, not only here.',
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
      'Two commanders you could build today, picked from the top nine by fit and rotated daily — so the pair changes while the ranking behind it does not. Each card says how much of your collection fits and how much of that is already sleeved elsewhere.',
    keys: [
      'the pair rotates daily out of the top nine by fit — a rank cut, never a score cut.',
      'cards that fit, then how many are already in a committed deck. The second clause is absent at zero.',
      'the floor is the lowest score actually shown, so the count is checkable against the lane.',
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
      "Three parts, added: how much of your collection is even legal here, whether you own enough ramp, draw, removal and wipes to field a deck at all, and how much of this commander's most-played list you already have. The bar is those three in order, and the key on the page is the same words you are reading now.",
    keys: [
      'the denominator is not always 100: where synergy could not be measured the score is out of 40, and it is never rescaled.',
      'the sum is printed, so the three parts can be checked against the headline figure.',
      'two scores are only comparable within one collection: the whole reading is about your shelf.',
    ],
    since: 1,
  },
  {
    id: 'commander-lane',
    chapter: '02',
    title: 'Commanders you can build today',
    route: '/commanders',
    width: 'inset',
    caption:
      "Every commander you own and have not built, ranked by fit. Build from chooses the pool the scores are read against: All my cards, or Free cards only — not spoken for by a deck you have already built. Where we could not read a commander's most-played list, the bar has two segments instead of three and the denominator drops to 40.",
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
      'Commanders you do not own, ranked by what your collection would support if you bought one card. Discover prints counts, never a score — how many of its most-played cards you already own, how many decks are tracked, and how many of its top cards would be new to you.',
    keys: [
      'five orders, and two of them — Best fit and Something new — change which commanders the list holds, not just their sequence.',
      'the headline count is how much of its most-played list you already own, out of however many were measurable.',
      '“new to you” is the acquisition argument: cards this commander wants that nothing you own already covers.',
    ],
    since: 1,
  },
  {
    id: 'role-coverage',
    chapter: '02',
    title: 'Why this commander, and what the deck would be made of',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'inset',
    caption:
      'The cards you already own that would go in, grouped by the job they do, and how each role measures against its baseline — so a 1/3 on board wipes tells you what to fix before you commit to building anything. Each group can be read in the shipped order or with free cards first, which puts the copies no committed deck is holding at the top.',
    keys: [],
    since: 1,
  },
  {
    id: 'partners',
    chapter: '02',
    title: 'Partners',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'inset',
    caption:
      "Commanders that pair, and what the pair's wider colour identity opens up in your collection. A pair deck is still a hundred cards, so its 99 is 98 — every count and progress bar in the app measures it against that.",
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
      'One page per deck: the commander, the status and how far along it is, then the list itself. Four tabs sit under the header — the deck, cards worth considering, the games you have played with it, and its committed versions — so everything about a deck lives on the deck.',
    keys: [
      'the badge and the bar are the same pair the library shows, so a deck reads the same from either direction.',
      'the tabs carry counts, which is how you can tell a deck has never been played without opening it.',
      'Consider is the other half of the recommendation: cards this commander wants that are not in the list yet.',
    ],
    since: 1,
  },
  {
    id: 'auto-fill',
    chapter: '03',
    title: 'How much we fill in for you',
    route: '/decks/new',
    width: 'inset',
    caption:
      'Pick a commander and we assemble as much of the 99 as your collection supports — typically most of it, never all of it. The rest is yours to fill, before or after you sleeve it up: Top off fills the remaining slots from what you own in one pass, and anything auto-added can be cleared in one action if you would rather start from your own picks.',
    keys: [],
    since: 1,
  },
  {
    id: 'decklist-marks',
    chapter: '03',
    title: 'Every mark on a decklist',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'A decklist is rows, and each row answers four questions from left to right: do you own it, what is it, how many does the deck want, and is anything standing in the way. A row with nothing in the way carries no mark at all, so the marks you do see are all things to deal with.',
    keys: [
      'a filled green dot is a card you own; a dashed hollow one is a card you do not. Same shape, same place, every list in the app.',
      'the circled figure is how many copies this deck wants, and it is there whether that is one or four.',
      'one mark, and only when there is something to say: `1 in a brew`, `none free`, `short N`, or `$` for a card you would have to buy.',
      'the edge is the row’s own state — accent where you are working, and the over-committed colour when the deck wants more than you own.',
    ],
    since: 1,
  },
  {
    id: 'roles',
    chapter: '03',
    title: 'Why a card is filed under Ramp',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'A decklist is read by the job a card does, not by type line, because that is how a deck is short: eleven creatures is not a problem, one board wipe is. The recommended mix is EDHREC’s averages, not a rule — a role over its number is fine and says so by saying nothing.',
    keys: [
      'the second figure is the recommendation, so 5 wipes against 3 is a surplus rather than an error. Nothing is capped.',
      'a short role is the one thing here that names what to do next, and `consider` goes straight to cards that would fill it.',
    ],
    since: 1,
  },
  {
    id: 'add-cards',
    chapter: '03',
    title: 'Adding cards',
    route: '/decks',
    opens: "opens a deck's Add panel",
    width: 'inset',
    caption:
      'Search what you own or all of Magic, with the ownership dot on every result, and add without leaving the list you are looking at. A card another committed deck is holding still adds — it arrives carrying the mark that says so, rather than being refused.',
    keys: [],
    since: 1,
  },
  {
    id: 'undo-removal',
    chapter: '03',
    title: 'Undoing a removal',
    route: '/decks',
    opens: 'opens a deck',
    width: 'inset',
    // R4: the specimen is the DECK PAGE control — `Rhystic Study removed` +
    // `Undo` (decks-builder.ts, undo.removed / undo.action). The review
    // screen's `Put back` (deck-versioning.ts:249) is a second door and is
    // named in the caption rather than drawn. R3 drew one wearing the other.
    caption:
      "Every removal can be undone from where it happened, with the card named. The review screen carries the same undo on a cut row, where it reads Put back. Putting a card back also puts back what it cost — the deck's count, its shopping total and any claim it had on your collection all return together, so undo never leaves the figures half-changed.",
    keys: [],
    since: 1,
  },
  {
    id: 'deck-import',
    chapter: '03',
    title: 'Bring a deck over, or update one',
    route: '/decks/import',
    width: 'inset',
    // R4: there is NO link mode. copy/deck-import.ts:26-30 — "that mode does
    // not exist and is not being built (#282)". The doors are `Paste a list`
    // and `Upload a file` (:37-40); the phone line is "Paste it or drop a
    // file". Import reads a Moxfield CSV *export*, which is the collection
    // entry's claim, not this one's.
    caption:
      'Paste a list or upload a file. The same route updates a deck you already have — there is no link mode, from Moxfield or anywhere else. A line we cannot put a card to does not stop the import — the deck is still made, the line is flagged inside it, and it counts toward the 99 but not toward what is built.',
    keys: [],
    since: 1,
  },
  {
    id: 'versions',
    chapter: '03',
    title: 'Drafts, committing, and versions',
    route: '/decks',
    opens: "opens a deck's Versions tab",
    width: 'plate',
    caption:
      'A deck has a committed list and a draft you are working on. Every add and cut sits in the draft until you commit it, and committing cuts a version you can read back. Cards staged in a draft already count against your collection, which is why a draft can make another deck read short 1.',
    keys: [
      'the draft is reviewable before it lands: every add and cut beside the committed list, with nothing counted twice.',
      'a version carries its own record, so you can see whether a change helped rather than only that it happened.',
    ],
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
      'The whole 99 as text a deckbuilding site will read, or just the cards you do not own. Buying is a link out, not a checkout — we hand Mana Pool the list and they take it from there, in a new tab, with nothing of yours attached.',
    keys: [
      'the Shopping list tab is the cards you do not own, counted on the pill — the same set the library-wide roll-up totals.',
      "the link opens in a new tab and carries the list, nothing else. A card's own link lands on every printing, because the app recommends a card rather than a printing.",
      'Copy to clipboard reads Copied ✓ for a second and a half, then returns. It and Download .txt are the same list in the form each site wants, and nothing here changes the deck.',
    ],
    since: 1,
  },
  {
    id: 'shopping',
    chapter: '03',
    title: 'What you would need to buy',
    route: '/decks',
    opens: 'opens the shopping roll-up',
    width: 'inset',
    caption:
      'Every card your decks want and you cannot supply, priced and grouped, across the whole library rather than one deck at a time. A card you own can be on this list: if an older committed deck is already holding your only copy, the newer deck has to buy one. Unpriced copies still count in the tally and add nothing to the total.',
    keys: [],
    since: 1,
  },

  // ---- 04 · Playing and tuning --------------------------------------------
  {
    id: 'log-a-game',
    chapter: '04',
    title: 'Log a game',
    route: '/decks',
    opens: "opens a deck's Games tab",
    width: 'plate',
    caption:
      'About fifteen seconds after the game, on the deck you played: the result, the pod size, and the two or three things that decided it. The same eight things can be marked either way — what worked or what let you down — and all of it is optional: a result on its own is a game.',
    keys: [
      'pod size is on the form because a win into three opponents and a win into one are not the same evidence.',
      'the note is quoted back verbatim in the history and never summarised, which is why it asks for one line rather than a paragraph.',
      'the eight axes are the same eight on both sides, so a deck’s record can say a thing cut both ways.',
    ],
    since: 1,
  },
  {
    id: 'log-findings',
    chapter: '04',
    title: 'What the log tells you back',
    route: '/decks',
    opens: "opens a deck's Games tab",
    width: 'plate',
    caption:
      'One game you already remember. The third is where this earns its keep: at three games the tab stops describing and starts making a finding, sorted into what to fix and what to keep. Every figure carries its denominator — no percentages, at any number of games.',
    keys: [
      'under three games the heading describes instead: one game is a note, two is a leaning, three is a finding.',
      'anything that has cut both ways is stated rather than filed — one line, never a third column.',
    ],
    since: 1,
  },
  {
    id: 'statuses',
    chapter: '04',
    title: "What a deck's status badge means",
    route: '/decks',
    width: 'plate',
    caption:
      'Six statuses, and each one has a single next action. Exactly one of them means you can put the deck on a table — a hundred-card list you still have to buy four cards for is not Complete. Beside each badge the app draws one figure and no sentence, so the explanations sit in the key below where they are honestly this page’s own words.',
    keys: [
      'Draft and Building are not legal lists yet, and the figure is how far off. Draft has nothing in it, so it shows when it was made instead.',
      'Over and Unresolved are legal-sized lists with something to settle: too many cards, or lines we could not put a card to.',
      'To buy is the one that catches people — a finished 99 you cannot sleeve, because some of it is not on your shelf.',
      'Complete is the only status that means you can put the deck on a table. Each badge carries one figure and no sentence.',
    ],
    since: 1,
  },
  {
    id: 'folders',
    chapter: '04',
    title: 'Sorting decks into folders',
    route: '/decks',
    width: 'inset',
    caption:
      'A deck sits on one folder or on none. Every folder and its count is on screen without opening anything, and choosing one narrows the library rather than filtering it — it spends no accent, appears in no filter chip, and is not cleared by Clear all filters. Unfiled appears once you have made your first folder.',
    keys: [],
    since: 1,
  },
  {
    id: 'resume',
    chapter: '04',
    title: 'Picking up where you left off',
    route: '/',
    width: 'inset',
    caption:
      'Home leads with the decks you touched last, newest first, and each row says which event put it there — edited, committed or played. The keyline on the left is the deck’s status in the same six colours as its badge.',
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
      'Three figures, each with its denominator: how much of what you own is sleeved into a committed deck, how many cards two decks are both counting on, and what the whole library would cost to finish. The middle figure keeps its colour at zero — it is the row that would be red if it were not nought.',
    keys: [],
    since: 1,
  },
  {
    id: 'reservations',
    chapter: '04',
    title: 'Which deck gets a shared copy',
    route: '/decks',
    opens: 'opens a deck',
    width: 'inset',
    caption:
      'When two decks want the same card and you own one, the committed deck holds it and the other reads as short. Committing a draft can therefore move a card away from a deck that had it, which is why the diamond is on the card and not on the deck.',
    keys: [],
    since: 1,
  },
  {
    id: 'proxies',
    chapter: '04',
    title: 'Cards you are proxying',
    route: '/decks',
    opens: 'opens a deck',
    width: 'inset',
    caption:
      "Mark a card as one you are printing and it leaves the buy list without joining your collection. P is the mark, the deck's shopping total drops by that card's price, and set completion does not move — a proxy is a card you can play with, not a card you have.",
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
      'Six of them, each named for how it looks rather than where it came from — Low Sun, Neon Rain, Canopy, Oil Haze, Witching Hour, First Frost. A theme changes the palette, never the meaning: owned is green in all six, over-committed is red in all six.',
    keys: [
      'the plane is the subtitle, not the name — you pick Neon Rain, not Kamigawa.',
      'the accent moves; the greens, ambers and reds that carry meaning do not.',
      'your choice is remembered per account, so it follows you between devices rather than living in one browser.',
    ],
    since: 1,
  },
] as const;

// ---- Account menu ---------------------------------------------------------
// One row, first, above Manage account. No badge, at any width, ever — the
// redirect is the notification.
export const aboutMenuCopy = {
  label: 'About The 99',
} as const;
