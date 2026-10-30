// src/lib/copy/about-pages.ts: About as six visual pages (handoff `design/design_handoff_the99_about_visual/`, R3).
//
// The source of truth for the six pages: each area, each section (one screen of the app), its labels (numbered pins on the
// capture) and its Good to know rules. Transcribed from the handoff's `copy-strings.ts` after the /copy-review pass of the
// About visual build's PR 1; the verdict table is in that PR's body.
//
// A label or rule is the announced unit (audit option B). `legacy` names the old entry ids its words came from, so a
// reader who saw them is not told again (`src/lib/about/pages-visible.ts`). `sentences` gates a sentence of `rest` or
// `text` on a switch of its own, matched by its exact text, as `captionLineSwitches` does for an entry.

import { HISTORY_RETENTION_DAYS } from "../collection/retention";
import { NOVELTY_FLOOR } from "../discovery/floor";
import type { AboutLineSwitch, AboutScreen, DeckView } from "./about";

/** History keeps what its retention keeps, so its sentence says how far back, as the legacy entry did. */
const HISTORY_LINE = ` History lists your changes from the last ${HISTORY_RETENTION_DAYS} days.`;

export const ABOUT_AREA_IDS = ["home", "collection", "commanders", "decks", "shopping", "friends"] as const;
export type AboutArea = (typeof ABOUT_AREA_IDS)[number];

export interface AboutAreaCopy { id: AboutArea; name: string; line: string }

/** One screen a section covers: an About screen, and for the deck screen which of its views. */
export type AboutScreenRef = { screen: Exclude<AboutScreen, "deck"> } | { screen: "deck"; view: DeckView };

export interface AboutLabel {
  id: string;
  /** The anchor measured on the capture (`scripts/lib/about-locators.mjs`, ABOUT_REGIONS). */
  region: string;
  lead: string;
  rest: string;
  switch: AboutLineSwitch | null;
  sentences?: Partial<Record<string, AboutLineSwitch>>;
  since: number;
  legacy: readonly string[];
}

export interface AboutRule {
  text: string;
  switch: AboutLineSwitch | null;
  sentences?: Partial<Record<string, AboutLineSwitch>>;
  since: number;
  legacy: readonly string[];
  /** The rule card's small diagram (handoff call 2), drawn from the app's own shapes with these fixtures. */
  diagram: AboutRuleDiagram;
}

/**
 * The shape a rule's diagram is built around (call 2 names five; the boards also draw a split bar for the fill and a
 * row of chips for what friends see). Each rule's kind and fixtures are transcribed from the boards (Decks-Phone,
 * Other-Pages), with their fixtures moved to match the shipped rule text where /copy-review rewrote it.
 */
export type AboutRuleDiagramKind = "card-row" | "deck-tile" | "buy-tag" | "bracket-medal" | "role-cell" | "split" | "chips";

/** A tag's ink: `short` is the availability marker's, the rest the theme's. */
export type AboutDiagramTone = "muted" | "accent" | "success" | "short";

/** A fixture price, drawn by the shipped buy tag: live, foil only, sold out (no live printing) or none at all. */
export type AboutDiagramPrice =
  | { state: "priced"; cents: number }
  | { state: "foilOnly"; cents: number }
  | { state: "soldOut" }
  | { state: "absent" };

/** One piece of a diagram. A piece with a `switch` is drawn only while it resolves on, as a sentence is. */
export type AboutDiagramPart = { switch?: AboutLineSwitch } & (
  /** A mono caption, set in capitals; a `muted` one is a lowercase note, as the boards set both. */
  | { part: "caption"; text: string; muted?: boolean }
  | {
      part: "row";
      name: string;
      dot?: "owned" | "unowned";
      lock?: boolean;
      proxy?: boolean;
      /** The row the draft changed (the decklist's bright edge). */
      edge?: boolean;
      /** Gone from the list: its name struck through in the muted ink, its tag at full strength. */
      gone?: boolean;
      /** Set back (a draft, a run that came to nothing): its edge drawn dashed. No part is ever drawn translucent. */
      dim?: boolean;
      /** The boards' small row, 22px, for a column of names. */
      compact?: boolean;
      tag?: { text: string; tone: AboutDiagramTone };
      price?: AboutDiagramPrice;
    }
  | { part: "tile"; name: string; status: "Complete" | "To buy" | "Draft"; colors: readonly string[] }
  /** Where a tile is not: a dashed plate the tile's size, holding a note. */
  | { part: "void"; text: string }
  | { part: "buy"; price: AboutDiagramPrice; note: string }
  | { part: "medal"; bracket: 1 | 2 | 3 | 4 | 5 }
  /** Between two columns: an arrow, an or, a not-equal, with an optional word under it. */
  | { part: "between"; glyph: string; label?: string }
  | { part: "cells"; cells: readonly { label: string; have: number; target: number }[] }
  | { part: "split"; parts: readonly { label: string; n: number; tone: "success" | "fact" | "accent" }[] }
  | { part: "chips"; chips: readonly { text: string; never?: boolean; switch?: AboutLineSwitch }[] }
);

/**
 * A diagram: an optional head, its columns side by side (one column is a stack), and an optional foot. A head or foot is
 * a parts list (one centred stack) or a full column at its own width (Small items 3, item 1).
 *
 * A row never sits in a side-by-side column (Small items 3, item 1): every row is in a column 250px wide or more, and
 * that column is the diagram's only one or its head or foot. Only tiles, the empty slot, medals and captions sit side by
 * side. `about-pages.test.ts` pins it, so no row's name gives way to its tag.
 */
export interface AboutRuleDiagram {
  kind: AboutRuleDiagramKind;
  head?: readonly AboutDiagramPart[] | AboutDiagramColumn;
  columns: readonly AboutDiagramColumn[];
  /** The space between columns, where the board sets one other than 10. */
  gap?: number;
  foot?: readonly AboutDiagramPart[] | AboutDiagramColumn;
}

/** A head or foot as the column it draws: a bare parts list is one centred stack. */
export const diagramColumn = (x: readonly AboutDiagramPart[] | AboutDiagramColumn): AboutDiagramColumn =>
  "parts" in x ? x : { parts: x, center: true };

/** One column of a diagram: its parts stacked, at the board's width and gap, centred or flush left. */
export interface AboutDiagramColumn {
  parts: readonly AboutDiagramPart[];
  w?: number;
  gap?: number;
  center?: boolean;
}

