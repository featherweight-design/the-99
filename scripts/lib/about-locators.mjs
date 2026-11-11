// About's halo locators: the element on a capture that a label or a tool crop's halo is drawn around, as Playwright
// selector strings. `scripts/capture-about.mjs` measures each one and writes its box as fractions of the capture.
//
// SCOPE: a locator is resolved inside the page's `<main>` (`onPage`, `scripts/lib/surface.mjs`), never the shell around
// it, EXCEPT a locator that BEGINS with `header` (the phone header, which holds the ? and the search icon), resolved
// from the page. Prefer data-* and aria attributes, with text only through `:has-text()`/`:text-is()` where nothing
// better exists.

// ── About as six visual pages (plan `2026-10-27-about-visual.md`, PR 2) ────────────────────────────────────────────
//
// THE RULE: every label `region` in `ABOUT_SECTIONS` (`src/lib/copy/about-pages.ts`) has an entry here, PER WIDTH: the
// capture that holds it at 390 (`phone`) and at 1300 (`desktop`), each a capture its section lists for that width, and
// the locator measured on that capture. `scripts/capture-about.mjs` shoots the capture, measures the locator's first
// drawn match and writes its box as fractions of the capture; a label whose box is missing fails readiness
// (`src/lib/about/page-shots.test.ts`). The capture per label follows Design's boards (generator `data.py`), not a guess.
//
// SCOPE widens the rule at the top: a locator that BEGINS with `header` (the phone header's ?) or `aside` (the desktop
// rail, which holds the ? at 1300) is resolved from the page (`fromPage`); any other inside the page's `<main>`.
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
  // ---- home: Home's own sections (the figures, the ?) -------------
  "home/home/help": {
    phone: { capture: "p-home", locator: "header [data-help-button='header']:visible" },
    // The rail's ?, pinned at its foot above the account trigger.
    desktop: { capture: "d-home", locator: "aside [data-help-button='rail']:visible" },
  },
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

  // ---- decks: a deck's Your deck. The TOP shot leads with the to-do card (its commit row), the Recommended mix and
  // the toolbar's Lock cards; the LIST shot with the rows. ------------------------------------------------------------
  "decks/your-deck/commit": both("p-deck-top", "d-deck-top", "[data-todo-card] a[href$='/changes']"),
  "decks/your-deck/mix": both("p-deck-top", "d-deck-top", "section[aria-label='Recommended mix']"),
  "decks/your-deck/lock": both("p-deck-top", "d-deck-top", "#panel-deck [data-lock-mode]:visible"),
  // An ownership dot: the row's own edge (a changed row) has no element of its own to box. The frames lead with the first
  // MARKED row (the bracket marks' entry shares them, and the first row sits ~22 rows above it), so the dot is that row's.
  "decks/your-deck/row": both("p-deck-your-deck", "d-deck-list", "[data-decklist-row]:has([data-testid^='card-fact-']) >> nth=0 >> [data-ownership-dot]"),
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

  // ---- shopping: Shopping for all decks, the cart itself in By friend (Small items 7, item 6) ------------------------
  "shopping/all-decks/total": both("p-cart", "d-cart", "[data-cart-checkout]:visible >> nth=0"),
  "shopping/all-decks/decks": both("p-cart", "d-cart", "[data-cart-decks]:visible >> nth=0"),
  "shopping/all-decks/views": both("p-cart", "d-cart", "[role='radiogroup'][aria-label='View']:visible >> nth=0"),
  // The first line whose friend can still be asked (the board's first Ask, Chris's Lightning Greaves; in the fixture, Torin's first row).
  "shopping/all-decks/ask": both("p-cart", "d-cart", "[data-friend-line][data-ask='ask'] [data-cart-ask]:visible >> nth=0"),
  "shopping/all-decks/buy": both("p-cart", "d-cart", "[data-cart-row] button[aria-label^='Bought ']:visible >> nth=0"),

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
