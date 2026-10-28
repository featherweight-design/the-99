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
}

export interface AboutSection {
  area: AboutArea;
  id: string;
  name: string;
  sub: string;
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
export const ABOUT_SECTIONS: readonly AboutSection[] = [
  {
    area: "home",
    id: "home",
    name: "Home",
    sub: "Where every visit starts.",
    screens: [{ screen: "home" }],
    captures: { phone: ["p-home"], desktop: ["d-home"] },
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
    sub: "News for you, newest first.",
    screens: [{ screen: "home" }],
    captures: { phone: ["p-home-feed"], desktop: [] },
    labels: [
      {
        id: "lead",
        region: "home/whats-new/lead",
        lead: "The top story",
        rest: " is the newest thing for you, like a new set or a combo you can now make. A new precon shows up here too. So does a price drop on a card on your wishlist.",
        switch: "HOME_FEED_ENABLED",
        sentences: {
          " A new precon shows up here too.": "PRECONS_ENABLED",
          " So does a price drop on a card on your wishlist.": "SOCIAL_WISHLIST_ENABLED",
        },
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
    sub: "Everything you own, card by card.",
    screens: [{ screen: "collection" }],
    captures: { phone: ["p-collection"], desktop: ["d-collection"] },
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
        rest: " adds cards by name or from a file. You can scan them in too.",
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
        lead: "“none free”",
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
    sub: "Bring in an export from another app.",
    screens: [{ screen: "upload" }],
    captures: { phone: ["p-upload"], desktop: [] },
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
    sub: "Commanders you own, ranked by fit.",
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
    sub: "Commanders worth buying.",
    screens: [{ screen: "discover" }],
    captures: { phone: ["p-discover"], desktop: [] },
    labels: [
      {
        id: "order",
        region: "commanders/discover/order",
        lead: "The order",
        rest: " you pick changes what leads. Each order says what it ranks by.",
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
    sub: "Every deck, with what it needs next.",
    screens: [{ screen: "decks" }],
    captures: { phone: ["p-decks"], desktop: [] },
    labels: [
      {
        id: "new-deck",
        region: "decks/your-decks/new-deck",
        lead: "New deck",
        rest: " starts from a commander. “Import a deck” brings in a list you already play.",
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
    sub: "The list, and what each row is telling you.",
    screens: [{ screen: "deck", view: "your-deck" }],
    captures: { phone: ["p-deck-your-deck"], desktop: ["d-deck"] },
    labels: [
      {
        id: "row",
        region: "decks/your-deck/row",
        lead: "A row’s dot",
        rest: " shows whether you own the card: filled green is in your Collection, hollow and dashed is not. A bright edge marks a row you changed since your last commit.",
        switch: null,
        since: 1,
        legacy: ["decklist-marks"],
      },
      {
        id: "bracket-marks",
        region: "decks/your-deck/bracket-marks",
        lead: "The marks after a name",
        rest: " flag what matters for your bracket: Game Changers, mass land denial, extra turns and tutors. Exhibition and Core allow no Game Changers, so count them before the rule zero chat.",
        switch: "ANALYSIS_TAB_ENABLED",
        since: 1,
        legacy: ["card-marks", "decklist-marks"],
      },
      {
        id: "lock",
        region: "decks/your-deck/lock",
        lead: "Lock cards",
        rest: " protects the cards you pick. No tool will offer to cut a locked card.",
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
    sub: "Where your deck sits, and the tools that tune it.",
    screens: [{ screen: "deck", view: "analysis" }],
    captures: { phone: ["p-deck-analysis", "p-analysis-tuning"], desktop: ["d-analysis", "d-analysis-describe"] },
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
        rest: " offers up to five cards to add and five to cut, each with its reason.",
        switch: "TUNING_ENABLED",
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
    rules: ["intent", "credits"],
    tools: ["suggested-changes", "proposed-cuts", "mana-balance"],
  },
  {
    area: "decks",
    id: "versions",
    name: "Versions",
    sub: "Every commit, kept.",
    screens: [{ screen: "deck", view: "versions" }],
    captures: { phone: ["p-deck-versions"], desktop: [] },
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
    sub: "What happened at the table.",
    screens: [{ screen: "deck", view: "games" }],
    captures: { phone: ["p-deck-games"], desktop: [] },
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
    sub: "The deck, drawn.",
    screens: [{ screen: "deck", view: "stats" }],
    captures: { phone: ["p-deck-stats"], desktop: [] },
    labels: [
      {
        id: "curve",
        region: "decks/stats/curve",
        lead: "The curve",
        rest: " counts the deck’s cards by mana value. Press a card type to light it up.",
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
    sub: "The small stuff, kept with the deck.",
    screens: [{ screen: "deck", view: "notes" }],
    captures: { phone: ["p-deck-notes"], desktop: [] },
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
    sub: "What one deck still needs.",
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
        lead: "Marking cards over $10",
        rest: " sets this deck’s price limit.",
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
    sub: "Every deck’s missing cards in one cart.",
    screens: [],
    captures: { phone: ["p-decks"], desktop: [] },
    labels: [
      {
        id: "cart",
        region: "shopping/all-decks/cart",
        lead: "Shop all decks",
        rest: " puts every deck’s missing cards in one cart, so you check out at Mana Pool once.",
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
    sub: "Your friends, and your pods.",
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
    text: "When The 99 fills a deck, it uses your Collection first. It picks cards to buy only where you run short, and then it picks the ones your commander’s decks play most. Tell Help me choose that any cards will do, and it can pick a much-played card to buy over a rarely played one of yours.",
    switch: null,
    sentences: {
      " Tell Help me choose that any cards will do, and it can pick a much-played card to buy over a rarely played one of yours.": "HELP_ME_CHOOSE_ENABLED",
    },
    since: 1,
    legacy: ["auto-fill"],
  },
  lock: {
    text: "A locked card is safe from every tool: none will offer to cut it, and updating the deck from a list keeps it. The lock ends when you commit a version without the card.",
    switch: "NEVER_CUT_ENABLED",
    since: 16,
    legacy: ["locked-cards"],
  },
  targets: {
    text: "Targets come from decks with your commander, so a Kinnan deck asks for more ramp than most. Going over a target never counts against you, and a card’s role is read from its text, so one can be missed.",
    switch: null,
    since: 8,
    legacy: ["roles", "informed-build"],
  },
  intent: {
    text: "At either end of the scale, brackets come down to intent, so your cards can fit two. A Squirrel deck with no Game Changers passes at both Exhibition and Core. Only you know which, so you pick. Game Changers are Wizards’ own list.",
    switch: "ANALYSIS_TAB_ENABLED",
    since: 16,
    legacy: ["deck-analysis"],
  },
  credits: {
    text: "Reading a bracket is free. Anything written just for you uses a credit, and a run that comes back empty-handed gives it back. An Overview uses one. So does each Suggested changes run. So does each Look deeper. Pack and gift credits never expire. Plan credits end with the period after you cancel.",
    switch: null,
    sentences: {
      "Reading a bracket is free. ": "ANALYSIS_TAB_ENABLED",
      " An Overview uses one.": "ANALYSIS_TAB_ENABLED",
      " So does each Suggested changes run.": "TUNING_ENABLED",
      " So does each Look deeper.": "PROPOSED_CUTS_ENABLED",
      " Pack and gift credits never expire.": "PAYMENTS_ENABLED",
      " Plan credits end with the period after you cancel.": "PAYMENTS_ENABLED",
    },
    since: 11,
    legacy: ["credits", "buying-credits"],
  },
  commit: {
    text: "A card you add to a committed deck takes your copy right away. Your other decks see that only once you commit. Until then, “Put back” on Review changes still brings back a cut.",
    switch: null,
    since: 1,
    legacy: ["versions", "undo-removal"],
  },
  "one-copy": {
    text: "A copy you own can live in only one committed deck at a time. The deck that’s held it longest keeps it, unless you hand it to another, and drafts wait behind committed decks. Own one Sol Ring and run it in three decks, and two of them show it short.",
    switch: null,
    since: 1,
    legacy: ["availability", "commitments"],
  },
  "never-decklist": {
    text: "Changing your Collection never changes a decklist. A deck that loses its copy keeps the card, shows it short and puts it on its shopping list.",
    switch: null,
    since: 1,
    legacy: ["availability", "remove-card", "post-import"],
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
  },
  "own-it": {
    text: "A card you own can still be on Shopping. If your Ghalta deck already holds your only Sol Ring, your Sai deck needs another.",
    switch: null,
    since: 1,
    legacy: ["shopping", "availability"],
  },
  prices: {
    text: "Prices are Mana Pool’s, and they refresh daily. A bare “buy” means Mana Pool has no price for that printing at all.",
    switch: null,
    since: 1,
    legacy: ["shopping", "buy-tag"],
  },
  proxy: {
    text: "A proxy comes off the shopping list and uses no copy. A token you mark “I have one” leaves every deck’s list, since any printing counts.",
    switch: null,
    sentences: { " A token you mark “I have one” leaves every deck’s list, since any printing counts.": "DECK_TOKENS_ENABLED" },
    since: 1,
    legacy: ["proxies", "deck-tokens"],
  },
  "friends-see": {
    text: "Friends see your name and the spares you offer, never your collection, or a deck’s prices, buy list or notes. Your wishlist is theirs to read too. They can open the decks you let them.",
    switch: "SOCIAL_FRIENDS_ENABLED",
    sentences: {
      " Your wishlist is theirs to read too.": "SOCIAL_WISHLIST_ENABLED",
      " They can open the decks you let them.": "FRIEND_DECKS_ENABLED",
    },
    since: 16,
    legacy: ["friends", "wishlist"],
  },
  "hidden-deck": {
    text: "A deck you hide looks deleted to friends: no tile, and its link stops working. Hiding it never frees its cards as spares.",
    switch: "FRIEND_DECKS_ENABLED",
    since: 16,
    legacy: ["friend-decks"],
  },
  invites: {
    text: "Invites are given out by The 99, never bought. Whatever email you type, you’re told “Invitation sent”, so nobody can use an invite to find out who’s on The 99.",
    switch: "SOCIAL_INVITES_ENABLED",
    since: 16,
    legacy: ["invites"],
  },
};

export const ABOUT_PAGE_STRINGS = {
  index: "One page for each part of the app, drawn from the app itself. The ? opens help for the screen you’re on.",
  goodToKnow: "Good to know",
  tryIt: "Try it",
  onThisPage: "On this page",
  bannerLead: (page: string) => `New on ${page}:`,
  bannerMulti: "New in the app",
  back: (screen: string) => `‹ Back to ${screen}`,
  toolShowMe: "Show me ›",
} as const;
