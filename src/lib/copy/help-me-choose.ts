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
import { BRACKET_NAMES, nameList, numberWord } from "./deck-analysis";

/** Names joined by "or", with no serial comma, as `nameList` joins by "and": *Orcs, Elves or Wizards*. */
export const orList = (names: readonly string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;

const SMALL_NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const spelled = (n: number) => SMALL_NUMBERS[n] ?? n.toLocaleString("en-US");

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

export const helpMeChooseCopy = {
  /** The two doors (HANDOFF §1): the create picker's box, and the link on Discover's result line. */
  door: {
    head: "Not sure what to build?",
    body: "Say what you want, and we’ll rank commanders by how well they fit it, owned or not.",
    cta: "Help me choose →",
    discoverLead: "Not sure what you want?",
  },
  intake: {
    title: "Help me choose",
    back: "‹ New deck", // canvas
    sub: "Say as much or as little as you like. Every answer is optional, and the more you give, the closer the fit.",
    subPhone: "Every answer is optional.",
    // The free-text box, last in the form (the read addendum R1, `the read · copy strings.ts`).
    // Its text is never turned into answers: with a credit free it is read by the model on submit.
    extra: {
      label: "Anything else?",
      optional: "optional",
      placeholder: "e.g. something scary and a little nasty, or a Landfall deck unlike the ones I’ve built",
      caption: "Describe the deck in your own words: how it should feel, or how it should differ from decks you’ve built. Leave it empty and the answers above search on their own, for free.",
      captionFilled: "Read against every commander your answers allow, and your decks’ commanders and themes. It uses a credit when you press Find commanders.",
      captionSpent: "Kept here for when a credit comes back.",
      count: (n: number, max: number) => `${n} / ${max}`,
      spentLine: (standing: string) => `Won’t be read: ${standing}.`,
      // The box takes the Notes `[[` card tag (the card-tags plan, PR 1). A tagged card is a requirement.
      tagHelp: {
        infoAria: "How card tags work",
        lines: [
          "Type [[ and the start of a card’s name to tag it, or press [[ ]] to start one.",
          "A tagged card is required: only commanders whose decks run it are suggested.",
          "A name typed without picking it from the list stays plain text.",
        ],
        insert: "[[ ]]",
        insertAria: "Insert a card tag",
      },
    },
    colors: "Colors", // canvas
    colorsNone: "No preference: every identity, five-color included.",
    colorsAny: (names: string) => `Any identity that includes ${names}.`,
    colorsExactly: (names: string) => `Exactly ${names}, nothing more.`,
    colorsJoin: (names: readonly string[]) => names.join(" and "), // HANDOFF §2
    theme: "Theme", // canvas
    themeCaption: "EDHREC’s themes. Pick more than one if you like.",
    themePlaceholder: "Add a theme…",
    themeAnother: "Add another…", // canvas
    themeCount: (n: number) => plural(n, "commander", "commanders"), // canvas
    removeTheme: (label: string) => `Remove ${label}`, // eng: the chip's ✕, spoken
    // Three-answers addendum §3: where the 99 comes from.
    pool: "Cards for the 99",
    poolAny: "Any cards",
    poolOwn: "Only cards I own",
    poolCaptionAny: "Owned or not. The budget caps what you’d buy.",
    poolCaptionOwn: "The 99 comes from your collection. The commander can still be one you’d buy, and it’s priced on its own.",
    // Audit 8: a card asked for that the fill buys (unowned, or every copy held) is priced with the
    // commander, so the addendum's "commander only" names it.
    budgetCaptionOwn: "With the 99 from your cards, this caps the commander and any card you ask for that you’d have to buy. It never ranks.",
    // Three-answers addendum §2: the Sets answer.
    sets: "Sets",
    setsCaption: "Only commanders printed in one of these. Leave it empty for every set.",
    removeSet: (name: string) => `Remove ${name}`, // eng: the chip's ✕, spoken
    // Three-answers addendum §1: how two or more themes join.
    themeJoin: {
      all: "All",
      any: "Any",
      aria: "Themes: all or any",
      captionAll: "All of these: a commander has to fit every one.",
      captionAny: "Any of these: a commander has to fit one, and ranks by the one it fits best.",
    },
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
    yourAnswers: "Your answers",
    noneAll: "No answers given: every commander you haven’t built",
    /** Above the words the player wrote, quoted whole. */
    wrote: "You wrote",
    change: "Change answers", // canvas
    startOver: "Start over", // canvas
    noPrice: "buy · no price", // canvas
    noPriceTail: "no price", // canvas: the tail of `noPrice`, drawn in --fg-faint
    kinds: { colors: "colors", exactly: "exactly", theme: "theme", anyOf: "any of", printedIn: "printed in", pool: "the 99", card: "card", budget: "budget", bracket: "bracket" }, // canvas
    /** Between the names on an any-of chip, drawn apart from them. */
    joiner: "or",
    /** The the-99 chip's value, and the mono tail after it. */
    poolValue: "from cards you own",
    poolTail: "commander owned or not",
  },
  /**
   * The read's panel on the results (the read addendum R1, `the read · copy strings.ts`; STATES 7d
   * to 7n). It never offers: the read starts at the submit, and the panel reports on it. Retired with
   * F10: `readIt`, `costSpent` and `costPaused` (no press on the results). `cost` and `pressAria` are
   * the form's press too: one key for the pill wherever it is drawn.
   */
  read: {
    cost: "1 credit",
    pressAria: "1 credit. Find commanders and read what you wrote.",
    pendingTitle: "Reading what you wrote…",
    pendingLead: "These results stay until it’s done. It usually takes under a minute.",
    stepScan: (n: string) => `Scanning the ${n} commanders your answers allow`,
    /** eng: step 1 before the results below have said how many commanders the answers allow. */
    stepScanAll: "Scanning the commanders your answers allow",
    stepWeigh: "Weighing the closest few in full",
    stepNow: "now",
    stepNext: "next",
    actionPending: "Reading…",
    title: "Read what you wrote",
    doneTag: "done",
    doneLead: (pool: string, short: number) =>
      `It read the ${pool} commanders your answers allow and weighed the closest ${short} in full.`,
    heldColors: (colors: string) => `Your colors held: nothing outside ${colors} was read.`,
    noDecks: "You have no decks yet, so the lines speak to what you wrote alone.",
    doneLine: (standing: string) => `1 credit used · ${standing}`,
    repeatLine: "No credit used · you asked this already",
    // A read a Stop settled before Stop was removed (2026-10-12) can still be opened by its URL.
    stoppedTag: "stopped",
    stoppedLead: "Nothing was read, and no credit was used. These are the results for your answers alone.",
    failTag: "didn’t finish",
    failedLead: "The read didn’t finish, so your credit came back. These are the results for your answers alone.",
    failed: "The read didn’t finish, so your credit came back.", // announced
    retry: "Try again",
    emptyTitle: "Nothing fits what you wrote",
    emptyLead: (pool: string) =>
      `It read all ${pool} commanders your answers allow, and none of them makes the deck you described. Your answers hold, so it didn’t look outside them.`,
    emptyWiden: "to let it look wider, for instance with more colors.", // after a "Change answers" link
    emptyLine: (standing: string) => `No credit used · ${standing}`,
    unreadTitle: "What you wrote wasn’t read",
    // Claims no cause: the line under it gives one (no credit left, paused, the owner's share).
    unreadLead: "These results use your answers alone. Your words are kept for another try.",
    // copy-reviewed: Recovery; names the cause, which the standing line under it cannot.
    busyLead: "Another read of yours was still running, so this one didn’t start. These results use your answers alone.",
    doneAnnounce: "The read is done, and its picks now lead your results.", // eng: announced
  },
  results: {
    back: "‹ Your answers", // canvas
    title: "Commanders for you", // canvas
    sub: "Suggested from what you asked, best fit first.", // canvas, copy-reviewed
    subPhone: "From your answers.", // canvas
    all: "Ordered by fit to everything you asked",
    byOne: (label: string) => `Ordered by ${label}`, // canvas
    byOwned: "Ordered by cards you already have",
    byBestTheme: "Ordered by the theme each fits best",
    subAny: (names: string) =>
      `You asked for any of ${names}, so each commander ranks by the one it fits best. Every one it fits is shown.`,
    subAnyCard: (names: string, card: string) =>
      `Each commander ranks by the theme of ${names} it fits best, or by ${card} where that figure is lower.`,
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
    /** Own-only (addendum §3): the ownership line splits into the commander, then the 99. */
    rowCommander: "commander",
    rowOwn: "99 from your cards",
    rowUsual: (owned: number) => `${owned} of its usual 99 are yours`,
    /** The row's set tag, spoken: its code is drawn, the set named. */
    printedIn: (set: string) => `Printed in ${set}`,
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
    loadingBy: { owned: "cards you already have", all: "fit to everything you asked", bestTheme: "the theme each fits best" },
    handOff: (name: string) => `Start a deck with ${name}`, // eng: the row's press, spoken
    // The read's order (the read addendum R1).
    byWords: "Ordered by what you wrote",
    /**
     * `picks`: how many the read chose; `owned`: whether the rest are in the owned order; `lines`:
     * whether every pick draws its line (one naming a deck deleted since draws none).
     */
    byWordsSub: (picks: number, owned: boolean, lines = true) =>
      `${picks === 1 ? `The read’s one pick leads${lines ? ", with a line on why" : ""}.` : `The read’s ${numberWord(picks)} picks lead, closest first${lines ? ", each with a line on why" : ""}.`} ${owned ? "The rest follow, ordered by cards you already have." : "The rest follow in your answers’ order."}`,
    pendingSub: "What you wrote isn’t in this order yet. These are your answers’ results, and they stay until the read is done.",
    notReadSub: "Commanders your answers allow, owned or not, whose decks run the most cards you already have.",
    restHead: "The rest of your results",
    restTail: "ordered by cards you already have",
    more: "Show 12 more",
    moreNote: "The next 12 count what you own as they load.", // canvas
    // When the next slice itself fails to load (no count ran); the button beside it is the retry.
    moreFailed: "Couldn’t load more commanders. Try again.",
  },
  narrow: {
    few: (n: number) => (n === 1 ? "Only one commander fits all of that" : `Only ${n} commanders fit all of that`),
    /** Diverges from R1's "Loosen one answer": an offer can drop two answers or keep only one (audit 9). */
    fewLead: "Loosen your answers to see more:",
    none: "No commander fits all of that",
    noneLead: "Each of these would bring some back. Pick one and we’ll search again.",
    count: (n: number) => plural(n, "commander", "commanders"),
    /** One answer, or several at once when no single one brings a commander back. */
    drop: (answers: readonly string[]) => `Drop ${nameList(answers)}`,
    /** Every answer but one dropped: said as the one that stays. */
    keepOnly: (answer: string) => `Keep only ${answer}`,
    widenColors: (names: string) => `Any ${names}, not exactly`,
    /** The themes asked as all of, offered as any of (addendum §1). */
    widenThemes: (n: number) => `Any of the ${spelled(n)} themes, not all`,
    /** Its reason: the most of those themes any one commander backs at once, measured. */
    widenThemesWhy: (most: number, names: readonly string[]) =>
      `No commander fits more than ${spelled(most)} of ${nameList(names)} at once.`,
    /** The any-of group, named as its chip names it. */
    anyOfName: (names: readonly string[]) => `any of ${orList(names)}`,
    gameChanger: (card: string, bracket: number) => `${card} is a Game Changer, and bracket ${bracket} allows none.`,
    yourself: "Or change your answers yourself.",
    yourselfLink: "change your answers", // canvas
  },
  /** The create page, reached from a result (HANDOFF §6): `CreatePreFilled` with the answers. */
  handOff: {
    back: "‹ Help me choose · results",
    /** The phone's bare chevron, spoken. */
    backAria: "Back to results",
    sub: "Name your deck. It will be built from your answers.",
    subPhone: "From your answers",
    block: "Built from your answers",
    change: "Change",
    changeAria: "Change your answers",
    keys: { theme: "Theme", anyOf: "Any of", sets: "Printed in", pool: "The 99", card: "Built around", budget: "Budget", bracket: "Bracket" }, // canvas
    themeFig: (pct: number, t: string) => `${pct}% of its decks are ${t}.`, // canvas
    placed: "Placed in the deck because you asked for it.",
    cardFig: (pct: number) => `${pct}% of its decks run it.`, // canvas
    budgetFirst: (card: string, price: string) => `${card} takes ${price} of it first. The fill buys the rest in its own order while the price fits, and finishes with basics.`,
    budgetUnknown: (card: string) => `${card} has no price on record, so the budget can’t count it. The fill caps the rest as usual.`,
    /** No card to pay for first, or one with a copy free: the budget caps the fill alone. Eng: undrawn. */
    budgetAlone: "The fill buys in its own order while the price fits, and finishes with basics.",
    /** Own-only: the pool row says where the 99 comes from, so this says only that nothing is bought for it. */
    budgetOwn: "The fill buys nothing for the 99.",
    /** Own-only with a build-around card the fill buys (unowned, or every copy held): the budget
     *  charges it (audit 8), and it is the one buy. */
    budgetOwnCard: (card: string, price: string | null) =>
      price === null
        ? `${card} has no price on record, so the budget can’t count it. The fill buys nothing else for the 99.`
        : `${card} takes ${price} of it. The fill buys nothing else for the 99.`,
    poolValue: "From cards you own",
    poolLine: "It takes only cards with a copy free, and finishes with basics.",
    bracketValue: (n: 1 | 2 | 3 | 4 | 5) => `${n} · ${BRACKET_NAMES[n]}`, // canvas
    bracket: (n: number) => `The fill keeps every card it chooses inside bracket ${n}’s limits.`,
    backToResults: "Back to results",
  },
  searchFailed: {
    head: "We couldn’t find commanders just now",
    body: "Something went wrong on our side. Your answers are kept, and no credit was used.",
    retry: "Try again",
    change: "Change answers",
  },
} as const;