export interface AboutSection {
  area: AboutArea;
  id: string;
  name: string;
  /** One or two sentences on what the screen offers, drawn from its own labels, rules and tools (Small items 3, item 4). */
  sub: string;
  /** A sentence of `sub` naming a switched feature, gated on that switch as a label's `sentences` are. Never announced:
   *  the section's labels are. A section whose every label hangs on one switch gates all of its own sentences on it, and
   *  carries `ABOUT_SCREEN_OFF` under the negated switch for while it is off. */
  subSentences?: Partial<Record<string, AboutLineSwitch>>;
  screens: readonly AboutScreenRef[];
  /** The section's captures in reading order; a second shot of the same screen numbers on from the first. */
  captures: { phone: readonly string[]; desktop: readonly string[] };
  labels: readonly AboutLabel[];
  rules: readonly AboutRuleId[];
  /** Tool ids (`src/lib/discovery/tools.ts`); checked there, since this module sits below it. */
  tools: readonly string[];
}

export const ABOUT_AREAS: readonly AboutAreaCopy[] = [
  { id: "home", name: "Home", line: "What’s new, what to build next, and the decks you left off." },
  { id: "collection", name: "Collection", line: "Every card you own, and how cards get in." },
  { id: "commanders", name: "Commanders", line: "Who to build next, from what you own or what’s worth buying." },
  { id: "decks", name: "Decks", line: "Building a deck, reading it, and keeping its versions." },
  { id: "shopping", name: "Shopping", line: "What your decks still need, and the cheaper ways to get it." },
  { id: "friends", name: "Friends", line: "The people you play with, your pods, and what they can see." },
];

export const ABOUT_RULE_IDS = [
  "autofill",
  "lock",
  "targets",
  "pick",
  "intent",
  "credits",
  "commit",
  "one-copy",
  "never-decklist",
  "replace",
  "own-it",
  "prices",
  "proxy",
  "friends-see",
  "hidden-deck",
  "invites",
] as const;
export type AboutRuleId = (typeof ABOUT_RULE_IDS)[number];

/** Each unit's `since` is the highest `since` of its unswitched legacy entries, or 16 (`ABOUT_VERSION` at the build) when it
 *  has none. The values are written out here; `about-pages.test.ts` re-derives every one from the entries and pins it. */
/** A section's sub-line while the switch its screen hangs on is off: the section is still drawn (it keeps its place in the
 *  page's count), so its sub says the screen is off rather than describing it. */
export const ABOUT_SCREEN_OFF = " This screen isn’t on for you.";

