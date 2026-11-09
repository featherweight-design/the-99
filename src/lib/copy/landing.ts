// The signed-out landing page, first half (public landing PR 4a): the hero, the launch panel, the theme switch, the numbers
// strip, the close and the footer's credit line. Transcribed from `design_handoff_the99_public_landing` (R4, approved) with
// READINESS-audit's Copy table applied: the hero line is the TIGHTEN, the footer's Design line is shortened to the two sources
// the shipped Fan Content passages do not already credit. Strings marked shipped are reused verbatim from their module's
// wording. US English, no em dashes. The open-sign-up wording is not here: it ships with the PR that opens sign-up.

export const landingCopy = {
  /** The link preview and search result for `/` while the landing draws. Caps: title 60, description 155. */
  meta: {
    title: "The 99: Commander decks from the cards you own",
    description: "See the commanders your cards can build, then build the deck from them. You buy only what’s missing.",
  },
  /** The admin-only preview route's banner (`/preview/landing`); never drawn on `/`. */
  preview: {
    note: "Preview of the landing page. Nothing you enter is saved. Only admins can see this.",
  },
  topBar: {
    /** Shipped (the public pages' signed-out block). */
    signIn: "Sign in",
    homeLabel: "The 99, home",
    wordmark: "The Ninety-Nine",
    wordmarkPhone: "The 99",
  },
  hero: {
    /** Shipped: the tagline. */
    kicker: "99 problems, but your commander ain’t one.",
    /** Headline A, chosen. */
    title: "Your next commander is already in your binder.",
    /** READINESS-audit: the tricolon tightened. */
    line: "The 99 shows every commander your cards can build, then builds the deck from them. You buy only what’s missing.",
  },
  /** The hero phone is drawn with a made-up collection; the fit figures belong to the example, not to anyone. */
  phone: {
    label: "An example of the Commanders page, drawn with a made-up collection",
    /** Fit per commander, by Scryfall name. The example's own figures. */
    fits: { "Jace, Multiverse Architect": 84, "Y'shtola, Night's Blessed": 79, "Tam, the Possibility": 72 } as Readonly<Record<string, number>>,
  },
  launch: {
    regionLabel: "Launch list",
    title: "Get in when it opens",
    /** Ships as written: invite-only until launch, and the list is told the day it opens. */
    body: "The 99 is invite-only until launch. Leave your email and we’ll tell you the day it opens to everyone.",
    /** Shipped (the sign-up page), minus "email". */
    fine: "Have an invitation? Open its link.",
    /** Shipped (`joinCopy`). */
    emailLabel: "Your email",
    emailPlaceholder: "name@example.com",
    /** Shipped (`flyerJoinCopy.listPress`). */
    press: "Tell me at launch",
    sending: "Sending…",
    /** Shipped (`flyerJoinCopy.listedTitle`). */
    sentTitle: "You’re on the list",
    /** Shipped (`flyerJoinCopy.listedBody`): the address in the middle is drawn emphasized. */
    sentBody: (email: string) => ["We’ll email ", { em: email }, " the day The 99 opens to everyone."] as const,
    /** Shipped (`joinCopy.notAnEmail`). */
    notAnEmail: "Enter an email address, like name@example.com.",
    /** Shipped (`creditsPageCopy.throttled`). */
    throttled: "Too many tries. Wait a little, then try again.",
    /** The action threw: the address may or may not have been kept, and sending it again is safe. */
    failed: "That didn’t go through. Try again in a moment.",
  },
  theme: {
    label: "See it in",
  },
  numbers: {
    regionLabel: "The catalog today",
    commanders: "commanders",
    commandersWithProse: "with a written read",
    precons: "precons",
    combos: "combos tracked",
    cards: "cards",
  },
  loop: {
    eyebrow: "How it works",
    /** READINESS-audit finding 13: "binder" stays in the headline alone; the collection is "your cards" everywhere else. */
    title: "From your cards to a finished deck",
    /** READINESS-audit Copy table: the Free chip and "always, no credits, no limits" cut, said once. */
    free: "All four are free.",
    steps: [
      { icon: "collection", title: "Bring your collection", line: "Upload a CSV from the app you use now, or paste a list.", points: ["Reads counts, sets and foils", "Sync a newer export any time"] },
      { icon: "commanders", title: "See what you can build", line: "Every commander your cards can build, ranked by how much of its deck you already own.", points: ["Why each one fits, in a sentence", "Discover the ones you don’t own yet"] },
      { icon: "decks", title: "Build from what you own", line: "The 99 fills the deck from your cards first and marks what’s missing.", points: ["Analysis, stats and brackets", "Combos you’re one card from"] },
      { icon: "cart", title: "Buy only what’s missing", line: "One shopping list across your decks, with cheaper stand-ins and friends’ spares first.", points: ["Prices from Mana Pool", "Borrow before you buy"] },
    ],
  },
  /** Bring your collection (public landing PR 7a). The export guides are `collection-sources.ts`, shared with the first run. */
  bring: {
    eyebrow: "Bring your collection",
    title: "Start with the cards you already own",
    lead: "Most of The 99 reads your collection, so it comes in first.",
    firstTimer: {
      title: "New to all this?",
      /** Audit: "Start here" dropped. */
      lead: "No collection app, just a box of cards? You don’t need the whole box in to begin.",
      steps: [
        { b: "Pick the precons you own.", rest: "Once you’re in, each box goes in whole, commander included." },
        { b: "Add the rest as you go.", rest: "Scan cards with your phone’s camera, or search for them by name, once you’re in." },
      ],
    },
    /** Audit: "How to export" is said once, here, never on each row. */
    appsLabel: "Already use an app?",
    howTo: "How to export: press yours.",
  },
  written: {
    eyebrow: "Written for real",
    /** READINESS-audit finding 11: "Most", never "Every". The figure is the catalog's own count. */
    title: (n: number) => `A written read for ${n.toLocaleString("en-US")} commanders`,
    /** The count is missing: say what the page does, claim no figure. */
    titleNoCount: "Commanders come with a written read",
    /** Finding 11: "Almost every precon". Said by the sentences that are true of what was drawn. */
    leadBoth: "Most commander pages open with why it’s worth building. Almost every precon has an Overview. Both are free to read.",
    leadCommanders: "Most commander pages open with why it’s worth building. It’s free to read.",
    leadPrecon: "Almost every precon has an Overview. It’s free to read.",
    commanderKicker: "Why this commander",
    /** Shipped link wording (`commanderPagePath`'s callers say "Open its page"). */
    open: "Open its page ›",
    preconTag: "Precon Overview",
  },
  /**
   * Try it, the live dummy app (public landing, 5l; design handoff `Demo-390` / `Demo-Desktop`). The player is the fixture's
   * made-up `player` (Wren), named by the caller; every figure is the exported data's own. Nothing here is typed by a
   * visitor and nothing is saved: the words say so once, at the start.
   */
  demo: {
    /** The section's header, as on the board: it stays through the start, every step and the end. */
    eyebrow: "Try it",
    title: "See it work before you join",
    lead: "A made-up player\u2019s cards and eight of the tools, working the way they do for members.",
    /** The start card, inside the frame: its heading, its paragraph and its button. */
    startTitle: (player: string) => `Try it on ${player}\u2019s cards`,
    startBody: (player: string) => `${player} is a made-up player with a real-looking binder. Press through eight of the tools, the way you would with your own cards. Nothing you press is saved, and nothing costs a credit.`,
    start: "Start",
    stage: (player: string) => `Live demo \u00b7 ${player}\u2019s cards`,
    step: (n: number, of: number) => `Step ${n} of ${of}`,
    skip: "Skip to the end",
    back: "Back",
    next: "Next",
    seeEnd: "See the end",
    /** The foot of the words column: a muted question, then the link that goes to the end card. */
    foot: "Like it with your own cards?",
    footLink: "Tell me at launch",
    /** Step 2's count line above the commanders, the lane\u2019s own sentence said of the made-up player. */
    commandersCount: (n: number, player: string) => `${n.toLocaleString("en-US")} ${n === 1 ? "commander" : "commanders"} ${player} owns and hasn\u2019t built`,
    /** The chip on the read-only wish and results of the steps that never take a visitor\u2019s words. */
    readOnly: "read-only",
    /** The tab rows of steps 7 and 8: each tab names the tool it opens, as the signed-in app names it. */
    tabs: {
      aria: "Tools",
      cuts: "Look deeper",
      topOff: "Top off",
      mana: "Mana Balance",
      shopping: "Shopping list",
      which: "Which deck needs it most?",
    },
    /** The eight tools, in order: the step's title, the chips it carries, the line under it and the label on the ring. */
    steps: [
      { id: "collection", title: (p: string) => `${p}\u2019s collection`, tags: [{ kind: "free", label: "Free" }], line: (p: string, cards: string) => `${p} is made up, and so is the binder: ${cards}. Every tool from here reads these cards. Press any card to open it.`, press: "Press a card" },
      { id: "commanders", title: (p: string) => `The commanders ${p} can build`, tags: [{ kind: "free", label: "Free" }], line: (p: string) => `Every commander in the binder, ranked by how much of its deck ${p} already owns. Press the fit to see why.`, press: "Why it fits" },
      { id: "choose", title: () => "Help me choose", tags: [{ kind: "credit", label: "1 credit" }], line: (p: string) => `${p} described the deck in a few words. The 99 ranked the commanders that fit, owned or not.`, press: "Press a commander" },
      { id: "deck", title: (p: string) => `A deck from what ${p} owns`, tags: [{ kind: "free", label: "Free" }], line: (p: string) => `Built from ${p}\u2019s cards first. The marks say what to know at a glance: a proxy, a Game Changer, a tutor, a card another deck already holds. Press one to see what it means.`, press: "Press a mark" },
      { id: "analysis", title: () => "Analysis and Overview", tags: [{ kind: "free", label: "Free" }, { kind: "credit", label: "Overview: 1 credit" }], line: () => "The verdict is free. The Overview is a written read of how the deck plays.", press: "Press a finding" },
      { id: "suggested", title: () => "Suggested changes", tags: [{ kind: "credit", label: "1\u20132 credits" }], line: () => "The 99 read the deck and picked cards to add and to cut, and says why.", press: "Press a card" },
      { id: "get-to-99", title: () => "Get it to 99", tags: [{ kind: "free", label: "Free" }, { kind: "credit", label: "Look deeper: 1 credit" }], line: (p: string) => `Over 99, a deeper look names the cuts. Under 99, Top off fills it from ${p}\u2019s cards. Mana Balance checks the lands.`, press: "Press a tab" },
      { id: "buy", title: () => "Buy only what\u2019s missing", tags: [{ kind: "free", label: "Free" }, { kind: "credit", label: "Which deck: 1 credit" }], line: (p: string) => `A deck\u2019s shopping list, cheaper stand-ins first. And a new card read against every deck ${p} has.`, press: "Press a tab" },
    ],
    end: {
      /** The frame's top row, in the place of "Step N of 8". */
      label: "The end",
      title: (player: string) => `That was ${player}\u2019s binder. Yours works the same.`,
      lead: "Bring your cards in, and every commander and deck here is built from what you own.",
      skipped: (from: number, to: number) => `You skipped steps ${from} to ${to}.`,
      goBack: (n: number) => `Go back to step ${n}`,
      startOver: "Start over",
    },
  },
  credits: {
    eyebrow: "Free and credits",
    /** Shipped (`creditsPageCopy.title` echoes it): the core is free, writing is what credits are for. */
    title: "The core is free. Credits are for writing.",
    /** Shipped (`creditsPageCopy.viewsFree`). */
    lead: "Browsing is always free. Anything we write just for you uses a credit.",
    welcome: {
      label: "welcome credits",
      note: (days: number) => `when you join, for ${days} days`,
    },
    /** READINESS-audit finding 11 DEFECT: "1 free credit a day", and it comes back 24 hours after use (never "+1", never "free run"). */
    daily: { figure: "1", label: "free credit a day", note: "back 24 hours after you use it" },
    /** The picture under the block: fifteen diamonds, three over each writing tool. */
    threeTimes: (units: number) => `${units} credits = each writing tool, three times`,
    /** "Every writing tool three times": drawn only while welcome credits are on and the grant is exactly three runs of each of the five tools. The finding-11 qualifier rides only while the 2-credit rule is live. */
    enough: "That covers every writing tool three times over before you spend a thing.",
    enoughV2: "That covers every writing tool three times over (Suggested changes, up to 10 changes) before you spend a thing.",
    keepGoing: "Keep going with a pack or the monthly plan.",
    /** Welcome credits off: no "keep going" without a first stretch to keep going from. */
    moreCredits: "More credits come in a pack or a monthly plan.",
    costLink: "What credits cost",
    free: {
      title: "Free, always",
      sub: "No credits needed.",
      items: ["Your collection", "Commanders, Discover and Help me choose", "Deck building", "Analysis and stats", "The shopping list", "Combos, the game log, friends and pods"],
    },
    paid: {
      title: "With credits",
      sub: "Each time one of these writes for you. Press ⓘ for what each one does.",
      /** The shipped "per run" style, as a chip: Suggested changes can take 2 under the v2 rule. */
      chip: "1–2 per run",
      chipOne: "1 per run",
    },
    one: "1 credit",
    suggestedV2: "1 to 2 credits",
  },
  tools: [
    {
      id: "overview", short: "Overview", name: "Overview of a deck", icon: "overview",
      tip: "A written read of your deck: its game plan from the first turns to the win, what to keep in an opening hand, and where it’s weak.",
      example: { ask: null, rows: [["Early", "", "Rocks set up evoke by turn two."], ["Mid", "", "Each sacrifice is a second cast."], ["Close", "", "Jeska’s Will ends it."]] },
    },
    {
      id: "suggested", short: "Changes", name: "Suggested changes", icon: "changes",
      tip: "Say what you want from the deck in your own words. It picks cards to add and cut, from your collection first, and says why for each.",
      example: { ask: "“More interaction.”", rows: [["+", "Chaos Warp", "removes anything"], ["+", "Abrade", "an instant answer"], ["−", "Smokebraider", "the curve is low without it"]] },
    },
    {
      id: "deeper", short: "Cuts", name: "Look deeper in Proposed cuts", icon: "deeper",
      tip: "When a deck runs over 99, it names the exact cards to cut and why each one goes.",
      example: { ask: "3 over 99", rows: [["−", "Inferno Titan", "weakest six-drop"], ["−", "Mind Stone", "a rock too many"], ["−", "Rolling Thunder", "slow removal"]] },
    },
    {
      id: "choose", short: "Choose", name: "Help me choose with “Anything else?”", icon: "choose",
      tip: "Describe the deck you’re after in your own words, and it ranks the commanders that fit, owned or not.",
      example: { ask: "“Something red and fast.”", rows: [["1", "Ashling", "92"], ["2", "Jace", "71"], ["3", "Giada", "64"]] },
    },
    {
      id: "which", short: "Which deck", name: "Which deck needs it most?", icon: "which",
      tip: "Got a new card? It reads it against every deck you have and tells you where it does the most.",
      example: { ask: null, rows: [["", "Swords to Plowshares → Giada", "White, and the deck has only three answers."]] },
    },
  ] as const,
  tip: {
    open: (name: string) => `What is ${name}?`,
    youGet: "What you get",
    example: "Example",
  },
  sheet: {
    title: "What credits cost",
    close: "Close",
    pack: { name: "Credit pack", line: (units: number) => `${units} credits that never expire` },
    plan: { name: "Monthly plan", price: (price: string) => `${price} a month`, line: (units: number) => `${units} credits a month; unused ones roll over` },
    foot: "Credits are bought once you’re in. Browsing stays free either way.",
  },
  close: {
    title: "Your cards already know what to build.",
  },
  footer: {
    /** READINESS-audit finding 12: Scryfall and Mana Pool are credited in the Fan Content passages that follow. */
    credit: "Commander data from EDHREC. Combos from Commander Spellbook.",
  },
} as const;
