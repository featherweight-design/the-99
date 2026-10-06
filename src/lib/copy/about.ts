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
// The Analysis tab's pair, 2026-09-28 (`design_handoff_the99_analysis_tab/ABOUT-entry.md`):
// `deck-analysis` and `card-marks`, both tied to ANALYSIS_TAB_ENABLED and both `since: 9`
// rather than a bump. A bump redirects every account below the version while the sheet is
// off (`proxy.ts`), and a switched entry is seen by its id, so the switch is what announces
// them. `deck-page` is unedited for the same reason: it has no switch, and with the tab off
// the deck page draws four tabs, so the fifth is named in `deck-analysis` instead.
//
// `suggested-changes`, 2026-10-05 (`design_handoff_the99_deck_description/ABOUT-entry.md`,
// ruling 7): the one entry that overrides the rule directly above it. Hugh ruled the bump
// (9 -> 10) regardless of the tab's switch, on the condition engineering confirm
// ANALYSIS_TAB_ENABLED is on everywhere this ships, "or drop switch" (the handoff's own
// words). Confirmed via `vercel env pull`: `"true"` on staging, `"false"` on production — not
// everywhere — so this entry carries NO `switch` field. It is the one entry in this file drawn
// unconditionally for a capability a production reader without the tab cannot yet reach; that
// is the handoff's own authorized fallback, not an oversight.
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

export const ABOUT_VERSION = 11;

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
  | 'CHANGE_COMMANDER_ENABLED'
  | 'ANALYSIS_TAB_ENABLED'
  | 'HOW_IT_WORKS_ENABLED';

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
  // Hugh's own story (option A, 2026-10-06): why the app exists, what it does and who it's for.
  // Paragraphs split on a blank line, as an entry's caption does (`EntryCaption`).
  pageIntro:
    'I built The 99 because nothing else checked every box for deck building, least of all around my collection. I have thousands of cards, and most of them were hiding in a box.' +
    '\n\n' +
    'So the app starts from what you own. It finds the cards you forgot you had and builds decks from them before it asks you to buy anything.' +
    '\n\n' +
    'It’s for me and my friends, with the features we kept asking for and couldn’t find anywhere else. A way to dive deeper into a hobby we all love.',
  // Appended to the intro only while ABOUT_SHEET_ENABLED is on: with it off a
  // new version still redirects here, and there is no note to speak of.
  pageIntroSheet: 'When something new lands, a short note tells you once, and this page opens on what’s new.',

  contentsLabel: 'Contents',
  newBadge: 'NEW',
  newBadgeSr: 'New in this version',
  newSinceEyebrow: (n: number) =>
    n === 1 ? '1 new since your last visit' : `${n} new since your last visit`,
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
    noneNote: 'Search reads entry titles only.',
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
      title: 'Your Collection',
      sub: 'Every score in the app starts from the cards you own, so this is where we start too.',
    },
    '02': {
      title: 'Finding a commander',
      sub: 'The commanders your Collection already supports, and the ones it would the moment you bought the commander.',
    },
    '03': {
      title: 'Building the 99',
      sub: 'The longest chapter, in the order a deck gets built.',
    },
    '04': {
      title: 'Playing and tuning',
      sub: 'What happens once a deck hits the table, from logging a game to tuning the list. Home picks up where you left off.',
    },
  },
} as const;