export const ABOUT_SECTIONS: readonly AboutSection[] = [
  {
    area: "home",
    id: "home",
    name: "Home",
    sub: "Where every visit starts: your latest decks, and how far along each one is. It also picks two of your best-fit commanders to build.",
    subSentences: { " It also picks two of your best-fit commanders to build.": "!HOME_FEED_ENABLED" },
    screens: [{ screen: "home" }],
    captures: { phone: ["p-home", "p-home-in-use"], desktop: ["d-home"] },
    labels: [
      {
        id: "help",
        region: "home/home/help",
        lead: "The ?",
        rest: " opens help for the screen you’re on.",
        switch: "HELP_PANEL_ENABLED",
        since: 16,
        legacy: ["getting-help", "about-rebuilt"],
      },
      {
        id: "ready",
        region: "home/home/ready",
        lead: "Ready to build",
        rest: " shows two commanders you could build today from cards you own. They change every day.",
        switch: "!HOME_FEED_ENABLED",
        since: 1,
        legacy: ["ready-to-build"],
      },
      {
        id: "in-use",
        region: "home/home/in-use",
        lead: "Cards in use",
        rest: " counts only committed decks. “Spoken for twice” means your decks want more copies of a card than you own.",
        switch: null,
        since: 1,
        legacy: ["availability", "commitments"],
      },
    ],
    rules: [],
    tools: [],
  },
  {
    area: "home",
    id: "whats-new",
    name: "What’s new",
    sub: `News you choose to hear about, newest first, such as a new set or a combo you can now make. Within Today and Earlier, anything waiting on you comes first.${ABOUT_SCREEN_OFF}`,
    subSentences: {
      "News you choose to hear about, newest first, such as a new set or a combo you can now make.": "HOME_FEED_ENABLED",
      // Only a spare request ever waits on you (`feedOrder`), and it is a kind only with spare requests on.
      " Within Today and Earlier, anything waiting on you comes first.": ["HOME_FEED_ENABLED", "SPARE_REQUESTS_ENABLED"],
      [ABOUT_SCREEN_OFF]: "!HOME_FEED_ENABLED",
    },
    screens: [{ screen: "home" }],
    captures: { phone: ["p-home-feed"], desktop: ["d-home-feed"] },
    labels: [
      {
        id: "lead",
        region: "home/whats-new/lead",
        lead: "The top story",
        rest: " is the one thing you haven’t seen yet that matters most. You choose what can lead in Settings: a new set, a combo you can now make, and more.",
        switch: "HOME_FEED_ENABLED",
        since: 16,
        legacy: ["whats-new"],
      },
    ],
    rules: [],
    tools: [],
  },
  {
    area: "collection",
    id: "cards",
    name: "Cards",
    sub: "Everything you own, card by card, and which copies your decks are holding. Add cards by name or scan them in.",
    subSentences: { " Add cards by name or scan them in.": ["COLLECTION_EDIT_ENABLED"] },
    screens: [{ screen: "collection" }],
    captures: { phone: ["p-collection"], desktop: ["d-collection2"] },
    labels: [
      {
        id: "tabs",
        region: "collection/cards/tabs",
        lead: "Cards, Sets and Proxies",
        rest: ` are your Collection’s tabs.${HISTORY_LINE} Wishlist holds the cards you’re after.`,
        switch: null,
        sentences: {
          [HISTORY_LINE]: "COLLECTION_EDIT_ENABLED",
          " Wishlist holds the cards you’re after.": "SOCIAL_WISHLIST_ENABLED",
        },
        since: 1,
        legacy: ["browse", "sets", "collection-history", "wishlist"],
      },
      {
        id: "add",
        region: "collection/cards/add",
        lead: "The +",
        rest: " adds cards by name. You can scan them in too.",
        switch: "COLLECTION_EDIT_ENABLED",
        sentences: {
          " You can scan them in too.": "CARD_SCAN_ENABLED",
        },
        since: 16,
        legacy: ["collection-add", "card-scan", "card-search"],
      },
      {
        id: "key",
        region: "collection/cards/key",
        lead: "The key",
        rest: " explains every mark a card can carry.",
        switch: null,
        since: 1,
        legacy: ["availability", "decklist-marks"],
      },
      {
        id: "taken",
        region: "collection/cards/taken",
        lead: "In use",
        rest: " means committed decks hold every copy you own.",
        switch: null,
        since: 3,
        legacy: ["availability", "commander-availability"],
      },
    ],
    rules: ["one-copy", "never-decklist"],
    tools: ["find-a-deck", "wishlist"],
  },
  {
    area: "collection",
    id: "upload",
    name: "Upload a file",
    sub: "Bring in an export from another app or paste a list, and look over the import before you confirm it.",
    screens: [{ screen: "upload" }],
    captures: { phone: ["p-upload"], desktop: ["d-upload"] },
    labels: [
      {
        id: "drop",
        region: "collection/upload/drop",
        lead: "Drop in a CSV",
        rest: " from ManaBox, Moxfield, Archidekt or Deckbox, or paste a list. Nothing changes until you confirm.",
        switch: null,
        since: 1,
        legacy: ["import", "upload-choice"],
      },
    ],
    rules: ["replace"],
    tools: ["collection-sync"],
  },
  {
    area: "commanders",
    id: "for-you",
    name: "For you",
    sub: "Commanders you own, ranked by how well the rest of your cards suit each one.",
    screens: [{ screen: "commanders" }],
    captures: { phone: ["p-commanders"], desktop: ["d-commanders"] },
    labels: [
      {
        id: "places",
        region: "commanders/for-you/places",
        lead: "For you and Discover",
        rest: " are two ways to find your next commander. Help me choose asks a few questions and picks for you.",
        switch: "COMMANDERS_PLACE_ENABLED",
        sentences: {
          " Help me choose asks a few questions and picks for you.": "HELP_ME_CHOOSE_ENABLED",
        },
        since: 1,
        legacy: ["commander-lane", "discover", "help-me-choose"],
      },
      {
        id: "fit",
        region: "commanders/for-you/fit",
        lead: "The fit score",
        rest: " says how well your cards suit a commander, out of 100, or out of 40 for one EDHREC has no decks for yet.",
        switch: null,
        since: 1,
        legacy: ["fit-score"],
      },
      {
        id: "styles",
        region: "commanders/for-you/styles",
        lead: "Play styles",
        rest: " come from the decks EDHREC tracks for that commander.",
        switch: null,
        since: 16,
        legacy: [],
      },
    ],
    rules: [],
    tools: ["help-me-choose"],
  },
  {
    area: "commanders",
    id: "discover",
    name: "Discover",
    sub: "Commanders worth buying: ones EDHREC tracks that you don’t own and haven’t built a deck around. Search them, or narrow them by color or set.",
    screens: [{ screen: "discover" }],
    captures: { phone: ["p-discover"], desktop: ["d-discover"] },
    labels: [
      {
        id: "order",
        region: "commanders/discover/order",
        lead: "Order",
        rest: ` sorts the list, and you pick it. Best fit ranks by how many of a commander’s popular cards you own. Something new ranks by how many of its themes your decks don’t play yet, and shows only commanders whose EDHREC card list you own at least ${Math.round(NOVELTY_FLOOR * 100)}% of. Popularity counts the decks EDHREC tracks. Name goes A to Z, and Recently released puts the newest first.`,
        switch: null,
        since: 1,
        legacy: ["discover"],
      },
    ],
    rules: [],
    tools: [],
  },
  {
    area: "decks",
    id: "your-decks",
    name: "Your decks",
    sub: "Your decks, each with its status. Start one from a commander, or import a list you already play.",
    screens: [{ screen: "decks" }],
    captures: { phone: ["p-decks"], desktop: ["d-decks2"] },
    labels: [
      {
        id: "new-deck",
        region: "decks/your-decks/new-deck",
        lead: "New deck",
        rest: " starts from a commander. Import brings in a list you already play.",
        switch: null,
        since: 7,
        legacy: ["new-deck", "deck-import"],
      },
      {
        id: "deck-status",
        region: "decks/your-decks/deck-status",
        lead: "A deck’s status",
        rest: " says what to do next. “To buy” is a full deck you can’t sleeve yet, and “Draft” is one you’ve never committed.",
        switch: null,
        since: 1,
        legacy: ["statuses"],
      },
      {
        id: "decks-stats",
        region: "decks/your-decks/decks-stats",
        lead: "Stats",
        rest: " puts every deck side by side: when each was last played, and how it went.",
        switch: "LINEUP_ENABLED",
        since: 16,
        legacy: ["decks-stats"],
      },
      {
        id: "precons",
        region: "decks/your-decks/precons",
        lead: "Precons",
        rest: " lists every Commander precon, with how many of its cards you already own. Start a deck from one just as it comes in the box.",
        switch: "PRECONS_ENABLED",
        since: 16,
        legacy: ["precons"],
      },
    ],
    rules: [],
    tools: ["lineup", "precons"],
  },
  {
    area: "decks",
    id: "your-deck",
    name: "Your deck",
    sub: "The list itself. Each row says whether you own the card and whether you’ve changed it, and your changes wait here until you commit.",
    screens: [{ screen: "deck", view: "your-deck" }],
    captures: { phone: ["p-deck-top", "p-deck-your-deck"], desktop: ["d-deck-top", "d-deck-list"] },
    labels: [
      {
        id: "row",
        region: "decks/your-deck/row",
        lead: "A row’s dot",
        rest: " shows whether you own the card: filled green is in your Collection, hollow and dashed is not, or is a proxy. A bright edge marks a row you changed since your last commit.",
        switch: null,
        since: 1,
        legacy: ["decklist-marks"],
      },
      {
        id: "bracket-marks",
        region: "decks/your-deck/bracket-marks",
        lead: "The marks after a name",
        rest: " flag Game Changers (WotC’s list) plus mass land denial, extra turns and tutors, which are read from card text and can miss one. Exhibition and Core allow no Game Changers, so count them before the rule zero chat.",
        switch: null,
        since: 1,
        legacy: ["card-marks", "decklist-marks"],
      },
      {
        id: "lock",
        region: "decks/your-deck/lock",
        lead: "Lock cards",
        rest: " protects the cards you pick. No tool will cut a locked card unless you say so.",
        switch: "NEVER_CUT_ENABLED",
        since: 16,
        legacy: ["locked-cards"],
      },
      {
        id: "mix",
        region: "decks/your-deck/mix",
        lead: "Recommended mix",
        rest: " counts ramp, draw, removal, wipes and lands against what decks like yours run. “consider →” shows cards that fill a gap.",
        switch: null,
        since: 8,
        legacy: ["roles", "informed-build"],
      },
      {
        id: "commit",
        region: "decks/your-deck/commit",
        lead: "Your changes",
        rest: " wait here until you commit. “Commit as v2” saves them as the deck’s next version.",
        switch: null,
        since: 7,
        legacy: ["review-and-commit"],
      },
    ],
    rules: ["autofill", "lock", "targets"],
    tools: ["top-off"],
  },
  {
    area: "decks",
    id: "analysis",
    name: "Analysis",
    sub: `Which bracket your deck sits in, and why. Suggested changes, Proposed cuts and Mana Balance help you tune it.${ABOUT_SCREEN_OFF}`,
    subSentences: {
      "Which bracket your deck sits in, and why.": "ANALYSIS_TAB_ENABLED",
      " Suggested changes, Proposed cuts and Mana Balance help you tune it.": ["TUNING_ENABLED", "PROPOSED_CUTS_ENABLED", "MANA_BALANCE_ENABLED"],
      [ABOUT_SCREEN_OFF]: "!ANALYSIS_TAB_ENABLED",
    },
    screens: [{ screen: "deck", view: "analysis" }],
    captures: { phone: ["p-deck-analysis", "p-deck-analysis-read", "p-analysis-tuning"], desktop: ["d-analysis", "d-analysis-tuning", "d-analysis-describe"] },
    labels: [
      {
        id: "bracket",
        region: "decks/analysis/bracket",
        lead: "Analyze",
        rest: " reads your list against the Commander Format Panel’s bracket rules and shows where your cards sit.",
        switch: "ANALYSIS_TAB_ENABLED",
        since: 16,
        legacy: ["deck-analysis"],
      },
      {
        id: "findings",
        region: "decks/analysis/findings",
        lead: "What is in this deck",
        rest: " counts Game Changers, mass land denial, extra turns, two-card infinites and tutors. Each count opens to show its cards, and a card whose text hides what it does can be missed.",
        switch: "ANALYSIS_TAB_ENABLED",
        since: 16,
        legacy: ["deck-analysis"],
      },
      {
        id: "suggested",
        region: "decks/analysis/suggested",
        lead: "Suggested changes",
        // Suggested changes v2 (handoff design_handoff_the99_suggested_changes_v2, About board): the v2 words ride v2's
        // switch, so a reader with it off still reads v1's. The last sentence is Small items 4 item 2's checkbox.
        rest: " offers up to five cards to add and five to cut, each with its reason. asks how many cards to change and what you’re after, then offers more of each than you asked for. You pick, and apply them as one change. Each run uses a credit, or two for more than 10 changes. With Only cards I own on, Include my other decks also offers cards your other decks hold, and Apply asks whether to pull each one.",
        switch: "TUNING_ENABLED",
        sentences: {
          " offers up to five cards to add and five to cut, each with its reason.": "!SUGGESTED_CHANGES_V2_ENABLED",
          " asks how many cards to change and what you’re after, then offers more of each than you asked for. You pick, and apply them as one change. Each run uses a credit, or two for more than 10 changes.": "SUGGESTED_CHANGES_V2_ENABLED",
          " With Only cards I own on, Include my other decks also offers cards your other decks hold, and Apply asks whether to pull each one.": "SUGGESTED_CHANGES_V2_ENABLED",
        },
        since: 16,
        legacy: ["suggested-changes"],
      },
      {
        id: "cuts",
        region: "decks/analysis/cuts",
        lead: "Proposed cuts",
        rest: " counts where a deck over 100 runs long, for free. “Look deeper” names the cards for a credit.",
        switch: "PROPOSED_CUTS_ENABLED",
        since: 16,
        legacy: ["proposed-cuts"],
      },
      {
        id: "describe",
        region: "decks/analysis/describe",
        lead: "Describe your deck",
        rest: " in a sentence or two. Suggested changes uses it to understand what the deck is for.",
        switch: "TUNING_ENABLED",
        since: 16,
        legacy: ["suggested-changes"],
      },
      {
        id: "mana",
        region: "decks/analysis/mana",
        lead: "Mana Balance",
        rest: " counts every source of each color against what your spells ask for. It’s free to run.",
        switch: "MANA_BALANCE_ENABLED",
        since: 16,
        legacy: ["mana-balance"],
      },
    ],
    rules: ["pick", "intent", "credits"],
    tools: ["suggested-changes", "proposed-cuts", "mana-balance"],
  },
  {
    area: "decks",
    id: "versions",
    name: "Versions",
    sub: "Every commit, kept, with its date, card count and average mana value. Open one to see what it brought in and took out.",
    screens: [{ screen: "deck", view: "versions" }],
    captures: { phone: ["p-deck-versions"], desktop: ["d-versions-precon"] },
    labels: [
      {
        id: "version",
        region: "decks/versions/version",
        lead: "Each commit",
        rest: " saves a version with its date, card count and average mana value. Open one to see which of its new cards you own today.",
        switch: null,
        since: 1,
        legacy: ["versions"],
      },
      {
        id: "precon-link",
        region: "decks/versions/precon-link",
        lead: "Built from a precon?",
        rest: " Link it, and the deck’s history starts from the box as v0.",
        switch: "PRECONS_ENABLED",
        since: 16,
        legacy: ["precons"],
      },
    ],
    rules: ["commit"],
    tools: [],
  },
  {
    area: "decks",
    id: "games",
    name: "Games",
    sub: "What happened at the table, game by game. Matchups shows how the deck does against each commander, color and friend.",
    subSentences: { " Matchups shows how the deck does against each commander, color and friend.": "SOCIAL_GAMES_ENABLED" },
    screens: [{ screen: "deck", view: "games" }],
    captures: { phone: ["p-deck-games"], desktop: ["d-games"] },
    labels: [
      {
        id: "log",
        region: "decks/games/log",
        lead: "Log a game",
        rest: " after you play. It takes about fifteen seconds. Suggested changes reads your games.",
        switch: null,
        sentences: {
          " Suggested changes reads your games.": "TUNING_ENABLED",
        },
        since: 1,
        legacy: ["log-a-game", "log-findings"],
      },
      {
        id: "matchups",
        region: "decks/games/matchups",
        lead: "Matchups",
        rest: " splits a deck’s games by the commander, the colors or the friend across the table.",
        switch: "SOCIAL_GAMES_ENABLED",
        since: 16,
        legacy: ["opponents"],
      },
    ],
    rules: [],
    tools: ["matchups"],
  },
  {
    area: "decks",
    id: "stats",
    name: "Stats",
    sub: `The deck in charts. See its curve by card type, its mana colors against their sources, the jobs its cards do, what it’s worth and how its games went.${ABOUT_SCREEN_OFF}`,
    subSentences: {
      "The deck in charts.": "DECK_STATS_ENABLED",
      " See its curve by card type, its mana colors against their sources, the jobs its cards do, what it’s worth and how its games went.": "DECK_STATS_ENABLED",
      [ABOUT_SCREEN_OFF]: "!DECK_STATS_ENABLED",
    },
    screens: [{ screen: "deck", view: "stats" }],
    captures: { phone: ["p-deck-stats"], desktop: ["d-stats"] },
    labels: [
      {
        id: "curve",
        region: "decks/stats/curve",
        lead: "The curve",
        rest: " counts the deck’s spells, commander included, by mana value. Press a card type to light it up.",
        switch: "DECK_STATS_ENABLED",
        since: 16,
        legacy: ["deck-stats"],
      },
    ],
    rules: [],
    tools: [],
  },
  {
    area: "decks",
    id: "notes",
    name: "Notes",
    sub: `Anything you want to remember about the deck, kept with it through every commit.${ABOUT_SCREEN_OFF}`,
    subSentences: {
      "Anything you want to remember about the deck, kept with it through every commit.": "DECK_NOTES_ENABLED",
      [ABOUT_SCREEN_OFF]: "!DECK_NOTES_ENABLED",
    },
    screens: [{ screen: "deck", view: "notes" }],
    captures: { phone: ["p-deck-notes"], desktop: ["d-notes"] },
    labels: [
      {
        id: "note",
        region: "decks/notes/note",
        lead: "A note",
        rest: " stays with the deck through every commit. No tool reads your notes.",
        switch: "DECK_NOTES_ENABLED",
        since: 16,
        legacy: ["notes"],
      },
    ],
    rules: [],
    tools: [],
  },
  {
    area: "shopping",
    id: "deck-shopping",
    name: "A deck’s Shopping",
    sub: "What one deck still needs, basic lands aside, priced at Mana Pool, with one link that fills your Mana Pool cart. Cheaper stand-ins are a press away.",
    subSentences: { " Cheaper stand-ins are a press away.": "SWAP_TOOLS_ENABLED" },
    screens: [{ screen: "deck", view: "shopping" }],
    captures: { phone: ["p-deck-shopping"], desktop: ["d-shopping"] },
    labels: [
      {
        id: "total",
        region: "shopping/deck-shopping/total",
        lead: "The total",
        rest: " is what this deck still needs at Mana Pool. “Buy these at Mana Pool” opens a cart with them.",
        switch: null,
        since: 1,
        legacy: ["shopping"],
      },
      {
        id: "limit",
        region: "shopping/deck-shopping/limit",
        lead: "“Marking cards over”",
        rest: " shows this deck’s price limit. Press the figure to change it.",
        switch: "SWAP_TOOLS_ENABLED",
        since: 16,
        legacy: ["stand-ins"],
      },
      {
        id: "standins",
        region: "shopping/deck-shopping/standins",
        lead: "⇄",
        rest: " opens cheaper stand-ins for a card over your limit.",
        switch: "SWAP_TOOLS_ENABLED",
        since: 16,
        legacy: ["stand-ins"],
      },
      {
        id: "spare",
        region: "shopping/deck-shopping/spare",
        lead: "The friends mark",
        rest: " means a friend can spare that card. Press it to see who. Ask them for one, and an ask with no answer lapses after 14 days.",
        switch: "SOCIAL_FRIENDS_ENABLED",
        sentences: { " Ask them for one, and an ask with no answer lapses after 14 days.": "SPARE_REQUESTS_ENABLED" },
        since: 16,
        legacy: ["friend-spares", "friend-spares@SPARE_REQUESTS_ENABLED"],
      },
      {
        id: "buy",
        region: "shopping/deck-shopping/buy",
        lead: "buy",
        rest: " shows the price. Press it when you’ve bought the card, and it goes into your Collection.",
        switch: "SHOPPING_MARK_BOUGHT_ENABLED",
        since: 1,
        legacy: ["buy-tag", "shopping-got-it"],
      },
    ],
    rules: ["own-it", "prices", "proxy"],
    tools: ["stand-ins", "friend-spares"],
  },
  {
    area: "shopping",
    id: "all-decks",
    name: "Shopping for all decks",
    sub: `Every deck’s missing cards in one cart, basic lands aside. A big cart goes to Mana Pool in parts.${ABOUT_SCREEN_OFF}`,
    subSentences: {
      "Every deck’s missing cards in one cart, basic lands aside. A big cart goes to Mana Pool in parts.": "ALL_DECKS_CART_ENABLED",
      [ABOUT_SCREEN_OFF]: "!ALL_DECKS_CART_ENABLED",
    },
    screens: [],
    captures: { phone: ["p-decks"], desktop: ["d-decks2"] },
    labels: [
      {
        id: "cart",
        region: "shopping/all-decks/cart",
        lead: "Shop all decks",
        rest: " puts every deck’s missing cards in one cart for Mana Pool.",
        switch: "ALL_DECKS_CART_ENABLED",
        since: 16,
        legacy: ["all-decks-cart"],
      },
    ],
    rules: [],
    tools: [],
  },
  {
    area: "friends",
    id: "friends",
    name: "Friends",
    sub: `The people you play with, and your pods. See their spares, and pick which pods see yours.${ABOUT_SCREEN_OFF}`,
    subSentences: {
      "The people you play with, and your pods.": "SOCIAL_FRIENDS_ENABLED",
      " See their spares, and pick which pods see yours.": "SOCIAL_FRIENDS_ENABLED",
      [ABOUT_SCREEN_OFF]: "!SOCIAL_FRIENDS_ENABLED",
    },
    screens: [{ screen: "friends" }],
    captures: { phone: ["p-friends"], desktop: ["d-friends"] },
    labels: [
      {
        id: "face",
        region: "friends/friends/face",
        lead: "Your signature card",
        rest: " is how friends see you, beside your name.",
        switch: "SIGNATURE_CARD_ENABLED",
        since: 16,
        legacy: ["friends"],
      },
      {
        id: "add",
        region: "friends/friends/add",
        lead: "Add a friend",
        rest: " sends a link that works once, or shows a QR code to scan at the table. Nobody can find you by searching.",
        switch: "SOCIAL_FRIENDS_ENABLED",
        since: 16,
        legacy: ["friends", "invites"],
      },
      {
        id: "friend",
        region: "friends/friends/friend",
        lead: "A friend’s page",
        rest: " shows their spares. It shows their wishlist too. It also lists the decks they let you open.",
        switch: "SOCIAL_FRIENDS_ENABLED",
        sentences: {
          " It shows their wishlist too.": "SOCIAL_WISHLIST_ENABLED",
          " It also lists the decks they let you open.": "FRIEND_DECKS_ENABLED",
        },
        since: 16,
        legacy: ["friends", "friend-decks", "wishlist"],
      },
      {
        id: "pod",
        region: "friends/friends/pod",
        lead: "A pod",
        rest: " is a group you play with. You pick, pod by pod, who sees your spares.",
        switch: "SOCIAL_FRIENDS_ENABLED",
        since: 16,
        legacy: ["friends"],
      },
      {
        id: "rule0",
        region: "friends/friends/rule0",
        lead: "Rule 0 check",
        rest: " compares everyone’s seat before tonight’s game.",
        switch: "RULE_ZERO_ENABLED",
        since: 16,
        legacy: ["rule-zero"],
      },
    ],
    rules: ["friends-see", "hidden-deck", "invites"],
    tools: ["friends"],
  },
];

