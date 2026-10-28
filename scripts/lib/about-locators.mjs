// About's per-entry halo boxes (discovery R2·6a): for every About entry, the element on its screen's frame that the
// entry's halo is drawn around. `scripts/capture-about.mjs` reads this map: after a screen's steps, and at the moment
// that screen's frame is shot, it measures each locator's box and writes it beside the frame, as fractions of it.
//
// THE RULE: every entry in `src/lib/copy/about-entries.ts` has a key here, and its locator resolves to an element
// VISIBLE inside that entry's 390x844 frame (`screen`; a deck entry's is `deck-<view>`, shot with the tabs at the top).
// A visible entry with no frame or no box fails the readiness test, so a locator that resolves off the frame is a
// failure, not a smaller halo.
//
// When an entry's own control is not on its frame (below the fold, or behind a press: a sheet, a dialog, a tool that
// only exists after an analysis), the locator names the VISIBLE control that reaches it, and says so with
// `reaches: true`. The halo then marks the way in, never a place the frame does not show.
//
// SCOPE: a locator is resolved inside the page's `<main>` (`onPage`, `scripts/lib/surface.mjs`), never the shell
// around it, EXCEPT on `card-details` and `account`, whose frame is a dialog drawn outside `<main>`: those begin at
// `[role='dialog']` and are resolved from the page; and a locator that BEGINS with `header`, the shell's phone header,
// which holds the ? and the search icon (launch-end batch G1), resolved from the page the same way. Selectors are
// Playwright selector strings; prefer data-* and aria attributes, with text only through `:has-text()`/`:text-is()`
// where nothing better exists.

