// The signed-out landing page, first half (public landing PR 4a): the hero, the launch panel, the theme switch, the numbers
// strip, the close and the footer's credit line. Transcribed from `design_handoff_the99_public_landing` (R4, approved) with
// READINESS-audit's Copy table applied: the hero line is the TIGHTEN, the footer's Design line is shortened to the two sources
// the shipped Fan Content passages do not already credit. Strings marked shipped are reused verbatim from their module's
// wording. US English, no em dashes. The open-sign-up wording is not here: it ships with the PR that opens sign-up.

export const landingCopy = {
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
    lead: "Everything in The 99 reads your collection, so it comes in first.",
    firstTimer: {
      title: "New to all this?",
      /** Audit: "Start here" dropped. */
      lead: "No collection app, just a box of cards? You don’t need the whole box in to begin.",
      steps: [
        { b: "Pick the precons you own.", rest: "One press adds the whole deck, commander included." },
        { b: "Add the rest as you go.", rest: "Scan cards with your phone’s camera, or search for them by name." },
      ],
    },
    /** Audit: "How to export" is said once, here, never on each row. */
    appsLabel: "Already use an app?",
    howTo: "How to export: press yours.",
    guideOpen: (app: string) => `How to export from ${app}`,
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