export const ABOUT_RULES: Readonly<Record<AboutRuleId, AboutRule>> = {
  autofill: {
    text: "When The 99 fills a deck, it starts with a few format staples, then uses your Collection, buying only where you run short and picking the cards your commander’s decks play most. Tell Help me choose that any cards will do, and it can pick a much-played card to buy over a rarely played one of yours.",
    switch: null,
    sentences: {
      " Tell Help me choose that any cards will do, and it can pick a much-played card to buy over a rarely played one of yours.": "HELP_ME_CHOOSE_ENABLED",
    },
    since: 1,
    legacy: ["auto-fill", "help-me-choose"],
    diagram: {
      kind: "split",
      columns: [{ w: 250, gap: 10, parts: [
        { part: "caption", text: "Ghalta · 99 cards" },
        { part: "split", parts: [
          { label: "Your Collection", n: 86, tone: "success" },
          { label: "Staples", n: 10, tone: "fact" },
          { label: "To buy", n: 3, tone: "accent" },
        ] },
      ] }],
    },
  },
  lock: {
    text: "A locked card is safe from every tool: none will offer to cut it, and updating the deck from a list starts it kept. The lock ends when you commit a version without the card.",
    switch: "NEVER_CUT_ENABLED",
    since: 16,
    legacy: ["locked-cards"],
    diagram: {
      kind: "card-row",
      columns: [{ w: 256, gap: 10, parts: [
        { part: "row", name: "Craterhoof Behemoth", dot: "owned", lock: true, tag: { text: "locked", tone: "accent" } },
        { part: "caption", text: "Every tool skips it" },
        { part: "chips", chips: [
          { text: "Suggested changes", never: true, switch: "TUNING_ENABLED" },
          { text: "Proposed cuts", never: true, switch: "PROPOSED_CUTS_ENABLED" },
          { text: "Clear all auto", never: true },
          { text: "Pull it", never: true },
        ] },
      ] }],
    },
  },
  targets: {
    text: "Targets come from the closest decks EDHREC can measure: decks with your commander first, then decks in its colors. With nothing to measure, they start from standard figures. So a Kinnan deck asks for more ramp than most. Going over a target never counts against you, and a card’s role is read from its text, so one can be missed.",
    switch: null,
    since: 8,
    legacy: ["roles", "informed-build"],
    diagram: {
      kind: "role-cell",
      head: [{ part: "caption", text: "Kinnan · targets from Kinnan decks" }],
      columns: [{ parts: [{ part: "cells", cells: [
        { label: "Ramp", have: 18, target: 16 },
        { label: "Draw", have: 9, target: 10 },
        { label: "Wipes", have: 1, target: 3 },
      ] }] }],
    },
  },
  // Small items 6, item 3 (About-Errata board, call a): Suggested changes v2's pick card, first in Analysis's Good to
  // know. One 250 column of compact rows, built only from the shipped parts: Ghalta asks for two, so three are offered a
  // side, two picked (the changed-row edge) and one left (its edge dashed). Its legacy is the Suggested changes entry,
  // as the v2 label's is, so v2 turning on does not tell it as New (About ruling 6: announcing is Hugh's call).
  pick: {
    text: "Suggested changes keeps the deck at 99. Ask for two and you get three to add and three to cut; pick two of each. The counts have to match before Apply, and one Undo takes the whole set back.",
    switch: "SUGGESTED_CHANGES_V2_ENABLED",
    since: 16,
    legacy: ["suggested-changes"],
    diagram: {
      kind: "card-row",
      columns: [{ w: 250, gap: 5, parts: [
        { part: "caption", text: "Ghalta · add 2 of 3" },
        { part: "row", name: "Beast Within", compact: true, edge: true, tag: { text: "picked", tone: "accent" } },
        { part: "row", name: "Heroic Intervention", compact: true, edge: true, tag: { text: "picked", tone: "accent" } },
        { part: "row", name: "Return of the Wildspeaker", compact: true, dim: true, tag: { text: "pick", tone: "muted" } },
        { part: "caption", text: "cut 2 of 3" },
        { part: "row", name: "Rampant Growth", compact: true, edge: true, tag: { text: "picked", tone: "accent" } },
        { part: "row", name: "Kodama’s Reach", compact: true, edge: true, tag: { text: "picked", tone: "accent" } },
        { part: "row", name: "Elvish Mystic", compact: true, dim: true, tag: { text: "pick", tone: "muted" } },
        { part: "between", glyph: "↓", label: "apply 4 changes · stays at 99" },
      ] }],
    },
  },
  intent: {
    text: "At either end of the scale, brackets come down to intent, so your cards can fit two. A theme deck with no Game Changers, mass land denial, extra turns or two-card infinites passes at both Exhibition and Core. Only you know which, so you pick. Game Changers are Wizards’ own list.",
    switch: "ANALYSIS_TAB_ENABLED",
    since: 16,
    legacy: ["deck-analysis"],
    diagram: {
      kind: "bracket-medal",
      gap: 30,
      columns: [
        { parts: [{ part: "medal", bracket: 1 }] },
        { parts: [{ part: "between", glyph: "or" }] },
        { parts: [{ part: "medal", bracket: 2 }] },
      ],
      foot: [{ part: "caption", text: "a theme deck · no Game Changers · you pick" }],
    },
  },
  credits: {
    text: "Reading a bracket is free. Anything written just for you uses a credit, and a run that comes back empty-handed gives it back. An Overview uses one. So does each Suggested changes run. So does each Suggested changes run, or two for more than 10 changes. So does each Look deeper. A Suggested changes run that comes back short gives its credit back too, unless your limits, like a price cap, held it short. Pack and gift credits never expire. Plan credits end with the period after you cancel.",
    switch: null,
    sentences: {
      "Reading a bracket is free. ": "ANALYSIS_TAB_ENABLED",
      " An Overview uses one.": "ANALYSIS_TAB_ENABLED",
      " A Suggested changes run that comes back short gives its credit back too, unless your limits, like a price cap, held it short.": "SUGGESTED_CHANGES_V2_ENABLED",
      // v1 costs 1 credit; v2 costs 2 over 10 changes. Exactly one of the two sentences (and table rows) draws.
      " So does each Suggested changes run.": ["TUNING_ENABLED", "!SUGGESTED_CHANGES_V2_ENABLED"],
      " So does each Suggested changes run, or two for more than 10 changes.": "SUGGESTED_CHANGES_V2_ENABLED",
      " So does each Look deeper.": "PROPOSED_CUTS_ENABLED",
      " Pack and gift credits never expire.": "PAYMENTS_ENABLED",
      " Plan credits end with the period after you cancel.": "PAYMENTS_ENABLED",
    },
    since: 11,
    legacy: ["credits", "buying-credits"],
    diagram: {
      kind: "card-row",
      columns: [{ w: 250, gap: 7, parts: [
        { part: "row", name: "Read the bracket", tag: { text: "free", tone: "success" }, switch: "ANALYSIS_TAB_ENABLED" },
        { part: "row", name: "Suggested changes run", tag: { text: "1 credit", tone: "accent" }, switch: ["TUNING_ENABLED", "!SUGGESTED_CHANGES_V2_ENABLED"] },
        { part: "row", name: "Suggested changes run", tag: { text: "1 or 2 credits", tone: "accent" }, switch: "SUGGESTED_CHANGES_V2_ENABLED" },
        { part: "row", name: "Look deeper", tag: { text: "1 credit", tone: "accent" }, switch: "PROPOSED_CUTS_ENABLED" },
        // Small items 6, item 3 (call b): with v2 on, the empty-handed row gives way to two dashed rows (drafts for
        // /copy-review); with it off the shipped row stays.
        { part: "row", name: "Came back empty-handed", dim: true, tag: { text: "credit back", tone: "success" }, switch: "!SUGGESTED_CHANGES_V2_ENABLED" },
        { part: "row", name: "Came back short or empty", dim: true, tag: { text: "credit back", tone: "success" }, switch: "SUGGESTED_CHANGES_V2_ENABLED" },
        { part: "row", name: "Short by your price cap", dim: true, tag: { text: "1 or 2 credits", tone: "accent" }, switch: "SUGGESTED_CHANGES_V2_ENABLED" },
      ] }],
    },
  },
  commit: {
    text: "A card you add to a committed deck takes your copy only once you commit, so your other decks still count it free until then. “Put back” on Review changes brings back a cut before you do.",
    switch: null,
    since: 1,
    legacy: ["versions", "undo-removal"],
    diagram: {
      kind: "card-row",
      columns: [{ w: 250, gap: 5, parts: [
        { part: "caption", text: "Ghalta · pending" },
        { part: "row", name: "Sol Ring", dot: "owned", edge: true, compact: true, tag: { text: "+", tone: "accent" } },
        { part: "row", name: "Mind Stone", edge: true, compact: true, tag: { text: "cut", tone: "muted" } },
        { part: "between", glyph: "↓", label: "commit" },
        { part: "caption", text: "Sai sees it · v2 · today" },
        { part: "row", name: "Sol Ring", compact: true, tag: { text: "short", tone: "short" } },
      ] }],
    },
  },
  "one-copy": {
    text: "A copy you own can live in only one committed deck at a time. The deck that’s held it longest keeps it, unless you hand it to another, and drafts wait behind committed decks. Own one Sol Ring and run it in three decks, and two of them show it short.",
    switch: null,
    since: 1,
    legacy: ["availability", "commitments"],
    diagram: {
      kind: "card-row",
      columns: [{ w: 250, gap: 5, parts: [
        { part: "row", name: "Sol Ring", dot: "owned", tag: { text: "you own ×1", tone: "muted" } },
        { part: "between", glyph: "↓" },
        { part: "row", name: "Ghalta", tag: { text: "held longest ✓", tone: "muted" } },
        { part: "row", name: "Sai", tag: { text: "short 1", tone: "short" } },
        { part: "row", name: "Zimone", dim: true, tag: { text: "short 1 · draft", tone: "short" } },
      ] }],
    },
  },
  "never-decklist": {
    text: "Changing your Collection never changes a decklist. A deck that loses its copy keeps the card, shows it short and puts it on its shopping list.",
    switch: null,
    since: 1,
    legacy: ["availability", "remove-card", "post-import"],
    diagram: {
      kind: "card-row",
      columns: [{ w: 250, gap: 8, parts: [
        { part: "caption", text: "Collection" },
        { part: "row", name: "Arcane Signet ×1", gone: true, tag: { text: "removed", tone: "muted" } },
        { part: "caption", text: "Ghalta’s list" },
        { part: "row", name: "Arcane Signet", dot: "unowned", tag: { text: "short", tone: "short" }, price: { state: "priced", cents: 89 } },
      ] }],
    },
  },
  replace: {
    text: "An upload replaces your whole Collection with the file. With Replace, any card that isn’t in the file leaves your Collection, and changes you made in the app are overwritten. With Add, your quantities go up and nothing leaves. With Sync, the file’s changes come in, including cards it no longer has, and the changes you made in the app stay. If you both changed the same card, it asks you which to keep.",
    switch: null,
    sentences: {
      "An upload replaces your whole Collection with the file.": "!COLLECTION_EDIT_ENABLED",
      " With Replace, any card that isn’t in the file leaves your Collection, and changes you made in the app are overwritten.": "COLLECTION_EDIT_ENABLED",
      " With Add, your quantities go up and nothing leaves.": "COLLECTION_EDIT_ENABLED",
      " With Sync, the file’s changes come in, including cards it no longer has, and the changes you made in the app stay.": "COLLECTION_SYNC_ENABLED",
      " If you both changed the same card, it asks you which to keep.": "COLLECTION_SYNC_ENABLED",
    },
    since: 1,
    legacy: ["upload-choice", "upload-choice@COLLECTION_SYNC_ENABLED", "import"],
    diagram: {
      kind: "card-row",
      columns: [{ w: 250, gap: 5, parts: [
        // Replace is a choice only where the Collection can be edited; without it every upload replaces.
        { part: "caption", text: "Your Collection, then Replace", switch: "COLLECTION_EDIT_ENABLED" },
        { part: "caption", text: "Your Collection, then an upload", switch: "!COLLECTION_EDIT_ENABLED" },
        { part: "row", name: "Sol Ring", compact: true, tag: { text: "in the file", tone: "muted" } },
        { part: "row", name: "Swords", compact: true, tag: { text: "in the file", tone: "muted" } },
        { part: "row", name: "Cultivate", compact: true, tag: { text: "in the file", tone: "muted" } },
        { part: "row", name: "Thrasios", compact: true, gone: true, tag: { text: "not in the file", tone: "muted" } },
      ] }],
    },
  },
  "own-it": {
    text: "A card you own can still be on Shopping. If your Ghalta deck already holds your only Sol Ring, your Sai deck needs another.",
    switch: null,
    since: 1,
    legacy: ["shopping", "availability"],
    diagram: {
      kind: "deck-tile",
      gap: 12,
      columns: [
        { parts: [{ part: "tile", name: "Ghalta", status: "Complete", colors: ["G"] }] },
        { parts: [{ part: "caption", text: "holds your only Sol Ring", muted: true }] },
      ],
      foot: { w: 250, gap: 5, parts: [
        { part: "caption", text: "Sai · Shopping" },
        { part: "row", name: "Sol Ring", dot: "owned", price: { state: "priced", cents: 149 } },
        { part: "caption", text: "your copy is in Ghalta", muted: true },
      ] },
    },
  },
  prices: {
    text: "Prices are Mana Pool’s, and they refresh daily. A bare “buy” means Mana Pool has no price for any printing of that card.",
    switch: null,
    since: 1,
    legacy: ["shopping", "buy-tag"],
    diagram: {
      kind: "buy-tag",
      columns: [{ gap: 7, parts: [
        { part: "buy", price: { state: "priced", cents: 5416 }, note: "today’s price" },
        { part: "buy", price: { state: "foilOnly", cents: 210 }, note: "only in foil" },
        { part: "buy", price: { state: "soldOut" }, note: "none right now" },
        { part: "buy", price: { state: "absent" }, note: "no price at all" },
      ] }],
    },
  },
  proxy: {
    text: "A proxy comes off the shopping list and uses no copy. A token you mark “I have one” leaves every deck’s list, since any printing counts.",
    switch: null,
    sentences: { " A token you mark “I have one” leaves every deck’s list, since any printing counts.": "DECK_TOKENS_ENABLED" },
    since: 1,
    legacy: ["proxies", "deck-tokens"],
    diagram: {
      kind: "card-row",
      columns: [{ w: 250, gap: 7, parts: [
        { part: "row", name: "Gaea’s Cradle", dot: "unowned", proxy: true, tag: { text: "no copy used", tone: "muted" } },
        { part: "row", name: "Treasure token", dot: "owned", tag: { text: "I have one ✓", tone: "success" }, switch: "DECK_TOKENS_ENABLED" },
      ] }],
      foot: [{ part: "caption", text: "Both come off the shopping list", switch: "DECK_TOKENS_ENABLED" }],
    },
  },
  "friends-see": {
    text: "Friends see your name and the spares you offer, never your collection, or a deck’s prices, buy list or notes. Your wishlist is theirs to read too. They can open the decks you let them. They see your decks’ names, status and how many cards each still needs.",
    switch: "SOCIAL_FRIENDS_ENABLED",
    sentences: {
      " Your wishlist is theirs to read too.": "SOCIAL_WISHLIST_ENABLED",
      " They can open the decks you let them.": "FRIEND_DECKS_ENABLED",
      " They see your decks’ names, status and how many cards each still needs.": "!FRIEND_DECKS_ENABLED",
    },
    since: 16,
    legacy: ["friends", "wishlist", "friend-decks"],
    diagram: {
      kind: "chips",
      columns: [{ w: 262, gap: 7, parts: [
        { part: "caption", text: "Friends see" },
        { part: "chips", chips: [
          { text: "Your name" },
          { text: "Spares you offer" },
          { text: "Wishlist", switch: "SOCIAL_WISHLIST_ENABLED" },
          { text: "Decks you let them open", switch: "FRIEND_DECKS_ENABLED" },
        ] },
        { part: "caption", text: "Never" },
        { part: "chips", chips: [
          { text: "Your collection", never: true },
          { text: "Prices", never: true },
          { text: "Buy list", never: true },
          { text: "Notes", never: true },
        ] },
      ] }],
    },
  },
  "hidden-deck": {
    text: "A deck you hide looks deleted to friends: no tile, and its link stops working. Hiding it never frees its cards as spares.",
    switch: "FRIEND_DECKS_ENABLED",
    since: 16,
    legacy: ["friend-decks"],
    diagram: {
      kind: "deck-tile",
      gap: 12,
      columns: [
        { parts: [{ part: "tile", name: "Ghalta", status: "Complete", colors: ["G"] }] },
        { parts: [{ part: "void", text: "hidden: no tile" }] },
      ],
      foot: { w: 250, gap: 5, parts: [
        { part: "caption", text: "Its cards" },
        { part: "row", name: "Sol Ring", tag: { text: "in use", tone: "muted" } },
        { part: "caption", text: "not spares", muted: true },
      ] },
    },
  },
  invites: {
    text: "Invites are given out by The 99, never bought. Whatever email you type, you’re told “Invitation sent”, so nobody can use an invite to find out who’s on The 99.",
    switch: "SOCIAL_INVITES_ENABLED",
    since: 16,
    legacy: ["invites"],
    diagram: {
      kind: "card-row",
      columns: [{ w: 250, gap: 9, parts: [
        { part: "row", name: "colin@example.com", tag: { text: "Invitation sent", tone: "success" } },
        { part: "row", name: "someone-already-here@…", tag: { text: "Invitation sent", tone: "success" } },
      ] }],
      foot: [{ part: "caption", text: "3 invites left · given, never bought" }],
    },
  },
};

