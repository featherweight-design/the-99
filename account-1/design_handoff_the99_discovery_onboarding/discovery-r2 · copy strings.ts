// Discovery R2 · the showcase and About as a reference. PLACEHOLDERS for /copy-review (brief: "Wording goes to
// /copy-review"). Shipped strings are marked `shipped`; every other line is new and drawn on the R2 canvas.

export const aboutShapeCopy = {
  title: "About The 99",
  toolsSub: "What each tool is for, shown on the screen it lives on.",
  referenceSub: "Every entry, by the screen it lives on.",
  tabs: { tools: "Tools", reference: "Reference" },
  letter: "Read Hugh’s letter ›", // opens aboutCopy.pageIntro (shipped) in place
  helpHint: "Every screen has a ? for its own entries", // 1280 only, beside the tabs
  toReference: "Everything else the app does is in the Reference, by screen.",
  toReferencePress: "Open the Reference →",
} as const;

export const showcaseCopy = {
  groups: {
    start: { label: "Start a deck", sub: "before there is a list" },
    tune: { label: "Tune it", sub: "once there is a list" },
    buy: { label: "Buy smarter", sub: "for what you don’t own" },
    own: { label: "Use what you own", sub: "your Collection" },
    play: { label: "Play", sub: "after the game" },
  },
  swipe: (n: number) => `${n} · swipe`, // 390 group count
  howItWorks: "How it works ›",
  tryOn: (deck: string) => `Try it on ${deck} →`,
  more: { over: (n: number) => `${n} more are over`, full: (n: number) => `${n} more are full` },
  tools: {
    hmc: { name: "Help me choose", line: "Say what you want, and we’ll rank commanders by how well they fit it, owned or not.", press: "Open Help me choose →" }, // line shipped (/decks/new door)
    precons: { name: "Precons", line: "Any Commander precon, with how many of its cards you already own.", press: "Browse precons →" }, // line and press shipped
    topoff: { name: "Top off", cost: "free", line: "Ranks your own cards for a deck’s open slots. Nothing is added until you say so.", none: "Needs a deck under 99. All {n} of yours are full." },
    cuts: { name: "Proposed cuts", cost: "free", line: "Counts where a deck runs long. A deeper look names the cuts." }, // line from the shipped tile
    suggested: { name: "Suggested changes", cost: "1 credit a run", line: "Up to five swaps, read from your games, your notes and the list.", none: "Needs a full deck. None of yours is at 99 yet." }, // line and cost shipped (tile)
    mana: { name: "Mana Balance", cost: "free", line: "Counts every source of each color against what your spells ask for." }, // shipped (tile)
    standins: { name: "Cheaper stand-ins", line: "For a card over your price limit: cards that do the same job for less." },
    spares: { name: "Friends’ spares", line: "A friend’s spare copy of a card your deck still needs, before you buy one.", none: "Needs a friend with a spare of a card you’re missing. {friend} has none right now.", door: "Open Friends →" },
    findadeck: { name: "Find a deck", line: "Reads your decks for the one a card you own fits best.", press: "Try it on a card you own →" },
    wishlist: { name: "Wishlist", line: "Cards you want that no deck is asking for. A card leaves once you have enough.", press: "Open your wishlist →" }, // line from the shipped empty state
    sync: { name: "Collection Sync", line: "Merges a new file with what you changed here, card by card, and asks only where both moved.", press: "Upload a file →", none: "Needs a file you uploaded before. Your Collection was added by hand." },
    matchups: { name: "Matchups", line: "Splits a deck’s games by the commander, colors or friend across the table.", none: "Needs a game logged with who you played against." },
    lineup: { name: "Stats for your decks", line: "Every deck side by side: when each last played, and how it went.", press: "See your decks on Stats →" },
    friends: { name: "Friends and pods", line: "Add the people you play with, then seat them when you log a game.", press: "Open Friends →" },
  },
} as const;

export const helpPanelCopy = {
  button: "About this screen", // aria-label of the ? in the rail and the header
  eyebrow: "About this screen",
  screenName: (screen: string, view?: string) => (view ? `${screen} · ${view}` : screen), // e.g. "A deck · Shopping"
  search: "Search all of About",
  clear: "Clear search",
  here: (view: string) => `On ${view}`, // drawn uppercase
  count: (n: number) => (n === 1 ? "1 entry" : `${n} entries`),
  moreHere: (n: number) => `+ ${n} more on this tab`,
  elsewhere: { deck: "Elsewhere on this deck", collection: "Elsewhere in Collection" },
  showMe: "Show me",
  readWhole: "Read the whole entry ›",
  hits: (n: number, q: string) => `${n} entries mention “${q}”, on every screen`,
  none: (q: string) => `Nothing in About mentions “${q}”.`,
  noneNote: "Search reads every entry’s title and text, on every screen.",
  noneOut: "See every entry →",
  empty: "Nothing in About is about this screen yet.", // G21, not drawn
  footTools: "Tools ›",
  footAll: "All of About ›",
  close: "Close",
} as const;

export const referenceCopy = {
  search: "Find an entry", // shipped placeholder
  inTools: "in Tools",
  hits: (n: number, q: string) => `${n} entries mention “${q}”`,
  none: (q: string) => `Nothing in About mentions “${q}”.`, // replaces shipped `Nothing titled “${q}”.`
  noneNote: "Search reads every entry’s title and text, on every screen, and How it works too.", // replaces shipped "Search reads entry titles only."
  noneOut: "See every entry →",
  howTitle: "How the app reaches its answers", // shipped
  screensLabel: "Screens",
  reachesThis: "How the app reaches this ›",
} as const;
