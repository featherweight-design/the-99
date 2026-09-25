// Help me choose — copy (sub-project 8, PR 5b).
//
// Transcribed from the handoff's `help-me-choose · copy strings.ts`, with the audit's F6 drops: the
// dock counts (`intake.dock`, `intake.dockZero`) and the two lines that printed a total
// (`results.head`, `results.moreLine`) are gone, since no screen prints a total. `wordsCaption` is
// HANDOFF §2's, not the file's. The strings the canvas draws with no key in the file are added
// here and marked `// canvas`.
//
// Copy-reviewed with pictures on 2026-09-25 (plan: F6, F8): every `// canvas` string ships as
// transcribed, and the unpriced row's line (F8) says the buy figure leaves the card out. The
// owned-order sub is the canvas's pair.
//
// Never the words AI, model or LLM: the deeper read is "a deeper look" (audit wording rule).

import { availabilityCopy } from "./availability";
import { BRACKET_NAMES } from "./deck-analysis";

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

export const helpMeChooseCopy = {
  intake: {
    title: "Help me choose",
    back: "‹ New deck", // canvas
    sub: "Say as much or as little as you like. Every answer is optional, and the more you give, the closer the fit.",
    subPhone: "Every answer is optional.",
    words: "In your own words",
    wordsPlaceholder: "e.g. Dinosaurs that go big, under $150, bracket 2, built around Regisaur Alpha",
    wordsCaption: "Themes, cards, a budget or a bracket, in any words.",
    colors: "Colors", // canvas
    colorsNone: "No preference: every identity, five-color included.",
    colorsAny: (names: string) => `Any identity that includes ${names}.`,
    colorsExactly: (names: string) => `Exactly ${names}, nothing more.`,
    colorsJoin: (names: readonly string[]) => names.join(" and "), // HANDOFF §2
    theme: "Theme", // canvas
    themeCaption: "EDHREC’s theme tags. Pick more than one if you like.",
    themePlaceholder: "Add a theme…",
    themeAnother: "Add another…", // canvas
    themeCount: (n: number) => plural(n, "commander", "commanders"), // canvas
    removeTheme: (label: string) => `Remove ${label}`, // eng: the chip's ✕, spoken
    budget: "Budget", // canvas
    budgetPlaceholder: "No cap",
    budgetCaption: "The most you would spend on cards you don’t own. It caps the fill and never ranks.",
    bracket: "Bracket", // canvas
    bracketAny: "Any", // canvas
    bracketNone: "No preference: every bracket.",
    bracketCaption: (n: 1 | 2 | 3 | 4 | 5) => `${n} · ${BRACKET_NAMES[n]}`, // canvas
    submit: "Find commanders", // canvas
  },
  readAs: {
    label: "We read this as",
    none: "No answers given",
    notUsed: "Not used",
    change: "Change answers", // canvas
    startOver: "Start over", // canvas
    noPrice: "buy · no price", // canvas
    noPriceTail: "no price", // canvas: the tail of `noPrice`, drawn in --fg-faint
    kinds: { colors: "colors", exactly: "exactly", theme: "theme", card: "card", budget: "budget", bracket: "bracket" }, // canvas
  },
  results: {
    back: "‹ Your answers", // canvas
    title: "Commanders for you", // canvas
    sub: "Suggested from your answers, best fit first.", // canvas
    subPhone: "From your answers.", // canvas
    all: "Ordered by fit to everything you asked",
    byOne: (label: string) => `Ordered by ${label}`, // canvas
    byOwned: "Ordered by cards you already have",
    subTheme: (t: string) => `Each figure is the share of that commander’s decks on EDHREC tagged ${t}.`,
    subCard: (c: string) => `Each figure is how often that commander’s decks on EDHREC run ${c}. It goes in the deck whichever you pick.`,
    subSeveral: (lead: string, other: string) =>
      `Each commander ranks by the answer it fits least, so one that’s all ${lead} but rarely ${other} won’t outrank one that does both. Every figure is shown.`,
    // The canvas's pair, ruled at copy review (2026-09-25): "owned or not" answers the marks beside
    // each row, and the colors variant names the filter the player set.
    subOwned: "You gave no theme or card, so these are commanders, owned or not, whose decks run the most cards you already have. Add a theme or a card for suggestions by fit.",
    subOwnedColors: (colors: string) =>
      `You gave colors but no theme or card, so these are ${colors} commanders, owned or not, whose decks run the most cards you already have. Add a theme or a card for suggestions by fit.`,
    figTheme: (pct: number, t: string) => `${pct}% of its decks are ${t}`,
    figCard: (pct: number, c: string) => `${pct}% of its decks run ${c}`,
    figOwned: (owned: number, total: number) => `${owned} of the ${total} cards its decks run are yours`,
    // The row draws each figure in its own column and the rest of the sentence beside it (canvas),
    // so the sentence is read whole across the two: `40%` then `of its decks are Dinosaurs`.
    figThemeTail: (t: string) => `of its decks are ${t}`, // canvas
    figCardTail: (c: string) => `of its decks run ${c}`, // canvas
    figOwnedTail: (total: number) => `of the ${total} cards its decks run are yours`, // canvas
    setsRank: "SETS RANK",
    bestFits: "Best fits",
    moreCommanders: "More commanders",
    // The ownership line's two figures, drawn as separate segments so the line wraps between them
    // and never inside one (read as "you own 79 of its 99 · about $135 to buy").
    ownCount: (owned: number) => `you own ${owned} of its 99`,
    ownBuy: (buy: string, cap?: string) => `about ${buy} to buy${cap ? `, inside ${cap}` : ""}`,
    free: "owned · free",
    held: (deck: string | null) => (deck ? availabilityCopy.marker.hardIn(deck) : availabilityCopy.marker.hard),
    // F8, ruled at copy review (2026-09-25): the line says the buy figure leaves the card out.
    unpriced: (card: string) => `${card}: no price on record. It’s in the deck, but not in the figure to buy.`,
    rowPending: "Counting what you own…",
    rowFailed: "Couldn’t count what you own.",
    retry: "Retry",
    loadingHead: "Finding commanders…",
    loadingSub: (by: string) => `Ordered by ${by} once they arrive.`,
    // eng: the `by` for the two orders that name no one answer.
    loadingBy: { owned: "cards you already have", all: "fit to everything you asked" },
    handOff: (name: string) => `Start a deck with ${name}`, // eng: the row's press, spoken
    more: "Show 12 more",
    moreNote: "The next 12 count what you own as they load.", // canvas
  },
  narrow: {
    few: (n: number) => (n === 1 ? "Only one commander fits all of that" : `Only ${n} commanders fit all of that`),
    fewLead: "Loosen one answer to see more:",
    none: "No commander fits all of that",
    noneLead: "Each of these would bring some back. Pick one and we’ll search again.",
    count: (n: number) => plural(n, "commander", "commanders"),
    drop: (answer: string) => `Drop ${answer}`,
    widenColors: (names: string) => `Any ${names}, not exactly`,
    gameChanger: (card: string, bracket: number) => `${card} is a Game Changer, and bracket ${bracket} allows none.`,
    yourself: "Or change your answers yourself.",
    yourselfLink: "change your answers", // canvas
  },
  searchFailed: {
    head: "We couldn’t find commanders just now",
    body: "Something went wrong on our side. Your answers are kept, and no credit was used.",
    retry: "Try again",
    change: "Change answers",
  },
} as const;