/** @type {Record<string, { screen: string, locator: string, reaches?: true, note?: string }>} */
export const ABOUT_LOCATORS = {
  // ---- home ----------------------------------------------------------------
  "getting-help": { screen: "home", locator: "header [data-help-button='header']:visible" },
  "ready-to-build": { screen: "home", locator: "[data-testid='hero-art-link'] >> nth=0" },
  // The menu and Home line's one entry, drawn in place of Ready to build while the feed is on: the lead story (Home PR 6b), on
  // its own frame, Home photographed with the feed on (`AboutEntry.frame`); `home` is Home without it.
  "whats-new": { screen: "home-feed", locator: "[data-feed-lead]" },
  resume: {
    screen: "home",
    locator: "#home-heading",
    reaches: true,
    note: "the resume rows sit below Ready to build at 390; the greeting heads the page they open",
  },
  commitments: {
    screen: "home",
    locator: "p:has(+ #home-heading)",
    reaches: true,
    note: "the three figures sit below the fold; the kicker's card count is the Collection figure on the frame",
  },

  // ---- collection ----------------------------------------------------------
  // The + entries box its VISIBLE press, `data-about-press` (launch-end batch G7, R1b): beside five tabs a 36 square on
  // the glyph, since the 44 button runs to the frame's edge; with "Add" drawn, the button itself.
  browse: { screen: "collection", locator: "input[aria-label='Search your cards']:visible" },
  "collection-add": { screen: "collection", locator: "[data-testid='collection-add-phone'][data-about-press], [data-testid='collection-add-phone'] [data-about-press]" },
  "card-scan": {
    screen: "collection",
    locator: "[data-testid='collection-add-phone'][data-about-press], [data-testid='collection-add-phone'] [data-about-press]",
    reaches: true,
    note: "the Scan press is inside Add cards; the + opens it",
  },
  "card-search": { screen: "collection", locator: "header button[aria-label='Search all cards']:visible" },
  "start-without-a-collection": {
    screen: "collection",
    locator: "[data-testid='collection-add-phone'][data-about-press], [data-testid='collection-add-phone'] [data-about-press]",
    reaches: true,
    note: "the empty Collection's doors draw only with no cards; + Add is the way in on a held one",
  },
  availability: {
    screen: "collection",
    locator: "[role='group'][aria-label='What the marks on these cards mean'] > span:has-text('In use')",
  },
  "added-copy": {
    screen: "collection",
    locator: "[data-testid='collection-add-phone'][data-about-press], [data-testid='collection-add-phone'] [data-about-press]",
    reaches: true,
    note: "the receipt follows a Save in Add cards",
  },
  "remove-card": {
    screen: "collection",
    locator: "button[aria-label*=' copy, '], button[aria-label*=' copies, '] >> nth=0",
    reaches: true,
    note: "first row: opens the card, then Edit copies",
  },
  "card-marks": { screen: "collection", locator: "[role='group'][aria-label='What the marks on these cards mean']" },
  "combo-awareness": {
    screen: "collection",
    locator: "[role='group'][aria-label='What the marks on these cards mean'] > span:has-text('Two-card combo')",
  },

  // ---- card-details (dialog) -----------------------------------------------
  "card-detail": { screen: "card-details", locator: "[role='dialog'] [data-testid='modal-art-mobile']" },
  "edit-copies": {
    screen: "card-details",
    locator: "[role='dialog'] [data-testid='card-sheet'] button:has-text('All details')",
    reaches: true,
    note: "Edit copies is in the full card details, which All details opens",
  },
  "fits-your-decks": {
    screen: "card-details",
    locator: "[role='dialog'] [data-testid='card-sheet'] button:has-text('All details')",
    reaches: true,
    note: "Find a deck is in the full card details, which All details opens",
  },
  "find-a-deck-read": {
    screen: "card-details",
    locator: "[role='dialog'] [data-testid='card-sheet'] button:has-text('All details')",
    reaches: true,
    note: "the read is drawn under Find a deck, in the full card details All details opens",
  },

  // ---- collection places -----------------------------------------------------
  sets: { screen: "sets", locator: "a[href^='/collection/sets/'] >> nth=0" },
  proxies: { screen: "proxies", locator: "li:has(a[href^='/decks/']) >> nth=0" },
  "collection-history": { screen: "history", locator: "button[aria-label^='Revert '] >> nth=0" },
  wishlist: { screen: "wishlist", locator: "input[aria-label='Search any card by name']" },

  // ---- upload --------------------------------------------------------------
  import: { screen: "upload", locator: "label:has(input[aria-label='Upload collection CSV'])" },
  "upload-choice": {
    screen: "upload",
    locator: "label:has(input[aria-label='Upload collection CSV'])",
    reaches: true,
    note: "the choice is asked once a file is dropped",
  },
  "post-import": {
    screen: "upload",
    locator: "label:has(input[aria-label='Upload collection CSV'])",
    reaches: true,
    note: "the summary follows a confirmed upload",
  },
  "import-issues": {
    screen: "upload",
    locator: "label:has(input[aria-label='Upload collection CSV'])",
    reaches: true,
    note: "Import issues follow an upload with unmatched lines",
  },

  // ---- commanders / discover -----------------------------------------------
  "fit-score": { screen: "commanders", locator: "div:has(> span:has-text(' out of ')) >> nth=0", note: "the first row's fit chip" },
  "commander-lane": { screen: "commanders", locator: "a[href^='/commanders/'][aria-label*=' out of '] >> nth=0" },
  "role-coverage": {
    screen: "commanders",
    locator: "a[href^='/commanders/'][aria-label*=' out of '] >> nth=0",
    reaches: true,
    note: "coverage is on the commander's page",
  },
  "commander-availability": {
    screen: "commanders",
    locator: "a[href^='/commanders/'][aria-label*=' out of '] >> nth=0",
    reaches: true,
    note: "the availability notes are on the commander's page",
  },
  discover: { screen: "discover", locator: "a[href^='/commanders/'][aria-label*=' out of '] >> nth=0" },

  // ---- new deck --------------------------------------------------------------
  "help-me-choose": { screen: "new-deck", locator: "[data-testid='help-me-choose-door'] a >> nth=0" },
  partners: {
    screen: "new-deck",
    locator: "[data-picker-row] >> nth=0",
    reaches: true,
    note: "Add a partner appears once a partner commander is picked",
  },
  "deck-import": {
    screen: "new-deck",
    locator: "input[aria-label='Search commanders']",
    reaches: true,
    note: "the import's own entry is not on this frame; the picker is where a paste lands",
  },
  "new-deck": { screen: "new-deck", locator: "input[aria-label='Search commanders']" },
  precons: { screen: "new-deck", locator: "[data-testid='precon-door'] a" },
  "upcoming-precons": {
    screen: "new-deck",
    locator: "[data-testid='precon-door'] a",
    reaches: true,
    note: "upcoming sets head the precon list",
  },

  // ---- decks -----------------------------------------------------------------
  "all-decks-cart": { screen: "decks", locator: "a[href='/decks/shopping']" },
  "decks-stats": { screen: "decks", locator: "[role='tablist'][aria-label='Show decks as'] [role='tab']:has-text('Stats')" },
  statuses: { screen: "decks", locator: "[data-deck-chips] > span >> nth=0", note: "the first tile's status pill" },
  folders: { screen: "decks", locator: "[data-shelf-trigger] button[aria-haspopup='dialog']" },

  // ---- deck: Your deck -------------------------------------------------------
  "deck-page": { screen: "deck-your-deck", locator: "[role='tablist']:has(#tab-deck)" },
  "auto-fill": {
    screen: "deck-your-deck",
    locator: "[data-toolbar-group] [role='tab'] >> nth=0",
    reaches: true,
    note: "All: auto tags draw only on auto-filled rows, and this deck has none",
  },
  "decklist-marks": { screen: "deck-your-deck", locator: "[role='group'][aria-label='What the marks on these rows mean']" },
  "locked-cards": { screen: "deck-your-deck", locator: "#panel-deck button:has-text('Lock cards')" },
  // The status line's `∞ N combos one piece away` segment, beside the version (combos-close UI-1).
  "combos-one-away": {
    screen: "deck-your-deck",
    locator: "#tab-deck",
    reaches: true,
    note: "the `∞ N combos one piece away` segment is on the status line beside the version, above the tabs",
  },
  roles: {
    screen: "deck-your-deck",
    locator: "[role='radiogroup'][aria-label='Group the list'] [role='radio']:has-text('By role')",
    note: "the role strip is above the tabs; By role groups the list by it",
  },
  "informed-build": {
    screen: "deck-your-deck",
    locator: "#tab-consider",
    reaches: true,
    note: "the targets are the role strip above the tabs and Consider's aim",
  },
  "decklist-order": { screen: "deck-your-deck", locator: "button[aria-label^='Sort the deck list']" },
  "add-cards": { screen: "deck-your-deck", locator: "[data-testid='quick-add-dock'] [role='combobox']" },
  "deck-tokens": {
    screen: "deck-your-deck",
    locator: "[role='radiogroup'][aria-label='Group the list'] [role='radio']:has-text('By type')",
    reaches: true,
    note: "the Tokens group follows the last type group, below the fold",
  },
  "change-commander": {
    screen: "deck-your-deck",
    locator: "#tab-deck",
    reaches: true,
    note: "the door is on the commander's art, above the tabs",
  },
  "undo-removal": {
    screen: "deck-your-deck",
    locator: "[data-decklist-row] button[aria-label^='Remove '] >> nth=0",
    reaches: true,
    note: "the row's ✕; Undo replaces the row after it",
  },
  export: {
    screen: "deck-your-deck",
    locator: "#tab-deck",
    reaches: true,
    note: "Export is in the deck's head, above the tabs",
  },
  "deck-printings": {
    screen: "deck-your-deck",
    locator: "[data-decklist-row] >> nth=0",
    reaches: true,
    note: "opens the card, where the printing is picked",
  },

  // ---- deck: Shopping --------------------------------------------------------
  "buy-tag": { screen: "deck-shopping", locator: "button[aria-label^='Bought '] >> nth=0" },
  shopping: { screen: "deck-shopping", locator: "[data-shopping-filter]" },
  "stand-ins": { screen: "deck-shopping", locator: "[data-testid='other-ways'] >> nth=0" },
  "friend-spares": { screen: "deck-shopping", locator: "[data-testid='other-ways']:has([data-testid='spare-glyph']) >> nth=0" },
  "shopping-got-it": { screen: "deck-shopping", locator: "button[aria-label^='Bought '] >> nth=0" },

  // ---- deck: Stats, Notes ----------------------------------------------------
  "deck-stats": { screen: "deck-stats", locator: "[data-stats-card] >> nth=0" },
  notes: { screen: "deck-notes", locator: "input[placeholder^='Add a note']" },

  // ---- deck: Analysis --------------------------------------------------------
  "deck-analysis": { screen: "deck-analysis", locator: "#panel-analysis button:has-text('Analyze')" },
  "deck-benchmarks": {
    screen: "deck-analysis",
    locator: "#panel-analysis button:has-text('Analyze')",
    reaches: true,
    note: "benchmarks draw with an analysis",
  },
  "suggested-changes": { screen: "deck-analysis", locator: "#tab-analysis", reaches: true, note: "a tool on an analyzed deck" },
  "proposed-cuts": { screen: "deck-analysis", locator: "#tab-analysis", reaches: true, note: "a tool on an analyzed deck" },
  "mana-balance": { screen: "deck-analysis", locator: "#tab-analysis", reaches: true, note: "a tool on an analyzed deck" },
  "deck-focus": { screen: "deck-analysis", locator: "#tab-analysis", reaches: true, note: "the strategy ring sits below the frame on an analyzed deck" },
  credits: {
    screen: "deck-analysis",
    locator: "#panel-analysis button:has-text('Analyze')",
    reaches: true,
    note: "the credit line follows a press",
  },

  // ---- deck: Games -----------------------------------------------------------
  "log-a-game": { screen: "deck-games", locator: "#panel-games button:has-text('Log a game') >> nth=0" },
  "log-findings": { screen: "deck-games", locator: "section[aria-labelledby='game-matchups-heading']" },
  opponents: { screen: "deck-games", locator: "#panel-games div:has(> span:text-is('vs')) >> nth=0", note: "the newest game's vs line" },

  // ---- deck: Versions --------------------------------------------------------
  versions: { screen: "deck-versions", locator: "#panel-versions button[aria-expanded] >> nth=0", note: "the current version" },
  "review-and-commit": {
    screen: "deck-versions",
    locator: "#panel-versions button[aria-expanded] >> nth=0",
    reaches: true,
    note: "the review page opens from a draft's Commit; the current version is what it wrote",
  },

  // ---- friends, account --------------------------------------------------------
  friends: { screen: "friends", locator: "button:has-text('Add a friend') >> nth=0" },
  "friend-decks": { screen: "friends", locator: "[data-decks-seen]" },
  invites: { screen: "friends", locator: "[data-about-invite]", note: "Add a friend with the count line under it, one box" },
  "rule-zero": { screen: "friends", locator: "[data-testid='pod-rule-zero'] >> nth=0" },
  themes: { screen: "account", locator: "[role='dialog'] [role='radiogroup']" },
  "about-rebuilt": {
    screen: "account",
    locator: "[role='dialog'] a[href='/about'], [role='menu'] a[href='/about']",
    reaches: true,
    note: "the account menu's About The 99 row opens the page it describes",
  },

  // ---- settings ------------------------------------------------------------------
  // Push notifications (handoff A3): the device row at the top of the push column, read Not on yet on the frame.
  push: { screen: "settings", locator: "[data-push-device]", note: "the device row, at the top of What's new on Home's push column" },

  // ---- credits -------------------------------------------------------------------
  "buying-credits": { screen: "credits", locator: "section:has([data-testid='credits-total'])", note: "the balance strip" },
};

