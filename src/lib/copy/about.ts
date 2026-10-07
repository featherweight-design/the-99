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
  pageTitle: 'Welcome to The 99',
  // Hugh's own story (option A, 2026-10-06): why the app exists, what it does and who it's for.
  // Paragraphs split on a blank line, as an entry's caption does (`EntryCaption`).
  pageIntro:
    "There are a lot of Magic: The Gathering apps out there and a lot of them do really great things: Manabox is the main place I store my collection, Moxfield was my first deck builder, and Deckcheck helped me really understand tuning." +
    '\n\n' +
    "But, no single app really scratched that itch for me. Somewhere I could really see and manage everything. At least not everything I needed. So, I built The 99. Specifically, around the idea that, maybe I would know what commander I want, but it was always arduous to round out the rest of the deck." +
    '\n\n' +
    "How many lands should I have? Is this too many creatures? Do I have any Sol Rings left? Didn’t I crack a pack last week with something I needed? Does this deck even make sense?" +
    '\n\n' +
    'And, like most players, I have hundreds of cards neatly catalogued, tucked away in a big box, conveniently hidden away so I have no idea what I even own. The number of times I’ve bought a single only to realize I owned one is too many to count. Or, worse, realizing I don’t have what I need right before a game.' +
    '\n\n' +
    'The 99 aims to solve this by focusing on your collection first. What do you already own, where is it today, and what do you need more of? From there, it grew to answer more niche questions like "How many Game Changers do I own?", "What bracket does this deck land me in?", "Is there a cheaper alternative for this $300 land?", "Would a different commander run this deck better?"' +
    '\n\n' +
    'And, I hope it keeps growing into something me and my friends can use to build cooler decks, have better game nights, and enjoy this nerdy-ass hobby even more. Because at the end of the day, The 99 is for me and my friends. Something for nerds, by nerds, to do more nerd shit.' +
    '\n\n' +
    'Cheers nerds,' +
    '\n\n' +
    'Hugh',
  // Appended to the intro only while ABOUT_SHEET_ENABLED is on: with it off a
  // new version still redirects here, and there is no note to speak of.
  pageIntroSheet: 'When a new feature drops, a note here will tell you on your next visit.',

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
      sub: 'The Foundation: figure out how The 99 helps you manage your Collection.',
    },
    '02': {
      title: 'Finding a commander',
      sub: 'Something you already own, something new, something borrowed, something mono-blue.',
    },
    '03': {
      title: 'Building the 99',
      sub: 'The meat and potatoes of the app helping you build your deck before you show it off.',
    },
    '04': {
      title: 'Playing and tuning',
      sub: 'Bells and whistles to enhance your play and fine-tune your decks.',
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
      "Your Collection has the standard search, filter and sort options you'd expect to find anywhere else: search by name, filter by color, type or set, sort by name, quantity and more. But The 99 does you one better: Availability. We'll go over it in more detail later, but this is what tells you what you own, what's in use and what you need to buy.",
    keys: [
      'Cards, Sets and Proxies sit in the strip at the top.',
      'Sets lists every set you own cards from, newest first.',
      'Each filter becomes a chip. Press one to drop it.',
      'Grid or rows is your call, and we remember it.',
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
      "Your collection probably already lives somewhere else. Mine's in ManaBox. Export it, drop the file in, and The 99 picks up every copy, set and foil.\n\nHeads up: an import replaces your whole Collection, it doesn't add to it.",
    keys: [
      'Takes ManaBox, Moxfield, Archidekt or Deckbox CSVs, or a pasted list.',
      'Any CSV with Name and Quantity columns works too.',
      'Reads quantity, set, collector number and finish.',
      'Nothing changes until you confirm.',
    ],
    since: 1,
  },
  {
    id: 'post-import',
    chapter: '01',
    title: 'How replacing your Collection affects your decks',
    route: '/collection/replace',
    opens: 'opens the import summary',
    width: 'plate',
    caption:
      "Cracked a few packs and re-imported? The summary shows what that did for your decks: what you no longer need to buy, what you still do, and where you're still short.\n\nYour decklists don't change, just whether you own what's in them.",
    keys: [
      'Shows your card count before and after.',
      'Rows sort into No longer to buy, Still to buy and Still short.',
      'A card two decks want gets one row, oldest claim first.',
      'A new copy goes to the deck that committed first, unless you pick another.',
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
    title: 'When an import can’t find a card',
    route: '/collection/replace',
    opens: 'opens the issue inspector',
    // A ROW figure, so it takes the full plate. The route’s own issue rows carry
    // a name, a line number, a set code and a reason on one line; at the inset’s
    // 300px cap `no Oracle match` wrapped and the copy count collided with it —
    // a figure demonstrating the route’s row while showing a shape the route
    // never produces.
    width: 'plate',
    caption:
      'Sometimes a line just won’t match: a typo, or an export that does something odd. Those land in Import issues with the reason beside each one, and everything else imports as normal.',
    keys: [
      'Unmatched: names we couldn’t find.',
      'Parse errors: lines we couldn’t read.',
      'A pasted list can’t fill in set completion.',
    ],
    since: 1,
  },
  {
    id: 'availability',
    chapter: '01',
    title: 'Availability: what’s free, what’s taken, what to buy',
    route: '/collection?avail=inuse,over',
    width: 'plate',
    caption:
      'This is the one I mentioned earlier and is one of my favorite features, even if it’s a small one. A copy you own can only live in one committed deck at a time, so The 99 keeps track of which decks own which cards.\n\nOwn one Sol Ring and run it in three decks? It reads short 2. Sol Ring: always short because you never think you’ll build another deck until you do.',
    keys: [
      'free: a spare copy nothing wants. No mark.',
      'in a draft: an uncommitted deck wants it. Committed decks come first.',
      'none free: committed decks hold every copy.',
      'short 2: committed decks want two more than you own.',
      'The deck that committed first gets your copy, unless you pick another.',
    ],
    since: 1,
  },
  {
    id: 'sets',
    chapter: '01',
    title: 'Completing a set',
    route: '/collection/sets',
    width: 'plate',
    caption:
      'For the collectors, and the completionists who swear they aren’t. Open any set to see which cards you’re missing and what it would cost to finish it.\n\nA set counts as complete once you own its Checklist, the set’s own numbered run. Showcase, borderless and promo extras are extra credit.',
    keys: [
      'Missing cards are dashed and dimmed, with a price.',
      'Cost to finish counts only what ManaPool has in stock.',
      'Promo sets with no numbered run count every printing.',
      'Toggle Missing or Owned. Sort by number or price.',
    ],
    since: 1,
  },
  {
    id: 'buy-tag',
    chapter: '01',
    title: 'What the cards you’re missing cost',
    route: '/decks',
    opens: 'opens a deck',
    width: 'inset',
    caption:
      'When a deck needs a card you don’t own, it tells you what it’ll cost. Prices come from ManaPool and refresh daily, so you can see the damage before you check out.',
    keys: [
      'A price: what ManaPool is asking today.',
      'A foil-only price, like $2.10 foil: they only have it in foil.',
      'sold out: ManaPool has carried that printing but has none right now.',
      'A bare buy: the feed has no price for that printing at all.',
    ],
    since: 1,
  },
  {
    id: 'card-detail',
    chapter: '01',
    title: 'A closer look at any card',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'inset',
    caption:
      'Press any card, anywhere, for a closer look at the art. Double-faced cards flip over, no unsleeving required.\n\nOwn a few printings? Pick your favorite, and that’s the art your Collection shows.',
    keys: [
      'Split cards, adventures and other cards with two costs show both.',
      'Swipe, or use the arrow keys, to page through the list you came from.',
      'Opened from a sheet or a combo partner? The pill at the top takes you back.',
    ],
    since: 1,
  },

  // ---- 02 · Finding a commander -------------------------------------------
  {
    id: 'ready-to-build',
    chapter: '02',
    title: 'Your two daily commanders',
    route: '/',
    width: 'plate',
    caption:
      'Every day, the Home page deals you two commanders you could build right now, picked from the best fits in your Collection that aren’t leading a deck of their own.',
    keys: [
      'Picks come from your top 28 commanders by fit.',
      'Each shows how many of your cards fit, and how many are in use.',
      'A new pair arrives at midnight UTC, never the same as yesterday’s.',
      'One of the two leans toward themes your decks play least.',
    ],
    since: 1,
  },
  {
    id: 'fit-score',
    chapter: '02',
    title: 'How fit scores work',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'plate',
    caption:
      'Every commander gets a score out of 100 for how well your Collection could build a deck around it. Most of it is how many of the commander’s most-played cards you already own. The rest checks that you have enough cards in its colors, and enough ramp, draw and removal to hold a deck together.\n\nMost-played cards come from EDHREC decklists. A brand-new or very niche commander may not have any decks yet, so it omits a Synergy score and is scored out of 40 instead of 100. A 32 there is a strong score, not a weak one.',
    keys: [
      'Synergy, 60: how many of its most-played cards you own.',
      'Roles, 25: enough ramp, draw, removal and wipes.',
      'Pool, 15: your cards in its colors, full at 200.',
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
      'Every commander you own that isn’t leading a deck yet, ranked by how well your Collection fits it.\n\nDon’t want to raid your other decks? Switch the “Build from” filter from “All my cards” to “Free cards only”.',
    keys: [
      '“All my cards”: scores count everything you own.',
      '“Free cards only”: counts only copies no committed deck is holding, including any possible commanders tucked into another deck.',
      '“Printed in”: only commanders printed in the sets you pick.',
    ],
    since: 1,
  },
  {
    id: 'discover',
    chapter: '02',
    title: 'Commanders worth buying',
    route: '/discover',
    width: 'plate',
    caption:
      'Discover is for the commanders you don’t own yet. It ranks them by how much of each one’s deck is already sitting in your Collection, and shows what the commander costs.\n\nEach one lists the themes it plays, starting with any your decks haven’t touched yet. Good for finding your next build and trying a mechanic you’ve never played before.',
    keys: [
      '“Best fit”, the default: ranked by how much of its deck you own.',
      '“Something new”: commanders that play themes you haven’t played yet, where you already own at least 30% of the deck.',
      '“Popularity”: the most-played commanders first.',
      '“Printed in”: only commanders printed in the sets you pick.',
    ],
    since: 1,
  },
  {
    id: 'help-me-choose',
    chapter: '02',
    title: 'Help me choose a commander',
    route: '/decks/new/choose',
    width: 'plate',
    switch: 'HELP_ME_CHOOSE_ENABLED',
    caption:
      'Know the deck you want, but not who should lead it? Tell “Help me choose” what you’re after, and it finds commanders that fit, whether you own them or not.\n\nAnswer as much or as little as you like. Name a card in your own words and it becomes the card to build around.\n\nPick a commander and your answers carry over to a new deck, ready to fill from your Collection.',
    keys: [
      'Narrow by colors, themes, sets, budget or bracket.',
      'Your themes and named card set the order. Without them, it ranks by the cards you own.',
      'Each row shows whether you own the commander, how much of its 99 you own, and roughly what the rest costs.',
      '“Look deeper” reads everything you wrote, and uses a credit to give you a more informed result.',
      'Fewer than four fits? It suggests how to adjust your requirements.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'role-coverage',
    chapter: '02',
    title: 'What your cards already cover',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'inset',
    caption:
      'Before you build, see what you’ve got to work with. Role Coverage sorts the cards you own for this commander by the job they do, and shows how far each role is from what its decks usually run.\n\nShort on ramp? That’s where mana screw starts.',
    keys: [
      'Roles: Ramp, Card Draw, Removal and Board Wipes.',
      '“1 owned, 2 short” means its decks usually run 3.',
      'Sort a role by “Most played”, or by “Availability” with free copies first.',
    ],
    since: 1,
  },
  {
    id: 'commander-availability',
    chapter: '02',
    title: 'Owned isn’t the same as free',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'plate',
    caption:
      'Owning a card and being free to use it are two different things, as anyone who’s raided one deck to build another knows.\n\nOn a commander’s page, every card you own carries the same Availability note as your Collection, so you know what’s actually up for grabs.',
    keys: [
      'The owned mark only means you own it.',
      'Open a card to see which decks hold your copies.',
      'Cards you’d need to buy show their price right in the list.',
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
      '“Partner”, “Partner with” and “Friends forever” all let two commanders share the top of the deck. Pick your first, then “Add a partner” offers the ones you own that can pair with it.\n\nTwo commanders also give the rule zero chat twice as much to talk about.',
    keys: [
      'A pair takes two of the hundred cards, so The 99 becomes The 98.',
      'Importing a pasted list? The second legend you pick arrives marked “Proposed”.',
    ],
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
      'Every deck gets a page of its own: the commander up top, how far along it is, and tabs for everything else.\n\n“Consider” is where your commander drops hints: cards it wants that aren’t in the list yet, from your Collection first, then the ones you’d have to buy.',
    // When ANALYSIS_TAB ships on production, add “Analysis” to the tab list below (Hugh, 2026-10-06).
    keys: [
      'Tabs include “Your deck”, “Consider”, “Games”, and “Versions” once the deck is committed.',
      'The “Games” tab shows how many games you’ve logged with the deck.',
    ],
    since: 1,
  },
  {
    id: 'deck-analysis',
    chapter: '03',
    title: 'Finding your deck’s bracket',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    switch: 'ANALYSIS_TAB_ENABLED',
    caption:
      'Not sure where your deck lands? Press “Analyze” on a full deck’s “Analysis” tab, and The 99 reads your list against the Commander Format Panel’s bracket rules.\n\nAt either end of the scale, brackets come down to intent, so your cards might fit two brackets. A Squirrel deck with no Game Changers passes at both Exhibition and Core:\n\n- If the theme came first, it’s Exhibition.\n- If it’s built to hold its own against precons, it’s Core.\n\nThe top end works the same way: Optimized, or cEDH if you tuned it for the competitive scene. Only you know which, so you pick. Arguing about it at the table stays optional.',
    keys: [
      'A range means your cards fit two brackets. Pick the one that fits best.',
      'In the findings, every count with cards behind it opens to show them.',
      'The bottom of the climb shows what to cut to drop a bracket.',
      'The bracket also shows on the deck’s header, its tile on Decks and on Home.',
      'Edit the deck and you’ll be asked if you want to “Re-analyze”.',
      'Describe the deck with the pencil beside its name. “Suggested changes” uses that description to understand what the deck is for.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'auto-fill',
    chapter: '03',
    title: 'Building the 99 for you',
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
      'Pick a commander and The 99 builds the deck for you, like a precon built from your own binder.\n\nIt starts with staples, fills from your Collection, and only reaches for cards to buy where you run short.',
    keys: [
      'Up to ten staples go in first, plus staple lands.',
      'Cards you’d need to buy are the ones the commander’s decks play most.',
      'Slots still open? “Choose the last” lets you pick them, with cards you own pre-ticked.',
      'The “auto” tag marks cards The 99 added for you, so you can tell them from your own picks.',
      '“Clear all auto” removes all auto-added cards, except any you’ve locked.',
    ],
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
      'Each row tells you, left to right:\n\n- whether you own it\n- what it is\n- how many copies the deck wants\n- whether anything’s in the way\n\nMarks after the name flag what would matter for your bracket placement: Game Changers, mass land denial, extra turns and tutors. Demonic Tutor gets two, since it’s a tutor and a Game Changer. Exhibition and Core allow no Game Changers and Upgraded allows three, so count them before the rule zero chat.',
    keys: [
      'Filled green: in your Collection. Hollow and dashed: not.',
      'A count like ×2 shows only when the deck wants more than one.',
      '“1 in a draft”, “none free” or “short” means something’s in the way. “short” also rings the row in red.',
      'A card to buy shows its price. “P” marks a card you’re printing as a proxy.',
      'A bright edge marks rows you’ve changed since your last commit.',
    ],
    since: 1,
  },
  {
    id: 'card-marks',
    chapter: '03',
    title: 'Bracket marks on every card',
    route: '/collection',
    width: 'plate',
    // Tied to the tab's switch though the marks draw without it: key 3 sends the reader to the
    // Analysis tab, and with the switch off there is no tab to send them to.
    switch: 'ANALYSIS_TAB_ENABLED',
    caption:
      'A card’s bracket marks follow it everywhere: your Collection, your decklists, “Consider” and search. Game Changers, mass land denial, extra turns and tutors each get their own.\n\nRhystic Study is a Game Changer, and it starts more power-level debates than most.',
    keys: [
      'A tutor searches for more than a land. Fetching a land counts as ramp.',
      'Game Changers come from WotC’s official list. The other three we attempt to detect from card text.',
      'A card’s details spell out its marks under “Bracket facts”.',
    ],
    // The version current when it was written, as `deck-analysis` above.
    since: 9,
  },
  {
    id: 'locked-cards',
    chapter: '03',
    title: 'Locking your favorite cards',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    switch: 'NEVER_CUT_ENABLED',
    caption:
      'Lock a card and nothing in the app will offer to cut it. Your pet cards are safe with us.\n\n- “Suggested changes” won’t propose cutting it.\n- “Clear all auto” and “Pull it” skip it.\n- It gets no cheaper stand-ins.\n- “Update from a list” keeps it.\n\nIf you ever want to stop protecting it, unlock it and Swords to Plowshares it.',
    keys: [
      'Press “Lock cards” in the list’s toolbar to lock or unlock cards, then “Done”.',
      'A locked card shows a lock beside its remove button.',
      'Committing a version without the card ends its lock.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'roles',
    chapter: '03',
    title: 'How much ramp, draw and removal you need',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'Most decks come up short in the same places: ramp, draw, removal, board wipes and lands. The role strip counts each one against what EDHREC decks like yours usually run.\n\nOne board wipe is a problem in a way eleven creatures rarely is. And ramp to your heart’s content: going over never counts against you.',
    keys: [
      '“12 / 10” means 12 in the deck against a target of 10.',
      'Targets come from decks with your commander, or failing that, decks in your colors.',
      '“EDHREC averages” means measured. “A common starting point” means our default.',
      'Short on a role? “consider →” jumps to cards that fill it.',
    ],
    since: 1,
  },
  {
    id: 'informed-build',
    chapter: '03',
    title: 'Targets that fit your commander',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'How much ramp a deck wants depends on who leads it. A Kinnan deck runs about 20 ramp, twice the usual, and no board wipes at all. Kinnan players already knew.\n\nSo auto-fill, “Choose the last” and “Consider” all aim at what decks with your commander actually run.',
    keys: [
      'Not enough decks to measure? We fall back to 10 ramp, 10 draw, 8 removal, 3 wipes and 37 lands (36 with a partner).',
      'Lands move too: a deck that ramps hard might want 28.',
      'A target of 0 means its decks don’t run that role at all.',
    ],
    since: 8,
  },
  {
    id: 'combo-awareness',
    chapter: '03',
    title: 'Spotting combos you already own',
    route: '/collection',
    opens: 'opens your collection',
    width: 'plate',
    caption:
      'Some cards do something remarkable next to one other card. Heliod, Sun-Crowned and Walking Ballista are a classic pair.\n\nOwn both halves of a combo no deck is using yet? Your Collection flags it and names the partner. While you build, cards that would complete a combo in your deck get flagged in “Consider”, “Choose the last” and search.\n\nThe salt is between you and your table.',
    keys: [
      'A card’s details list every partner: this deck’s first, then ones you own, then ones to buy.',
      'Only two-card combos are flagged.',
      'Combos come from Commander Spellbook.',
    ],
    since: 9,
  },
  {
    id: 'decklist-order',
    chapter: '03',
    title: 'Sorting your decklist',
    route: '/decks',
    opens: 'opens a deck',
    // 'inset' at the canvas, where the figure was a four-row legend. It draws
    // the decklist’s own bar now, which is a full-width row on the deck page.
    width: 'plate',
    caption:
      'Your decklist sits in sections, grouped “By type” or “By role”. Pick an order and each section sorts within itself.',
    keys: [
      'Sort by “Name” or “Mana value”.',
      'On the “Shopping” filter, you can sort by “Price” too.',
    ],
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
      'Know exactly what you want? Type its name in the search under the deck’s tabs. Results start from your Collection, in your commander’s colors.',
    keys: [
      'Turn off “Owned only” to search every card in your commander’s colors.',
      'Nothing you own matches? Press “Search all cards”.',
      'Each result says how many you own, or if it’s already in the deck.',
      'A card another committed deck is holding still adds, with its Availability note.',
    ],
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
      'Pulled something great and not sure where it goes? Press “Find a deck for it” in any card’s details, and The 99 lists the decks that could use it, and why.\n\nThat binder of loose rares finally has somewhere to go.',
    keys: [
      'Decks where it completes a combo come first, then decks whose theme it fits.',
      'Each deck shows its best reason, like a combo or a theme.',
      '“Add” puts the card in that deck’s draft.',
      'Decks already running it sit at the bottom.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'versions',
    chapter: '03',
    title: 'Committing a deck and its versions',
    route: '/decks',
    opens: "opens a deck’s Versions tab",
    width: 'plate',
    caption:
      'Your adds and cuts wait as changes until you commit. Each commit saves a version you can look back on, handy for settling whether last month’s list was better.',
    keys: [
      'A card added to a committed deck claims your copy right away. Other decks see it once you commit.',
      'Each version shows its date, card count and average mana value.',
      'Games you log name their version, so you can see if a change helped.',
      'Open a version to see which of its new cards you own today.',
    ],
    since: 1,
  },
  {
    id: 'shopping',
    chapter: '03',
    title: 'Your shopping list',
    route: '/decks',
    opens: 'opens a deck’s Shopping filter',
    // 'inset' at the canvas, where the figure was two legend rows. It draws
    // real Shopping-filter rows now, and a ~300px column truncated both card
    // names to `Dockside ...` and `R. —`.
    width: 'plate',
    caption:
      'Every card a deck wants that you can’t supply lands on its “Shopping” filter, priced from ManaPool.\n\nA card you own can still show up here. If your Atraxa deck already has your only Sol Ring, your Meren deck needs another.',
    keys: [
      'Each deck’s tile shows how many cards it needs and what they cost.',
      '“To buy, all decks” on Home adds it up across every deck.',
    ],
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
      'Some cards cost more than the job they do. Each deck has a price limit per card, $10 until you set your own, and anything over it gets flagged on “Shopping”.\n\nPress a flagged card’s swap button for cheaper cards, or free copies from your Collection, that do the same job. That $300 dual land has cousins that still come in untapped.',
    keys: [
      'A spell’s stand-ins keep at least one of its jobs, and say what they keep or lose.',
      'Land stand-ins sort by their mana, untapped first.',
      'Changed your mind? “Undo swap” puts the original card back.',
      'Want options for a card that isn’t flagged? Open it from “Shopping” and find its stand-ins in its details.',
    ],
    since: 9,
  },
  {
    id: 'deck-import',
    chapter: '03',
    title: 'Importing a deck, or updating one',
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
      'Built a deck somewhere else? Bring it over. Paste a list or upload a file, and The 99 makes the deck.\n\nAlready have it here? Press “Update from a list” on the deck to bring it up to date.',
    keys: [
      'Paste Moxfield or MTGO text, or upload a CSV from ManaBox, Moxfield or Archidekt.',
      'Updating shows what the new list changes, and lets you keep cards it leaves out.',
      'A line we can’t match still comes over, flagged for you to fix.',
    ],
    since: 1,
  },
  {
    id: 'review-and-commit',
    chapter: '03',
    title: 'Reviewing changes before you commit',
    route: '/decks',
    opens: 'opens the review page',
    width: 'plate',
    // Design R5, with two corrections for the 2026-09-19 vocabulary ruling:
    // the caption opened "A draft becomes a version here", which now reads as
    // the versionless deck rather than the edits, and key line 3 quoted the
    // guard tag as `deck in draft`. Both are copy, so eng resolved them.
    caption:
      '“Review changes” is the last stop before a commit. It shows what your edits ask of the rest of your Collection: which cards are free, which are sleeved in another deck, and which you’d need to buy.\n\nNeed a card that’s sleeved elsewhere? “Pull it” moves your copy over and leaves the other deck a draft to sort out. Say your Kinnan deck takes Atraxa’s only Arcane Signet. She has lifelink. She’ll be fine.',
    keys: [
      'Changed your mind after “Pull it”? Open the deck you pulled from and discard its draft, and the card goes back.',
      'A card leading another deck as its commander stays with that deck.',
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
      'Pick a commander you own, give the deck a name, and that’s it. The 99 fills in the rest.\n\nA commander with partner gets a second slot with only legal pairs, like Tymna and Thrasios. Your pod has been warned.',
    keys: [
      'The list shows every commander you own and can legally build.',
      'The number beside each is how many of your cards fit its colors.',
      'Starting from a commander’s page skips the list and brings your synergy picks along.',
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
      'Love the 99 but not the leader? “Change commander”, on the commander’s art, suggests commanders in the same colors that already play most of your list.\n\nOn a Korvold deck, “41 of 72 are in its decks” beside Prossh means Prossh players already run most of your cards.',
    keys: [
      'Every option shares your deck’s exact colors, so nothing in the 99 has to change.',
      'Commanders you own, or already in the 99, come first.',
      'Press the “41 of 72” count to see which of your cards that commander’s decks run.',
      'Pick one that’s already in the 99 and it swaps places with your old commander.',
      'Changed your mind? “Discard” puts the old commander back.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'undo-removal',
    chapter: '03',
    title: 'Putting a card back',
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
      'Cut a card by mistake? Its row turns into an “Undo” that names it: “Rhystic Study removed”. Your table may be hoping you leave that one out.\n\n“Undo” puts everything back the way it was.',
    keys: [
      'Cut several and each keeps its own “Undo”.',
      '“Undo” disappears once you leave the page. Until you commit, “Put back” on “Review changes” still brings the card back.',
    ],
    since: 1,
  },
  {
    id: 'export',
    chapter: '03',
    title: 'Exporting your deck, or buying what’s missing',
    route: '/decks',
    opens: 'opens the export dialog',
    width: 'plate',
    // R4: the tabs are `Decklist` and `Shopping list` (export-dialog.tsx:2,52);
    // the primary is `Copy to clipboard`, swapping to `Copied ✓` for 1.5s
    // (export-copy-button.tsx:72); the secondary is `Download .txt`
    // (export-dialog.tsx:561). `Buy these at Mana Pool` was already right
    // (decks-builder.ts:472).
    caption:
      'Take your list anywhere as plain text. Moxfield and Archidekt both read it.\n\nOr send just the cards you need to buy straight to Mana Pool, and check out there.',
    keys: [
      '“Copy to clipboard” or “Download .txt” for the full list.',
      'The “Shopping list” tab holds only what this deck needs to buy.',
      '“Buy these at Mana Pool” opens that list in a new tab.',
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
      'Logging a game takes about fifteen seconds: the result, the pod size, and the two or three things that decided it.\n\nGot mana screwed? Mark “Mana” under “What let me down”, and it’s on the record. “Suggested changes” reads your games the next time it runs.',
    keys: [
      '“What worked” and “What let me down” offer the same eight options.',
      'Your history shows the pod size beside each game.',
      'Add a note with what happened. The more detail you give, the better “Suggested changes” can tune the deck.',
    ],
    since: 1,
  },
  {
    id: 'log-findings',
    chapter: '04',
    title: 'What your games are telling you',
    route: '/decks',
    opens: "opens a deck’s Games tab",
    width: 'plate',
    caption:
      'The more games you log, the more the “Games” tab has to say. After a few, it starts spotting patterns, like “Mana is letting this deck down.”',
    keys: [
      'One game is a note, two a leaning, three a finding.',
      'Your marks sort into “Fix” and “Keep”.',
      'Anything marked both ways equally goes under “Mixed”.',
    ],
    since: 1,
  },
  {
    id: 'suggested-changes',
    chapter: '04',
    title: 'Tuning a deck with Suggested changes',
    route: '/decks',
    opens: "opens a deck’s Analysis tab",
    width: 'plate',
    // NO switch (see the header comment above): ANALYSIS_TAB_ENABLED is confirmed on for
    // staging and off for production, so a switch here would hide this entry on production
    // forever rather than announcing it — the opposite of ruling 7's bump.
    caption:
      'Want a second opinion? “Suggested changes”, at the bottom of the “Analysis” tab, offers up to five swaps: a card out, a card in, and why.\n\nTell it what the deck is for: describe your Meren deck as slow graveyard value for casual tables, cap cards at $5, ask for more removal, and the swaps come back as cheap removal you already own.',
    keys: [
      'Limits set the most a card can cost, which sets adds come from, and whether they come only from your Collection.',
      'Each run uses a credit.',
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