export const aboutEntries: readonly AboutEntry[] = [
  // ---- 01 · Your collection ------------------------------------------------
  {
    id: 'browse',
    chapter: '01',
    title: 'Finding a card in your Collection',
    route: '/collection',
    width: 'plate',
    caption:
      'Search your Collection by name, then narrow it down by color identity, type, set or availability.\n\nEach filter you set turns into a chip above the results. Press a chip to drop it, or Clear all filters to drop the lot. Your sort stays where you left it.\n\nThe count above the results says how many cards made the cut, and you can read them as a grid or as rows. Handy for settling “do I own another Swords?” before the trade binder comes out.',
    keys: [
      'Cards, Sets and Proxies share the strip at the top. Sets shows every set you hold cards from, newest first, with how much of each you own.',
      'Every filter you set shows up as a chip. Drop them one at a time, or clear the lot with the link at the end.',
      'Grid or rows is your call, and we remember it. Filters live in the page’s address instead, so a shared link carries them and a fresh visit starts clean.',
    ],
    since: 1,
  },
  {
    id: 'import',
    chapter: '01',
    title: 'Importing your Collection',
    route: '/collection/replace',
    width: 'inset',
    caption:
      'Replace collection takes any of these:\n\n- a CSV from Moxfield, Archidekt, Deckbox or ManaBox\n- any plain CSV with Name and Quantity columns\n- a list you paste in\n\nWe read how many copies you own, plus the set, collector number and finish wherever the file has them.\n\nAn import replaces your whole Collection. You see the count now and after, and nothing is written until you confirm.',
    keys: [],
    since: 1,
  },
  {
    id: 'post-import',
    chapter: '01',
    title: 'What a replace changed for your decks',
    route: '/collection/replace',
    opens: 'opens the import summary',
    width: 'plate',
    caption:
      'A replace can change which cards your decks still need to buy, and the summary is the receipt. It shows your count before and after, then lists the cards your decks were counting on, one row per card and the deck it was for.\n\nYour deck lists stay exactly as they were. What moves is whether you own the cards in them.',
    keys: [
      'Your count after the replace, then the count before it with what arrived and what left, so you can check the sums yourself.',
      'Each row is one card and the deck that wanted it. A card two decks are fighting over gets one row, with its decks under it, oldest claim first.',
      'Three sections sort the rows: No longer to buy, Still to buy and Still short.',
      'The one choice on the page. When two committed decks want the copy that arrived, the deck that committed it first gets it, unless you pick the other.',
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
    title: 'Rows an import couldn’t place',
    route: '/collection/replace',
    opens: 'opens the issue inspector',
    // A ROW figure, so it takes the full plate. The route’s own issue rows carry
    // a name, a line number, a set code and a reason on one line; at the inset’s
    // 300px cap `no Oracle match` wrapped and the copy count collided with it —
    // a figure demonstrating the route’s row while showing a shape the route
    // never produces.
    width: 'plate',
    caption:
      'Every line we couldn’t put a card to, with the reason beside it. Import issues sorts them into two tabs:\n\n- Unmatched: names we couldn’t find\n- Parse errors: lines we couldn’t read\n\nEvery other row still replaces your Collection, and neither tab is a buy list.\n\nA pasted list carries no set or collector number, so a pasted Collection can’t fill in set completion.',
    keys: [],
    since: 1,
  },
  {
    id: 'availability',
    chapter: '01',
    title: 'Which copies your decks are holding',
    route: '/collection?avail=inuse,over',
    width: 'plate',
    caption:
      'One copy can’t sit in two committed decks at once. So each card says in a few words how contested it is, and a card with a spare copy that no draft wants says nothing at all.\n\nSay you own one Sol Ring and three committed decks run it. It reads short 2. The deck that committed it first gets your copy, unless you hand it to another.\n\nSol Ring: the one card every deck wants and every Collection is short of.',
    keys: [
      'free: you own a spare copy and no draft wants it, so the card stays quiet. Most of your Collection looks like this.',
      'in a draft: a deck you haven’t committed yet wants a copy, and it wears the Draft badge on Decks. Any committed deck still gets first call on that copy.',
      'none free: your committed decks are holding every copy you own.',
      'short 2: your committed decks want two more copies than you own. The deck that committed it first gets yours, and you can hand it to another. Own none at all and a decklist shows the buy mark instead.',
    ],
    since: 1,
  },
  {
    id: 'sets',
    chapter: '01',
    title: 'What a set still needs',
    route: '/collection/sets',
    width: 'plate',
    caption:
      'Open a set from Sets and every card sits in collector order. The ones you don’t own are dashed and dimmed, with their price beside them.\n\nThe Checklist is the set’s own numbered run, and owning it is what makes the set read complete. Showcase, borderless and promo extras are counted below it. Chasing those is extra credit.\n\nA set with no numbered run, like a promo set, puts every printing we’ve indexed on its Checklist.',
    keys: [
      'Only a card you’re missing carries a price, and it opens like any other card.',
      'The cost to finish adds up what ManaPool has in stock. Cards it’s sold out of, or has never stocked, get a count of their own under it and stay out of the total.',
      'The completion figure counts the Checklist: the set’s own numbered run, or every printing we’ve indexed when it has no run. Extras sit below and count apart, which is why the figure and the cells on screen can disagree.',
      'Missing and Owned split the set by what you own, one view at a time. Sort runs by collector number, the default, or by price, dearest first. Flip the price order and cards with no price still sit at the end.',
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
      'Prices come from ManaPool and refresh daily. A buy tag shows one of four things:\n\n- a price\n- a foil-only price, like $2.10 foil\n- sold out, when ManaPool has stocked that printing but has none today\n- a bare buy, when the feed has no price for that printing at all',
    keys: [],
    since: 1,
  },
  {
    id: 'card-detail',
    chapter: '01',
    title: 'Opening a card’s details',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'inset',
    caption:
      'Press a card anywhere in the app and its card details open, with the art up close. A double-faced card turns over to show its back, no unsleeving required.\n\nOwn more than one printing? You can pick one for the card, and it’s shown everywhere in your Collection. Whenever no pick of yours applies, including one whose copy you no longer own, the printing on screen is marked Shown now.\n\nThe cost beside the name uses the real mana symbols. A card with two costs, like a split card, an adventure or a card with a castable back, shows both.\n\nOpened from a list, it pages through that list:\n\n- on a computer, with the arrow keys or the cards beside it\n- on a phone, with a swipe\n\nOpened from a sheet or a combo partner, the pill at the top names where you came from and takes you back.',
    keys: [],
    since: 1,
  },

  // ---- 02 · Finding a commander -------------------------------------------
  {
    id: 'ready-to-build',
    chapter: '02',
    title: 'Two commanders to build, every day',
    route: '/',
    width: 'plate',
    caption:
      'Ready to build, on Home, deals you two commanders a day. We rank every commander in your Collection that leads no deck of yours yet and keep the top 28 by fit. Each day’s pair comes from those 28.\n\nEach card says how many of your cards fit its colors, and how many of those are in use, every copy held by your committed decks.\n\nEither one beats unboxing another precon.',
    keys: [
      'The 28 are the top of your ranking. As your Collection grows, the score it takes to make the cut moves with it.',
      'Each card shows how many of your cards fit, then how many of those your committed decks already hold. When that second figure is zero, it’s left off.',
      'A new pair arrives at midnight UTC, never repeating yesterday’s, so all 28 come around within two weeks. One of each pair comes from the half whose themes your decks play least.',
      'The line under the pair quotes the 28th commander’s own score, so you can check it against the Commanders lane.',
    ],
    since: 1,
  },
  {
    id: 'fit-score',
    chapter: '02',
    title: 'How a fit score adds up',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'plate',
    caption:
      'We score a commander out of 100 against your Collection, in three parts added together:\n\n- Pool, worth 15, counts your cards legal in its colors and fills at 200\n- Roles, worth 25, checks you own enough ramp, draw, removal and wipes to build at all\n- Synergy, worth 60, is how much of its most-played list you already have\n\nThe bar draws them in that order. It measures your Collection, so it stays out of the power-level argument.',
    keys: [
      'Where we couldn’t read a commander’s most-played list, the score is out of 40, and we never stretch it to look like a 100.',
      'The three parts sit beside their sum, so you can check our math.',
      'A score is about your Collection. A friend’s score for the same commander is about theirs.',
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
      'Every commander in your Collection that leads no deck of yours yet, ranked by fit.\n\nBuild from picks which of your cards the scores count:\n\n- All my cards\n- Free cards only: the ones with at least one copy no committed deck is holding\n\nFree cards only also sets aside a commander when every copy you own is sleeved into a committed deck.\n\nPrinted in keeps the commanders printed in the sets you pick, by any printing, including ones you don’t own. Where we couldn’t read a commander’s most-played list, the bar has two segments and the score is out of 40.',
    keys: [],
    since: 1,
  },
  {
    id: 'discover',
    chapter: '02',
    title: 'Commanders worth buying, on Discover',
    route: '/discover',
    width: 'plate',
    caption:
      'Discover lists the commanders outside your Collection and your decks, ranked by how many cards from each one’s most-played list you already own.\n\nEach row scores fit the same way the Commanders lane does, and adds what the commander costs. The line under it names themes it plays that none of your decks do, or its top three play styles when your decks already play them all.\n\nPick sets under Printed in and only commanders printed in them stay. Popularity puts the most-tracked first, which is a fair map of what your playgroup already has opinions about.',
    keys: [
      'Five orders, and Something new is the one that changes who shows up: it leaves out any commander with less than 30% of its most-played list in your Collection.',
      'Best fit, the default, counts your whole Collection. Buy the commander and every card you own is fair game.',
      'Each order names what it sorts on, right in the menu. For Popularity, that’s most decks tracked first.',
    ],
    since: 1,
  },
  {
    id: 'help-me-choose',
    chapter: '02',
    title: 'Finding a commander with Help me choose',
    route: '/decks/new/choose',
    width: 'plate',
    switch: 'HELP_ME_CHOOSE_ENABLED',
    caption:
      // Audit H3: with no theme and no card the list IS ordered by ownership. H1: the hand-off
      // shipped in #1011, and Create is what fills the deck, not the pick.
      'Tell Help me choose about the deck you want and it finds commanders to lead it. Answer as much or as little as you like:\n\n- colors\n- themes, all of them or any one\n- the sets it was printed in\n- a budget\n- a bracket\n\nA sentence in your own words is matched for free, and a card named there becomes the card to build around. Look deeper reads everything you wrote, and uses a credit when it comes back with at least one answer.\n\nEvery answer narrows which commanders show up, owned or not. Your themes and card also set the order. With neither, the results are ordered by how many of their cards you already have.\n\nPick a commander and your answers carry to a new deck, and Create deck fills the 99 under them, only from your Collection if you ask. When fewer than four fit, the page offers answers to loosen.',
    keys: [
      // Audit H4: SETS RANK is drawn only when a row has more than one figure.
      'With a theme or a card, each figure is the share of that commander’s decks tagged with your theme or running your card. Its weakest figure sets its place, marked SETS RANK when there’s more than one. Ask for any one of several themes and only its best theme counts.',
      // Audit H5. The owned-order exception is said once, in the caption, so this line drops the
      // "never orders it" that the exception made false.
      'Beside the fit, every row shows what you own: the commander itself, how much of its 99, and roughly what the rest would cost.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'role-coverage',
    chapter: '02',
    title: 'Which roles your cards already fill',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'inset',
    caption:
      'Role Coverage sorts the cards you own that would go in this deck by the job they do: Ramp, Card Draw, Removal and Board Wipes. Each group sets what you have against what this commander’s decks run.\n\nBoard Wipes reading 1 owned, 2 short of the 3 its decks run tells you what to fix before you start building.\n\nRead a group Most played first, or by Availability, in this order:\n\n- free copies\n- copies a draft wants\n- copies in use\n- anything over-committed\n\nRamp short of its target is where mana screw starts.',
    keys: [],
    since: 1,
  },
  {
    id: 'commander-availability',
    chapter: '02',
    title: 'When a card you own isn’t free',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'plate',
    caption:
      'Owning a card and being free to use it are two different things, as anyone who has raided one deck to build another knows.\n\nThe note beside a card you own says what’s holding it: 1 in a draft, none free, or short by however many copies your committed decks want past what you own. A card with a spare copy nothing wants carries no note.',
    keys: [
      'The owned mark says you own the card, and that’s all it says. It looks the same whether or not a deck is holding your copy.',
      'The note counts copies. Open the card to see which decks are holding them.',
      'Cards you’d have to buy show their price right in the list, before you plan a deck around them.',
    ],
    since: 3,
  },
  {
    id: 'partners',
    chapter: '02',
    title: 'Building with two commanders',
    // The figure is the import proposal (`PartnerSlot`, state C), which only /decks/import
    // draws: Proposed is the import picker's label. /decks/new offers Add a partner alone.
    route: '/decks/import',
    opens: 'opens the commander picker after a paste',
    width: 'inset',
    caption:
      'Partner, Partner with and Friends forever all put a second commander at the head of the deck.\n\nBring a deck over from a pasted list and the second legend you pick from it arrives marked Proposed, with Change and Remove beside it. Start a deck from scratch and Add a partner offers the commanders you own that can pair with the first.\n\nTwo commanders take two of the hundred cards, so a pair’s 99 is 98, and every count and progress bar in the app measures against that. Two commanders also give the rule zero chat twice as much to talk about.',
    keys: [],
    since: 1,
  },

  // ---- 03 · Building the 99 -----------------------------------------------
  {
    id: 'deck-page',
    chapter: '03',
    title: 'Everything about a deck, on one page',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'Every deck gets a page of its own. The header carries the commander, the deck’s status and a bar for how far along it is.\n\nUnder it sit the tabs, among them Your deck, Consider, Games and, once you’ve committed the deck, Versions.\n\nConsider is the commander’s wish list: cards it wants that aren’t in the list yet, from your Collection first, then the top picks you’d have to buy. Think of it as your commander dropping hints.',
    keys: [
      'The status badge and the progress bar match the deck’s tile on Decks, so a deck looks the same from either side.',
      'Games picks up a count with the first game you log against the deck.',
      'Consider holds the cards your commander wants that the list doesn’t run yet.',
    ],
    since: 1,
  },
  {
    id: 'deck-analysis',
    chapter: '03',
    title: 'Which bracket this deck plays at',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    switch: 'ANALYSIS_TAB_ENABLED',
    caption:
      'Press Analyze on a full deck’s Analysis tab, second in the deck’s row of tabs, and we name the bracket your cards permit. We read the whole list against the Commander Format Panel’s bracket rules.\n\nAt either end of the scale, the brackets turn on intent, so your cards can permit two. Say you built a Squirrel deck with every Squirrel you love and no Game Changers, mass land denial, extra turns or two-card combos. Its cards pass at Exhibition and at Core.\n\n- If the theme came first, it’s Exhibition.\n- If you brought it to hold its own against precons, it’s Core.\n\nThe top end works the same way: a list past Upgraded’s limits is Optimized, or cEDH if you tuned it for the competitive metagame. Only you know which, so you pick. Arguing about it at the table stays optional.\n\nEvery count opens to the cards behind it, and the lowest rung of the climb names what would have to go to drop one bracket.\n\nThe bracket then shows on the deck’s header, its tile on Decks and its row on Home, and the header’s chip opens the tab. A committed version that reads differently from the last one names both readings. The tab also holds the Overview and Suggested changes.',
    keys: [
      'A range means your cards fit two brackets. The chips under it ask which one you meant, and they’re the only question on the page.',
      'The climb reads straight down. In the findings, every count with cards behind it opens to show them.',
      'The date line says which reading you’re looking at. Edit the deck and it adds “before your changes”, the header and the tile keep the last bracket, and the tab offers Re-analyze. Whether the edit moved anything is Re-analyze’s call.',
      'The line under the bracket says what separates the two. When a two-card combo settled a single bracket, a second line names it and how the deck gets both halves, and “see the reasoning” shows what finds each one.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'auto-fill',
    chapter: '03',
    title: 'How much of the 99 we build',
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
      'Pick a commander and we build the 99 for you.\n\n- Up to ten staples go in first, the nonland cards most decks in its colors run, and staple lands get first pick when the lands go in.\n- The rest comes from your Collection.\n- Where your Collection runs short, we add the cards that commander’s decks play most, as cards to buy.\n\nCall it a precon built from your own binder.\n\nAny slots still open are yours. On a deck four cards short, Choose the last 4 opens candidates ranked by synergy for this commander, with the ones you can sleeve already ticked. Nothing goes in until you say so.\n\nEvery card we added carries the auto tag. Rather start from your own picks? Clear all auto takes out every one you haven’t locked, in one press.',
    keys: [],
    since: 1,
  },
  {
    id: 'decklist-marks',
    chapter: '03',
    title: 'Reading a decklist row',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'Each row answers four questions, left to right:\n\n- Is it in your Collection?\n- What is it?\n- How many copies does the deck want?\n- Is anything in the way?\n\nMarks after the name show what a bracket counts: a Game Changer, mass land denial, extra turns or a tutor. Demonic Tutor carries two, since it’s a tutor and it’s on WotC’s Game Changer list.\n\nExhibition and Core allow no Game Changers and Upgraded allows three, so those are the cards to count before you sit down. Better to count them now than during the rule zero chat.\n\nAn obstacle mark appears only when something stands in the way. The auto tag means we picked the card for you.',
    keys: [
      'Filled and green means it’s in your Collection. Hollow and dashed means it isn’t. Every list in the app marks it the same way.',
      // The canvas says "the circled figure ... is there whether that is one
      // or four". The row draws neither half: the count is `×2` in mono beside
      // the name, and `decklist-row.tsx` renders it on `quantity > 1` only.
      // A single copy is the ordinary case and says so by saying nothing.
      'A count shows only when the deck wants more than one copy, like ×2.',
      // The red edge rides WITH `short N` rather than in the edge line below.
      // It is the same answer drawn twice — the collection saying you are a
      // copy short — where the accent edge answers a different question, and
      // the two used to share one sentence as though they were one axis. The
      // page caps an entry at four keys, so this is the split that fits: by
      // WHAT IS BEING ANSWERED, which is the distinction that was missing.
      'Something in the way gets a mark: “1 in a draft”, “none free”, or “short” when you need more copies than you have, which also rings the row in red. A card to buy shows its price, or $ with no price yet, and P is a card you’re printing. On Shopping, a card another deck holds carries its buy tag too.',
      'A bright edge means you’ve changed the row since your last commit. Commit, and it goes.',
    ],
    since: 1,
  },
  {
    id: 'card-marks',
    chapter: '03',
    title: 'Bracket facts that travel with a card',
    route: '/collection',
    width: 'plate',
    // Tied to the tab's switch though the marks draw without it: key 3 sends the reader to the
    // Analysis tab, and with the switch off there is no tab to send them to.
    switch: 'ANALYSIS_TAB_ENABLED',
    caption:
      'A card carries its bracket facts into every deck: whether it’s on the Game Changer list, counts as mass land denial, takes extra turns or is a tutor.\n\nEach fact has its own mark beside the card’s name, in your Collection, on a decklist, and on the cards Consider and the search under the tabs offer you.\n\nRhystic Study carries one: it’s a Game Changer. It also starts more power-level arguments than most.\n\nA key above the cards names the marks, and a card’s details spell them out under Bracket facts.',
    keys: [
      'A tutor is a search that can find more than a land. Fetching a land is ramp, so it gets no mark.',
      'No mark means we found nothing to report. The Game Changer list is complete; the other three we detect, and detection can miss a card.',
      'A mark is about the card alone. How many a deck runs, and what that does to its bracket, is the Analysis tab’s job.',
    ],
    // The version current when it was written, as `deck-analysis` above.
    since: 9,
  },
  {
    id: 'locked-cards',
    chapter: '03',
    title: 'Locking a card against suggested cuts',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    switch: 'NEVER_CUT_ENABLED',
    caption:
      'Lock a card and nothing in the app will offer to cut it. Your pet cards are safe with us.\n\n- Suggested changes won’t propose it.\n- It gets no cheaper stand-ins.\n- Clear all auto and Pull it pass it by.\n- Update from a list starts with it kept.\n\nYou can still remove it yourself: the lock holds our suggestions back, and the deck stays yours to edit. Remove a locked card and Undo, Put back or a discard brings it back locked.\n\nA commit without it ends the lock.',
    keys: [
      // Audit L2: the lock sits beside the ✕ on a row, not after the name. Its other half (what
      // else changes) is said once, where it belongs: stand-ins in the caption, Pull it in key 3.
      'A locked card keeps its lock beside the remove button in the list.',
      'Lock cards, in the list’s toolbar, turns every remove button into a lock until you press Done. It’s how you lock or unlock a card on any device.',
      'While Lock cards is on, this line counts what you’ve locked, once per card however many copies.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'roles',
    chapter: '03',
    title: 'How many cards each role needs',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'The strip counts cards by the job they do: Ramp, Draw, Removal, Wipes and Land. That’s usually where a deck comes up short. One board wipe is a problem in a way eleven creatures rarely is.\n\nEach cell sets your count against a recommendation. The numbers come from EDHREC decks like yours: your pair’s or your commander’s own, or failing that, decks in your colors.\n\n- When both the role and land numbers are measured, the strip says EDHREC averages.\n- When either falls back to our default, it says A common starting point.\n\nA role over its number reads as met, and nothing is capped. Ramp to your heart’s content.',
    keys: [
      // Named on the cell the figure actually draws. The canvas wrote "5
      // wipes against 3", which was an example rather than a reading — and
      // the strip below draws Wipes SHORT, because the caption’s own example
      // of a problem is the deck with one board wipe.
      'The second number is the target, so 12 ramp against 10 counts as met, with two to spare.',
      'A short role tells you what to do next: when Consider has cards for it, “consider →” takes you straight there.',
    ],
    since: 1,
  },
  {
    id: 'informed-build',
    chapter: '03',
    title: 'Targets measured from decks like yours',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'How much ramp a deck wants depends on who leads it.\n\nFill, the ticks in Choose the last and the shelves in Consider all aim at what EDHREC decks like yours run: your pair’s or your commander’s own first, then decks in your colors.\n\nA Kinnan deck asks for about 20 ramp, twice the default, and no board wipes at all. Kinnan players already knew.\n\nWhere we haven’t measured enough decks, the default stands in:\n\n- 10 ramp\n- 10 draw\n- 8 removal\n- 3 wipes\n- 37 lands, or 36 with a partner\n\nThe strip tells you which you’re looking at.',
    keys: [
      'Lands move too. Twenty-eight is a real answer for a deck that ramps hard, and thirty-seven never fit them all.',
      'A target of 0 is an answer too: this commander’s decks run no board wipes, so the cell asks for none.',
    ],
    since: 8,
  },
  {
    id: 'combo-awareness',
    chapter: '03',
    title: 'Spotting the other half of a combo',
    route: '/collection',
    opens: 'opens your collection',
    width: 'plate',
    caption:
      'Some cards do something remarkable next to one other card. Heliod, Sun-Crowned and Walking Ballista are a classic pair.\n\nWhen you own both halves and no deck has put them together, your Collection marks the row and names the partner. While you build, a card the deck is one piece away from carries the mark in Consider, in Choose the last and in the Add search.\n\nA card’s details list every partner: the ones in this deck first, then the ones you own, then the ones you’d have to buy. The salt is between you and your table.',
    keys: [
      'The count covers the partners listed here and stops. Combos that need a third piece aren’t detected, so a grand total would be wrong.',
      'A row names one partner, and the card’s details name them all.',
      'The list runs from what this deck already holds, through what you own, to what you’d have to buy.',
      'The combos come from Commander Spellbook, credited once behind the heading’s marker.',
    ],
    since: 9,
  },
  {
    id: 'decklist-order',
    chapter: '03',
    title: 'Sorting the 99 within its sections',
    route: '/decks',
    opens: 'opens a deck',
    // 'inset' at the canvas, where the figure was a four-row legend. It draws
    // the decklist’s own bar now, which is a full-width row on the deck page.
    width: 'plate',
    caption:
      'The 99 always sits in sections, By type or By role, and the order you pick sorts each section from within.\n\nName and Mana value are always offered. Price joins them on the Shopping filter, where money is the question.',
    keys: [],
    since: 1,
  },
  {
    id: 'add-cards',
    chapter: '03',
    title: 'Adding a card by name',
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
      'Type a card’s name into the search under the deck’s tabs. It searches your commander’s colors with Owned only on, so results start from your Collection.\n\nTurn Owned only off for every card in those colors, or press Search all cards instead when nothing you own matches.\n\nEach result says how many you own, that you don’t own it, or that it’s already in the deck. Adding a card keeps you on the list you were reading. A card another committed deck is holding still adds, carrying the mark that says so.',
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
      'Press Find a deck for it in the details of any Commander-legal card, and we list the decks that could take it, with the reason each one fits. Combos come first, then themes.\n\nOpen Ashnod’s Altar and the deck where it completes a combo with cards already in it tops the list. Add puts the card in that deck’s draft.\n\nThat binder of loose rares finally has somewhere to go.',
    keys: [
      'You’re offered decks whose colors allow the card and that don’t run it yet. Decks already running it sit underneath.',
      'Decks where it completes a combo come first, then decks whose theme it joins, most cards first. Ties go to the deck whose commander’s decks favor the card most.',
      // Audit R2-A3-1: the row never shows the two shares; with no reason it shows the need alone.
      'Each deck shows its best reason: a combo the card completes with that deck’s own cards, or else the theme it joins. With neither, the row shows only what the deck needs, if anything. A staple every deck runs says “staple · any commander”, and its decks go by name.',
      'The need is this deck’s count for the card’s role against its target, left off when the card has no role or the target isn’t measured. Add uses a free copy if you have one, or brings the card in as one to buy.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'versions',
    chapter: '03',
    title: 'Committing a deck and reading its versions',
    route: '/decks',
    opens: "opens a deck’s Versions tab",
    width: 'plate',
    caption:
      'A deck keeps two lists: the committed one, and the changes you’re making to it.\n\nEvery add and cut waits as a pending change until you commit. Each commit makes a version you can read back on the Versions tab, which is handy for settling whether last month’s list was better.\n\nOn a committed deck, a card you add counts against your Collection for this deck straight away. Other decks feel it once you commit.\n\nOpen a version to see which of its new cards you own today, with today’s price on the ones you’d buy.',
    keys: [
      'Each version shows its date, card count and average mana value, and on a wide screen how many games it held. Every game in the log names its version, so you can see whether a change helped.',
      'A version keeps the note you wrote when you committed it, or says there wasn’t one.',
    ],
    since: 1,
  },
  {
    id: 'shopping',
    chapter: '03',
    title: 'What a deck still needs you to buy',
    route: '/decks',
    opens: 'opens a deck’s Shopping filter',
    // 'inset' at the canvas, where the figure was two legend rows. It draws
    // real Shopping-filter rows now, and a ~300px column truncated both card
    // names to `Dockside ...` and `R. —`.
    width: 'plate',
    caption:
      'Every card a deck wants and you can’t supply sits on its Shopping filter, priced from ManaPool wherever ManaPool has a price.\n\nThe deck’s tile carries the count and the cost, and To buy, all decks on Home adds them up across your library.\n\nA card you own can still land here. Say your Atraxa deck committed your only Sol Ring first: your Meren deck lists one to buy.\n\nCopies with no price count toward the tally and add nothing to the total.',
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
      'Some cards on Shopping cost more than the job they do. Each deck has a limit per card, $10 until you set your own, and every row over it is marked.\n\nA marked row’s swap button opens cheaper cards, or free copies from your Collection, that do the same job. Spells list cards of the same type first, then other types.\n\nSay Shopping wants a pricey dual land: each stand-in says what it makes and whether it comes in untapped, best mana first.\n\nYou pick, and taking one is an ordinary change to the deck that Undo swap reverses.',
    keys: [
      'Under the price strip sits this deck’s limit per card, marked as the default until you set your own.',
      'A row over the limit is marked, and its swap button opens the stand-ins. Any unlocked card on Shopping reaches them from its details too.',
      // #1046's spell rows: each keeps one of the card's jobs and compares itself as keeps / gains /
      // loses. What a row gives up is its `loses`, so the older "gives up" wording is gone.
      'Every stand-in for a spell keeps at least one of its jobs, and its row says what it keeps, gains or loses. Five show first, and Show all brings the rest.',
      // r2 said a once-only color "doesn't count as making it"; the shipped ladder (`landRung`) counts it,
      // on the last rung.
      'Lands sort by their mana: untapped first, then ones that cost life or come in untapped only on a condition, then tapped ones, then utility lands that make a color only by paying, for a narrow use, or once.',
    ],
    since: 9,
  },
  {
    id: 'deck-import',
    chapter: '03',
    title: 'Importing a deck, or updating one from a list',
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
      'Decks built elsewhere are welcome here. Paste a list or upload a file and we make the deck. Moxfield and MTGO text both work: copy the list itself, since a link won’t import.\n\nTo bring a deck you already have up to date, open it and press Update from a list:\n\n- Paste the new list.\n- Check What this list changes against the deck.\n- Keep any cards the list leaves out.\n\nOn a committed deck the update arrives as pending changes.\n\nA line we can’t put a card to still comes over. It’s flagged in the deck, counts toward the 99 and stays out of what’s built until you fix it.',
    keys: [],
    since: 1,
  },
  {
    id: 'review-and-commit',
    chapter: '03',
    title: 'What a commit asks of your Collection',
    route: '/decks',
    opens: 'opens the review page',
    width: 'plate',
    // Design R5, with two corrections for the 2026-09-19 vocabulary ruling:
    // the caption opened "A draft becomes a version here", which now reads as
    // the versionless deck rather than the edits, and key line 3 quoted the
    // guard tag as `deck in draft`. Both are copy, so eng resolved them.
    caption:
      'Review changes is the last stop before a commit. It shows what locking in your edits asks of the rest of your Collection, with the cards coming in split into free, sleeved and to buy.\n\nSay your Kinnan draft adds Arcane Signet, and your only copy is sleeved in Atraxa. Its row offers Pull it: the Signet moves to Kinnan, and Atraxa gets a draft with it under Going out. She has lifelink. She’ll be fine.\n\nDiscard that draft and the Signet goes back where it was. A copy another deck holds as its commander stays put.',
    keys: [
      'Coming in splits by where each card comes from: free, sleeved, to buy, and proxied when there are any. You know what the commit costs before reading a row.',
      'Pull it takes a copy out of another deck and leaves that deck a draft with the card under Going out. Nothing there is committed, so the row names the deck it raided: that’s where to look if you change your mind.',
      'A copy another deck holds as its commander stays put, so its row says “commander” and has nothing to press.',
    ],
    since: 7,
  },
  {
    id: 'new-deck',
    chapter: '03',
    title: 'Starting a new deck',
    route: '/decks/new',
    opens: 'opens the commander picker',
    width: 'plate',
    caption:
      'New deck lists every commander in your Collection you could legally build, each with its pool: how many of your cards are legal in its colors. Pick one and name the deck. That’s all it needs.\n\nA commander with partner gets a second slot that offers only legal pairs, so Tymna the Weaver offers partners like Thrasios. Your pod has been warned.\n\nComing from a commander’s own page skips the list. The commander and any synergy picks you made there come with you, and all that’s left is the name.',
    keys: [
      'Only commanders in your Collection that you could legally build make the list.',
      'The number beside each is how many of your cards are legal in its colors: the Pool part of a fit score, seen from the commander’s side.',
      'Only the name is required. The deck arrives filled: staples first, then cards from your Collection, then what that commander’s decks play most. Every card is yours to change.',
    ],
    since: 7,
  },
  {
    id: 'change-commander',
    chapter: '03',
    title: 'A new commander for the same 99',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    switch: 'CHANGE_COMMANDER_ENABLED',
    caption:
      // Audit C1 (candidates also need enough decks to measure) and C4 (a deck with no version has
      // nothing to discard back to).
      'Like the 99 but not the leader? Change commander, on the commander’s art, lists commanders in exactly this deck’s colors with enough decks to measure, or pairs for a pair deck. The ones in your Collection or already in the 99 come first.\n\nEach carries one figure: how many of this deck’s cards its decks run. On a Korvold deck, “41 of 72 are in its decks” beside Prossh means Prossh players already run most of your list.\n\nYour choice waits in pending changes. On a committed deck, Discard puts the old commander back.',
    keys: [
      'Every candidate shares this deck’s exact colors, and a pair deck gets pairs, so nothing in the 99 has to change.',
      'The figure counts this deck’s cards that the candidate’s decks run, leaving out basic lands and the staples every deck runs. Press it to see which cards.',
      // Audit C2: an owned candidate is free or held, and a buy tag may carry no price.
      'Candidates you own come first, marked free or with the deck that holds them, and the rest carry a buy tag. Mana value sits beside each and has no say in the order.',
      // Audit C3, rewritten once the half-trade shipped (#1008). It names the pair case that works
      // and claims no more: two rarer partner cases are held (Hugh).
      'Pick one that’s already in the 99 and it moves to the command zone while the old commander takes its slot, so the deck stays whole. A pair can bring in one half this way, and you choose which of the old pair stays.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'undo-removal',
    chapter: '03',
    title: 'Putting back a card you took out',
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
      'Take a card out of your deck and its row turns into an undo that names it: “Rhystic Study removed”. Your table may be hoping you leave that one out.\n\nUndo puts it all back: the deck’s count, the shopping total, its copy from your Collection, and its lock if it had one. A card you were proxying comes back as one to buy. Take out several and each keeps its own undo, as many as you like.\n\nOn the review page, a cut of a single copy offers Put back instead. A cut of several copies goes back from the deck itself.',
    keys: [],
    since: 1,
  },
  {
    id: 'export',
    chapter: '03',
    title: 'Exporting the list, or buying what’s missing',
    route: '/decks',
    opens: 'opens the export dialog',
    width: 'plate',
    // R4: the tabs are `Decklist` and `Shopping list` (export-dialog.tsx:2,52);
    // the primary is `Copy to clipboard`, swapping to `Copied ✓` for 1.5s
    // (export-copy-button.tsx:72); the secondary is `Download .txt`
    // (export-dialog.tsx:561). `Buy these at Mana Pool` was already right
    // (decks-builder.ts:472).
    caption:
      'Take the whole 99 anywhere as plain text. Moxfield and Archidekt both read it.\n\nOr take only the cards this deck has to buy: Buy these at Mana Pool opens that list at Mana Pool in a new tab, and you check out there.',
    keys: [
      // The canvas draws a count on the Shopping tab (`Shopping list 8`) and
      // the app draws none: `export-dialog.tsx` renders `exportTabCopy.shopping`
      // and nothing beside it. The figure below is that tab, so the claim had
      // nowhere to hide.
      'The Shopping list tab holds what this deck has to buy, including cards you own when older decks already hold the copies.',
      'The link opens Mana Pool in a new tab and carries the list, nothing else.',
      'Download .txt saves the same plain text Copy to clipboard copies, and the button reads Copied ✓ for a second and a half after a copy.',
    ],
    since: 1,
  },

  // ---- 04 · Playing and tuning --------------------------------------------
  {
    id: 'log-a-game',
    chapter: '04',
    title: 'Logging a game',
    route: '/decks',
    opens: "opens a deck’s Games tab",
    width: 'plate',
    caption:
      'Log a game takes about fifteen seconds: the result, the pod size, and the two or three things that decided it.\n\nThe same eight things can go under What worked or What let me down. Mark Mana as what let you down, and the mana screw is on the record.\n\nA result on its own still counts as a game. Suggested changes reads your games the next time it runs.',
    keys: [
      'Pod size sits beside each game in your history, because beating three opponents is a different day from beating one.',
      'Your note comes back word for word in the history, never summarized, so one line beats a paragraph.',
      'Both sides offer the same eight, so a deck’s record can show something cutting both ways.',
    ],
    since: 1,
  },
  {
    id: 'log-findings',
    chapter: '04',
    title: 'What your logged games add up to',
    route: '/decks',
    opens: "opens a deck’s Games tab",
    width: 'plate',
    caption:
      'The Games tab has more to say with every game you log.\n\n- After one, it tells that game back to you.\n- From the second, it sorts your marks into Fix and Keep.\n- From the third, the heading makes a finding, like “Mana is letting this deck down.”\n\nSomething marked for you as often as against you gets one line under Mixed. Every figure is a count of games.',
    keys: [
      'Until the third game, the heading holds back: one game is a note, two a leaning, three a finding.',
      'Anything marked for you as often as against you joins one line under Mixed, never a third column.',
    ],
    since: 1,
  },
  {
    id: 'suggested-changes',
    chapter: '04',
    title: 'Telling Suggested changes what the deck is for',
    route: '/decks',
    opens: "opens a deck’s Analysis tab",
    width: 'plate',
    // NO switch (see the header comment above): ANALYSIS_TAB_ENABLED is confirmed on for
    // staging and off for production, so a switch here would hide this entry on production
    // forever rather than announcing it — the opposite of ruling 7's bump.
    caption:
      'Suggested changes, at the foot of the Analysis tab, offers up to five swaps, each a card out and a card in. We ask for eight and keep the first five that pass our checks.\n\nDescribe the deck in a sentence or two and it sits under the deck’s name. The pencil beside the name edits both, and Suggested changes reads the description the next time it runs.\n\nThree limits hold for the deck:\n\n- the most a card may cost\n- the sets an added card comes from\n- whether adds come only from your Collection\n\nAdditional notes carry one run’s instructions in your words.\n\nSay you describe your Meren deck as slow graveyard value for casual tables, cap cards at $5, keep adds to your Collection, and ask for more removal this run. The swaps come back as cheap removal you already own, in place of cards that don’t fit the plan.\n\nEach run uses a credit.',
    keys: [
      'The description is optional. Before the first reading it’s asked beside Analyze, and after that you edit it with the pencil.',
      'Additional notes last one press and are never saved. Anything that should hold every time belongs in the description or the limits.',
      'The commander, locked cards and the limits always win: a swap that breaks one is left out, and up to five of the rest are shown. If no swap survives at all, the credit comes back.',
    ],
    since: 10,
  },
  {
    id: 'credits',
    chapter: '04',
    title: 'What credits pay for',
    route: '/decks',
    opens: "opens a deck’s Analysis tab",
    // 'inset': the figure is three lines of the credit line, narrow enough to sit beside its text.
    width: 'inset',
    // Hugh, 2026-10-05: credits get ONE entry of their own, and every other entry says only that
    // an action "uses a credit". Every spender is a `ModelFeature` (`allowance-rule.ts`): the
    // Overview (`synopsis`), Suggested changes (`tuning`) and Look deeper (`intake`). Each refund
    // rule is its own: `chargeFor` (all four sections), `tuning-actions.ts` (zero swaps kept
    // fails the run), `run-store.ts` for intake (`useful`: at least one valid answer). NO switch. It shipped at
    // `since: 10` with no bump; Hugh then ruled (2026-10-06) that it is announced, so it moved to
    // `since: 11` with the ABOUT_VERSION bump that ends the second prose pass.
    // "Every player gets three" is the FRIEND allowance (`MODEL_FRIEND_DAILY_ALLOWANCE`). The owner's
    // ten and monthly testing share exist and are left out on purpose: Hugh, 2026-10-06, "three only".
    caption:
      'Credits pay for the parts of the app that write something for you. Every player gets three, and each one comes back 24 hours after the run that used it.\n\nThese use a credit:\n\n- writing a deck’s Overview, whether Analyze writes it for a list that has none yet or you press Try again\n- each Suggested changes run\n- each Look deeper in Help me choose\n\nReading the bracket is free.\n\nA run uses its credit only when it gives you something: an Overview with all four sections, Suggested changes with at least one swap, a Look deeper that comes back with at least one answer. Anything less hands the credit back, and so does stopping a run.\n\nWhen the app reaches its monthly limit, all of these pause until the 1st.',
    keys: [
      'With credits left, the line says how many, and once one is spent, when the next comes back.',
      'With every credit used, the button waits and the line names when the next one returns.',
      'The monthly limit is the app’s own, so it pauses every player at once, until the 1st of next month.',
    ],
    since: 11,
  },
  {
    id: 'statuses',
    chapter: '04',
    title: 'Reading a deck’s status badge',
    route: '/decks',
    width: 'plate',
    caption:
      'Every deck wears one of seven statuses, and each one points at a next step.\n\nOnly Complete means sleeve it up and play. How hard it hits is still for the pregame chat.\n\nTo buy is the one to watch. A card you own still needs buying when an older deck holds your copy, so one Sol Ring in four sleeved decks is three to buy.',
    keys: [
      'New and Draft are decks you’ve never committed: New is empty, Draft has cards in it. Building is a committed deck short of a full list.',
      'Over has too many cards. Unresolved is full, with lines we couldn’t match to a card.',
      'To buy catches people out: a full deck you can’t sleeve yet, because some of it still has to be bought.',
      'Complete means sleeve up and play.',
    ],
    since: 1,
  },
  {
    id: 'folders',
    chapter: '04',
    title: 'Filing your decks into folders',
    route: '/decks',
    // 'inset' at the canvas, where the figure was a legend. Mounted,
    // the shelf line is a full-width row of segments, and a ~300px column wraps it to three.
    width: 'plate',
    caption:
      'Give your decks some shelves. A deck lives in one folder or in none, and you file it with Move in the deck’s menu.\n\nOn a wide screen every folder and its count sit above the filters. On a phone they’re one tap away under Shelves.\n\nPicking a folder narrows Decks with no filter chip, and Clear all filters leaves it alone. Unfiled appears once you make your first folder.\n\nJust precons makes a fine name for the decks everyone swears are just precons.',
    keys: [],
    since: 1,
  },
  {
    id: 'resume',
    chapter: '04',
    title: 'Pick up where you left off',
    route: '/',
    // 'inset' at the canvas, where the figure was a legend. Mounted,
    // Home’s resume block is a list of full-width rows, each with a portrait, a status keyline and a count.
    width: 'plate',
    caption:
      'Home opens on the four decks you touched last, newest first, ready to pick back up. Each row says what put it there: edited, committed or played.\n\nIts art and status badge match its tile on Decks, so you’ll know it at a glance.',
    keys: [],
    since: 1,
  },
  {
    id: 'commitments',
    chapter: '04',
    title: 'How much of your Collection is spoken for',
    route: '/',
    width: 'inset',
    caption:
      'Three figures on Home show how much of your Collection your decks lean on:\n\n- Cards in use is how much of your Collection is sleeved into committed decks, out of everything you own.\n- Spoken for twice counts the cards your committed decks want more copies of than you own: one Sol Ring in three decks is 1 card. It stays red at zero.\n- To buy, all decks is what every deck is still short, and its price.',
    keys: [],
    since: 1,
  },
  // 'reservations' (chapter 04, 'Which deck gets a shared copy') was retired 2026-10-04 (Hugh,
  // no Design round — a removal): it demonstrated overriding the default FROM A DECK'S REVIEW
  // PAGE, and that override no longer exists there (the per-row panel on /decks/[id]/changes
  // was removed; a replacement chooser is going to Design separately). The rule it taught is
  // still true and still shown where it is still live — `post-import`'s own key bullet states
  // it: "when two committed decks want the copy that arrived, the first to sleeve it keeps it
  // unless you say otherwise." No orphaned fact; one entry fewer.
  {
    id: 'proxies',
    chapter: '04',
    title: 'Running a proxy instead of buying',
    route: '/collection/proxies',
    // 'inset' STAYS. Hugh’s ruling, 2026-09-19: a figure that is genuinely
    // narrow sits beside its text and a full-width surface sits under it, so
    // the two-column rhythm follows what each figure IS rather than being
    // imposed. The proxy control is a tick and two lines; it fits.
    width: 'inset',
    caption:
      'Not every deck needs a real Gaea’s Cradle. Choose Run a proxy on its card in the deck: it leaves the buy list, and the deck’s shopping total drops by its price.\n\nYour Collection and set completion stay as they are. Proxies, beside Cards and Sets, lists everything you’re printing.',
    keys: [],
    since: 1,
  },
  {
    id: 'themes',
    chapter: '04',
    title: 'Picking a color theme',
    route: '/',
    opens: 'in the account menu',
    width: 'plate',
    caption:
      'Six themes live in the account menu under Theme, each named for how it looks, from Low Sun to First Frost.\n\nA theme changes the palette and keeps every meaning: owned is green and over-committed is red in all six. Pick the one that matches your playmat.',
    keys: [
      'The name is the theme’s own, and the plane sits under it: you pick Neon Rain, and Kamigawa is the subtitle.',
      'Each theme brings its own accent color too.',
      'Your pick is remembered in this browser, so another device starts on the default until you pick there too.',
    ],
    since: 1,
  },
] as const;

// ---- How the app reaches its answers (handoff about_how_it_works, R1) -----
// Reference rows, not entries: no `since`, no NEW, never in the index. Behind
// HOW_IT_WORKS_ENABLED. The method tags are shared with the Analysis tab's
// "How we make these decisions" sheet (Hugh, 2026-09-28: five methods, and the
// tags appear in both places). All five are drawn identically on purpose:
// coloring them by trust would be a score.
export type HowMethod = 'rules' | 'decks' | 'model' | 'you' | 'list';

export const howItWorksCopy = {
  methods: {
    rules: { tag: 'rules text' },
    decks: { tag: 'other decks' },
    model: { tag: 'model-written' },
    you: { tag: 'your input' },
    list: { tag: 'published list' },
  },
  /**
   * Which methods each bracket count uses, read by the decisions sheet (and, once it lands, by
   * the appendix's Brackets row). Land denial and extra turns combine Commander Spellbook's estimate with our
   * reading of the rules text (`MLD_DETECTION.methods`, `EXTRA_TURN_DETECTION.methods`); combos
   * are Spellbook's index alone; Game Changers is Wizards' list, read through Scryfall.
   */
  bracketMethods: {
    gameChangers: ['list'],
    landDenial: ['rules', 'decks'],
    extraTurns: ['rules', 'decks'],
    combos: ['decks'],
    tutors: ['rules'],
  },
} as const satisfies {
  methods: Record<HowMethod, { tag: string }>;
  bracketMethods: Record<string, readonly HowMethod[]>;
};

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
    'What every mark and figure in the app means, and where to find it, on one page.',
  show: 'Show me',
  later: 'Later',
  where: 'Always in your account menu, under About The\u00a099.',
  regionLabel: 'New in About',
  regionLabelFirstRun: 'About The\u00a099',
} as const;