// ── About as six visual pages (plan `2026-10-27-about-visual.md`, PR 2) ────────────────────────────────────────────
//
// THE RULE: every label `region` in `ABOUT_SECTIONS` (`src/lib/copy/about-pages.ts`) has an entry here, PER WIDTH: the
// capture that holds it at 390 (`phone`) and at 1300 (`desktop`), each a capture its section lists for that width, and
// the locator measured on that capture. `scripts/capture-about.mjs` shoots the capture, measures the locator's first
// drawn match and writes its box as fractions of the capture; a label whose box is missing fails readiness
// (`src/lib/about/page-shots.test.ts`). The capture per label follows Design's boards (generator `data.py`), not a guess.
//
// SCOPE is the R2·6a rule above, widened: a locator that BEGINS with `header` (the phone header's ?) or `aside` (the
// desktop rail, which holds the ? at 1300) is resolved from the page (`fromPage`); any other inside the page's `<main>`.
// `reaches: true` marks a box that is the visible way in to a control the capture cannot show.

/** True when `locator` is resolved from the page rather than inside `<main>` (the shell's header or rail). */
export function fromPage(locator) {
  return /^(header|aside)\b/.test(locator);
}

const both = (phone, desktop, locator, extra = {}) => ({
  phone: { capture: phone, locator, ...extra },
  desktop: { capture: desktop, locator, ...extra },
});