export const ABOUT_PAGE_STRINGS = {
  index: "One page for each part of the app, drawn from the app itself. The ? opens help for the screen you’re on.",
  goodToKnow: "Good to know",
  goodToKnowSub: "What the screen can’t show",
  tryIt: "Try it",
  tryItSub: "Each button opens the tool for real",
  /** A phone's Try it shows its first card; the rest wait under this button (Addendum R4 board 4). */
  moreTools: (n: number) => (n === 1 ? "1 more tool" : `${n} more tools`),
  /** A section's kicker: its place on the page among the sections this reader is drawn (R4 board 4). One section
   *  draws no count (R4 ruling 4). */
  screenOf: (area: string, n: number, total: number) => (total === 1 ? area : `${area} · screen ${n} of ${total}`),
  /** A tool card's line under its description: lights the tool's control on the capture above (R4 board 5). */
  toolWhere: "Show it above ↑",
  /** The phone's docked label's ✕, its accessible name (R4 board 3). */
  dockClose: "Close",
  /** A label a Show me landed on that the reader has not been told about (call 7). */
  newTag: "New",
  onThisPage: "On this page",
  bannerLead: (page: string) => `New on ${page}:`,
  bannerMulti: "New in the app",
  back: (screen: string) => `‹ Back to ${screen}`,
  toolShowMe: "Show me ›",
  /** An index tile's count line (Ways-In `.it .mt`): its page's screens, then its rules, the rules' half left off at 0. */
  indexCount: (screens: number, rules: number) =>
    [screens === 1 ? "1 screen" : `${screens} screens`, ...(rules > 0 ? [`${rules} good to know`] : [])].join(" · "),
} as const;

/**
 * The back bar's name for a screen with no section of its own (Addendum A1): the ? there lands on another page's section,
 * and the bar names the screen the reader left. A sectioned screen is named by its section.
 */
export const ABOUT_BACK_SCREENS = {
  "card-details": "Card details",
  sets: "Sets",
  proxies: "Proxies",
  history: "History",
  wishlist: "Wishlist",
  "new-deck": "New deck",
  settings: "Settings",
  credits: "Credits",
} as const satisfies Partial<Record<AboutScreen, string>>;