/** @type {Record<string, { phone: { capture: string, locator: string, reaches?: true }, desktop: { capture: string, locator: string, reaches?: true } | null }>} */
export const ABOUT_REGIONS = {
  // ---- home: Home photographed without the feed (Ready to build), the capture's `CAPTURE_FEED=off` pass -------------
  "home/home/help": {
    phone: { capture: "p-home", locator: "header [data-help-button='header']:visible" },
    // The rail's ?, pinned at its foot above the account trigger.
    desktop: { capture: "d-home2", locator: "aside [data-help-button='rail']:visible" },
  },
  "home/home/ready": both("p-home", "d-home", "[data-ready-to-build]"),
  // The figures sit below the fold at 390, so the phone has a second shot scrolled to them.
  "home/home/in-use": both("p-home-in-use", "d-home", "[data-commitments]"),
  "home/whats-new/lead": both("p-home-feed", "d-home-feed", "[data-feed-lead]"),

  // ---- collection ------------------------------------------------------------------------------------------------
  "collection/cards/tabs": both("p-collection", "d-collection2", "nav[aria-label='Collection sections']"),
  "collection/cards/add": {
    phone: {
      capture: "p-collection",
      locator: "[data-testid='collection-add-phone'][data-about-press], [data-testid='collection-add-phone'] [data-about-press]",
    },
    // A different element at 1300: the head's Add button (`hidden md:flex`).
    desktop: { capture: "d-collection2", locator: "[data-testid='collection-add']:visible" },
  },
  "collection/cards/key": both("p-collection", "d-collection2", "[role='group'][aria-label='What the marks on these cards mean']"),
  // A tile's In use mark: every copy in a committed deck (`AvailabilityMarker`'s `hard` state).
  "collection/cards/taken": both("p-collection", "d-collection2", "[data-availability='hard']:visible >> nth=0"),
  "collection/upload/drop": both("p-upload", "d-upload", "label:has(input[aria-label='Upload collection CSV'])"),

  // ---- commanders ------------------------------------------------------------------------------------------------
  "commanders/for-you/places": both("p-commanders", "d-commanders", "nav[aria-label='Commanders sections']"),
  "commanders/for-you/fit": both("p-commanders", "d-commanders", "[data-fit-chip] >> nth=0"),
  "commanders/for-you/styles": both("p-commanders", "d-commanders", "[data-testid='row-gap'] >> nth=0"),
  "commanders/discover/order": both("p-discover", "d-discover", "[aria-label='Order']:visible >> nth=0"),

  // ---- decks: Your decks -----------------------------------------------------------------------------------------
  "decks/your-decks/new-deck": both("p-decks", "d-decks2", "a[href='/decks/new']:visible >> nth=0"),
  "decks/your-decks/precons": both("p-decks", "d-decks2", "a[href='/decks/precons']:visible >> nth=0"),
  "decks/your-decks/deck-status": both("p-decks", "d-decks2", "[data-deck-chips] > span >> nth=0"),
  "decks/your-decks/decks-stats": both(
    "p-decks",
    "d-decks2",
    "[role='tablist'][aria-label='Show decks as'] [role='tab']:has-text('Stats')",
  ),
  "shopping/all-decks/cart": both("p-decks", "d-decks2", "a[href='/decks/shopping']:visible >> nth=0"),

  // ---- decks: a deck's Your deck. The TOP shot leads with the to-do card (its commit row), the Recommended mix and
  // the toolbar's Lock cards; the LIST shot with the rows. ------------------------------------------------------------
  "decks/your-deck/commit": both("p-deck-top", "d-deck-top", "[data-todo-card] a[href$='/changes']"),
  "decks/your-deck/mix": both("p-deck-top", "d-deck-top", "section[aria-label='Recommended mix']"),
  "decks/your-deck/lock": both("p-deck-top", "d-deck-top", "#panel-deck [data-lock-mode]:visible"),
  // The first row's ownership dot: the row's own edge (a changed row) has no element of its own to box.
  "decks/your-deck/row": both("p-deck-your-deck", "d-deck-list", "[data-decklist-row] >> nth=0 >> [data-ownership-dot]"),
  "decks/your-deck/bracket-marks": both(
    "p-deck-your-deck",
    "d-deck-list",
    "[data-decklist-row] [data-testid^='card-fact-']:visible >> nth=0",
  ),

  // ---- decks: Analysis. The phone's first shot is a deck with NO analysis (Analyze and the Describe field), its second
  // the Played deck's stored analysis (the findings), its third the Played deck's tuning hub. At 1300 the analyzed
  // Played deck holds the head, the findings and two tiles; the un-analyzed deck the Describe field and Mana Balance. --
  "decks/analysis/bracket": {
    phone: { capture: "p-deck-analysis", locator: "#panel-analysis button:has-text('Analyze')" },
    desktop: { capture: "d-analysis", locator: "#panel-analysis [data-testid='verdict-cell']" },
  },
  "decks/analysis/findings": both("p-deck-analysis-read", "d-analysis", "[data-testid='findings-block']"),
  // At 1300 the analyzed deck's head, findings and tuning hub do not share a 900px frame (the overview, How it plays,
  // Dependencies and the strategy ring sit between them), so the hub has its own shot, as at 390.
  "decks/analysis/suggested": both("p-analysis-tuning", "d-analysis-tuning", "[data-tool-tile='suggested'] >> nth=0"),
  "decks/analysis/cuts": both("p-analysis-tuning", "d-analysis-tuning", "[data-tool-tile='cuts'] >> nth=0"),
  "decks/analysis/describe": both("p-deck-analysis", "d-analysis-describe", "#deck-description-field"),
  "decks/analysis/mana": both("p-analysis-tuning", "d-analysis-describe", "[data-tool-tile='mana'] >> nth=0"),

  // ---- decks: Versions, Games, Stats, Notes ----------------------------------------------------------------------
  "decks/versions/version": both("p-deck-versions", "d-versions-precon", "#panel-versions button[aria-expanded] >> nth=0"),
  "decks/versions/precon-link": both("p-deck-versions", "d-versions-precon", "#panel-versions [data-precon-link-row]"),
  "decks/games/log": both("p-deck-games", "d-games", "#panel-games button:has-text('Log a game') >> nth=0"),
  "decks/games/matchups": both("p-deck-games", "d-games", "section[aria-labelledby='game-matchups-heading']"),
  "decks/stats/curve": both("p-deck-stats", "d-stats", "[data-stats-card='curve']"),
  "decks/notes/note": both("p-deck-notes", "d-notes", "input[placeholder^='Add a note']"),

  // ---- shopping: a deck's Shopping ---------------------------------------------------------------------------------
  "shopping/deck-shopping/total": both("p-deck-shopping", "d-shopping", "[data-price-strip]:visible >> nth=0"),
  "shopping/deck-shopping/limit": both("p-deck-shopping", "d-shopping", "[data-testid='stand-in-limit']:visible >> nth=0"),
  "shopping/deck-shopping/standins": both(
    "p-deck-shopping",
    "d-shopping",
    "[data-testid='other-ways']:has([data-testid='standin-glyph']) >> nth=0",
  ),
  "shopping/deck-shopping/spare": both(
    "p-deck-shopping",
    "d-shopping",
    "[data-testid='other-ways']:has([data-testid='spare-glyph']) >> nth=0",
  ),
  "shopping/deck-shopping/buy": both("p-deck-shopping", "d-shopping", "button[aria-label^='Bought '] >> nth=0"),

  // ---- friends -----------------------------------------------------------------------------------------------------
  "friends/friends/face": both("p-friends", "d-friends", "[data-face-button]:visible >> nth=0"),
  "friends/friends/add": both("p-friends", "d-friends", "[data-about-invite] button:has-text('Add a friend'):visible >> nth=0"),
  "friends/friends/friend": both("p-friends", "d-friends", "[data-friend-row] a >> nth=0"),
  "friends/friends/pod": both("p-friends", "d-friends", "[data-testid='pod-card'] >> nth=0"),
  // About pod's own row; the phone frame is scrolled just far enough that it clears the tab bar (`reveal`).
  "friends/friends/rule0": both("p-friends", "d-friends", "[data-testid='pod-rule-zero'] >> nth=0"),
};

/**
 * A tool card's picture at 1300 (plan PR 2, Task 2.2): a crop of one desktop capture around the tool's control, the
 * capture per Design's boards (`data.py`, TOOL_DESK). The capture writes it to
 * `public/about/pages/<theme>/desktop/tools/<toolId>.webp`, with the control's box as fractions of the crop. Where the
 * tool's control is the label the card aims at, the locator is that label's.
 *
 * @type {Record<string, { capture: string, locator: string }>}
 */
export const TOOL_REGIONS = {
  lineup: { capture: "d-decks2", locator: ABOUT_REGIONS["decks/your-decks/decks-stats"].desktop.locator },
  precons: { capture: "d-decks2", locator: ABOUT_REGIONS["decks/your-decks/precons"].desktop.locator },
  "top-off": { capture: "d-deck-top", locator: ABOUT_REGIONS["decks/your-deck/mix"].desktop.locator },
  "suggested-changes": { capture: "d-analysis-tuning", locator: ABOUT_REGIONS["decks/analysis/suggested"].desktop.locator },
  "proposed-cuts": { capture: "d-analysis-tuning", locator: ABOUT_REGIONS["decks/analysis/cuts"].desktop.locator },
  "mana-balance": { capture: "d-analysis-describe", locator: ABOUT_REGIONS["decks/analysis/mana"].desktop.locator },
  matchups: { capture: "d-games", locator: ABOUT_REGIONS["decks/games/matchups"].desktop.locator },
  "find-a-deck": { capture: "d-collection2", locator: ABOUT_REGIONS["collection/cards/taken"].desktop.locator },
  wishlist: { capture: "d-collection2", locator: "nav[aria-label='Collection sections'] a[href='/collection/wishlist']" },
  "collection-sync": { capture: "d-upload", locator: ABOUT_REGIONS["collection/upload/drop"].desktop.locator },
  "help-me-choose": { capture: "d-discover", locator: "nav[aria-label='Commanders sections'] a[href='/commanders/choose']" },
  "stand-ins": { capture: "d-shopping", locator: ABOUT_REGIONS["shopping/deck-shopping/standins"].desktop.locator },
  "friend-spares": { capture: "d-shopping", locator: ABOUT_REGIONS["shopping/deck-shopping/spare"].desktop.locator },
  friends: { capture: "d-friends", locator: ABOUT_REGIONS["friends/friends/add"].desktop.locator },
};
