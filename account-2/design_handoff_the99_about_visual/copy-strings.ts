// The 99 · About as six visual pages R1 (account 2, 2026-10-27): every label and rule string, drafts for /copy-review.
// Design reference only, never imported. Region = the anchor engineering adds; switch = the feature switch that hides it.

export const ABOUT_AREAS = [
  {
    "id": "home",
    "name": "Home",
    "line": "What’s new, what to build next, and the decks you left off."
  },
  {
    "id": "collection",
    "name": "Collection",
    "line": "Every card you own, and how cards get in."
  },
  {
    "id": "commanders",
    "name": "Commanders",
    "line": "Who to build next, from what you own or what’s worth buying."
  },
  {
    "id": "decks",
    "name": "Decks",
    "line": "Building a deck, reading it, and keeping its versions."
  },
  {
    "id": "shopping",
    "name": "Shopping",
    "line": "What your decks still need, and the cheaper ways to get it."
  },
  {
    "id": "friends",
    "name": "Friends",
    "line": "The people you play with, your pods, and what they can see."
  }
] as const;

export const ABOUT_SECTIONS = [
  {
    "area": "home",
    "id": "home",
    "name": "Home",
    "sub": "Where every visit starts.",
    "capture": {
      "phone": "p-home",
      "desktop": "d-home"
    },
    "labels": [
      {
        "id": "help",
        "region": "home/home/help",
        "lead": "The ?",
        "rest": " on any screen opens that screen’s part of these pages.",
        "switch": "HELP_PANEL_ENABLED"
      },
      {
        "id": "ready",
        "region": "home/home/ready",
        "lead": "Ready to build",
        "rest": " shows two commanders you could build today from cards you own. They change every day.",
        "switch": null
      },
      {
        "id": "in-use",
        "region": "home/home/in-use",
        "lead": "Cards in use",
        "rest": " counts only committed decks. “Spoken for twice” is cards your decks want more copies of than you own.",
        "switch": null
      }
    ],
    "rules": [],
    "tools": []
  },
  {
    "area": "home",
    "id": "whats-new",
    "name": "What’s new",
    "sub": "News for you, newest first.",
    "capture": {
      "phone": "p-home-feed",
      "desktop": null
    },
    "labels": [
      {
        "id": "lead",
        "region": "home/whats-new/lead",
        "lead": "The top story",
        "rest": " is the newest thing for you: a set, a precon, a price drop on your wishlist, or a combo you can now make.",
        "switch": "HOME_FEED_ENABLED"
      }
    ],
    "rules": [],
    "tools": []
  },
  {
    "area": "collection",
    "id": "cards",
    "name": "Cards",
    "sub": "Everything you own, card by card.",
    "capture": {
      "phone": "p-collection",
      "desktop": "d-collection"
    },
    "labels": [
      {
        "id": "tabs",
        "region": "collection/cards/tabs",
        "lead": "Cards, Sets, Proxies, History and Wishlist",
        "rest": " are your Collection’s tabs.",
        "switch": null
      },
      {
        "id": "add",
        "region": "collection/cards/add",
        "lead": "The +",
        "rest": " adds cards by name, by scanning them, or from a file.",
        "switch": "COLLECTION_EDIT_ENABLED"
      },
      {
        "id": "key",
        "region": "collection/cards/key",
        "lead": "The key",
        "rest": " explains every mark a card can carry, from Game Changer to In use.",
        "switch": null
      },
      {
        "id": "taken",
        "region": "collection/cards/taken",
        "lead": "“none free”",
        "rest": " means committed decks hold every copy you own.",
        "switch": null
      }
    ],
    "rules": [
      "one-copy",
      "never-decklist"
    ],
    "tools": [
      "find-a-deck",
      "wishlist"
    ]
  },
  {
    "area": "collection",
    "id": "upload",
    "name": "Upload a file",
    "sub": "Bring in an export from another app.",
    "capture": {
      "phone": "p-upload",
      "desktop": null
    },
    "labels": [
      {
        "id": "drop",
        "region": "collection/upload/drop",
        "lead": "Drop in a CSV",
        "rest": " from ManaBox, Moxfield, Archidekt or Deckbox, or paste a list. Nothing changes until you confirm.",
        "switch": null
      }
    ],
    "rules": [
      "replace"
    ],
    "tools": [
      "collection-sync"
    ]
  },
  {
    "area": "commanders",
    "id": "for-you",
    "name": "For you",
    "sub": "Commanders you own, ranked by fit.",
    "capture": {
      "phone": "p-commanders",
      "desktop": "d-commanders"
    },
    "labels": [
      {
        "id": "places",
        "region": "commanders/for-you/places",
        "lead": "For you, Discover and Help me choose",
        "rest": " are three ways to find your next commander.",
        "switch": "COMMANDERS_PLACE_ENABLED"
      },
      {
        "id": "fit",
        "region": "commanders/for-you/fit",
        "lead": "The fit score",
        "rest": " out of 100 says how well your cards suit a commander.",
        "switch": null
      },
      {
        "id": "styles",
        "region": "commanders/for-you/styles",
        "lead": "Play styles",
        "rest": " come from the decks EDHREC tracks for that commander.",
        "switch": null
      }
    ],
    "rules": [],
    "tools": [
      "help-me-choose"
    ]
  },
  {
    "area": "commanders",
    "id": "discover",
    "name": "Discover",
    "sub": "Commanders worth buying.",
    "capture": {
      "phone": "p-discover",
      "desktop": null
    },
    "labels": [
      {
        "id": "order",
        "region": "commanders/discover/order",
        "lead": "The order",
        "rest": " you pick changes what leads. Each order says what it ranks by.",
        "switch": null
      }
    ],
    "rules": [],
    "tools": []
  },
  {
    "area": "decks",
    "id": "your-decks",
    "name": "Your decks",
    "sub": "Every deck, with what it needs next.",
    "capture": {
      "phone": "p-decks",
      "desktop": null
    },
    "labels": [
      {
        "id": "new-deck",
        "region": "decks/your-decks/new-deck",
        "lead": "New deck",
        "rest": " starts from a commander. “Import a deck” brings in a list you already play.",
        "switch": null
      },
      {
        "id": "precons",
        "region": "decks/your-decks/precons",
        "lead": "Precons",
        "rest": " lists every Commander precon, with how many of its cards you already own. Start a deck from one just as it comes in the box.",
        "switch": "PRECONS_ENABLED"
      },
      {
        "id": "deck-status",
        "region": "decks/your-decks/deck-status",
        "lead": "A deck’s status",
        "rest": " says what to do next. “To buy” is a full deck you can’t sleeve yet, and “Draft” is one you’ve never committed.",
        "switch": null
      },
      {
        "id": "decks-stats",
        "region": "decks/your-decks/decks-stats",
        "lead": "Stats",
        "rest": " puts every deck side by side: when each was last played, and how it went.",
        "switch": "LINEUP_ENABLED"
      }
    ],
    "rules": [],
    "tools": [
      "lineup",
      "precons"
    ]
  },
  {
    "area": "decks",
    "id": "your-deck",
    "name": "Your deck",
    "sub": "The list, and what each row is telling you.",
    "capture": {
      "phone": "p-deck-your-deck",
      "desktop": "d-deck"
    },
    "labels": [
      {
        "id": "row",
        "region": "decks/your-deck/row",
        "lead": "A row’s dot",
        "rest": " shows whether you own the card: filled green is in your Collection, hollow and dashed is not. A bright edge marks a row you changed since your last commit.",
        "switch": null
      },
      {
        "id": "bracket-marks",
        "region": "decks/your-deck/bracket-marks",
        "lead": "The marks after a name",
        "rest": " flag what matters for your bracket: Game Changers, mass land denial, extra turns and tutors. Exhibition and Core allow no Game Changers, so count them before the rule zero chat.",
        "switch": "ANALYSIS_TAB_ENABLED"
      },
      {
        "id": "lock",
        "region": "decks/your-deck/lock",
        "lead": "Lock cards",
        "rest": " protects the cards you pick. No tool will offer to cut a locked card.",
        "switch": "NEVER_CUT_ENABLED"
      },
      {
        "id": "mix",
        "region": "decks/your-deck/mix",
        "lead": "Recommended mix",
        "rest": " counts ramp, draw, removal, wipes and lands against what decks like yours run. “consider →” shows cards that fill a gap.",
        "switch": null
      },
      {
        "id": "commit",
        "region": "decks/your-deck/commit",
        "lead": "Your changes",
        "rest": " wait here until you commit. “Commit as v2” saves them as the deck’s next version.",
        "switch": null
      }
    ],
    "rules": [
      "autofill",
      "lock",
      "targets"
    ],
    "tools": [
      "top-off"
    ]
  },
  {
    "area": "decks",
    "id": "analysis",
    "name": "Analysis",
    "sub": "Where your deck sits, and the tools that tune it.",
    "capture": {
      "phone": "p-deck-analysis",
      "desktop": "d-analysis"
    },
    "labels": [
      {
        "id": "bracket",
        "region": "decks/analysis/bracket",
        "lead": "Analyze",
        "rest": " reads your list against the Commander Format Panel’s bracket rules and shows where your cards sit. Reading a bracket is free.",
        "switch": "ANALYSIS_TAB_ENABLED"
      },
      {
        "id": "findings",
        "region": "decks/analysis/findings",
        "lead": "What is in this deck",
        "rest": " counts Game Changers, mass land denial, extra turns, two-card infinites and tutors. Each count opens to show its cards.",
        "switch": "ANALYSIS_TAB_ENABLED"
      },
      {
        "id": "suggested",
        "region": "decks/analysis/suggested",
        "lead": "Suggested changes",
        "rest": " offers up to five cards to add and five to cut, each with its reason. Each run uses a credit.",
        "switch": "TUNING_ENABLED"
      },
      {
        "id": "mana",
        "region": "decks/analysis/mana",
        "lead": "Mana Balance",
        "rest": " counts every source of each color against what your spells ask for. It’s free to run.",
        "switch": "MANA_BALANCE_ENABLED"
      },
      {
        "id": "cuts",
        "region": "decks/analysis/cuts",
        "lead": "Proposed cuts",
        "rest": " counts where a deck over 100 runs long, for free. “Look deeper” names the cards for a credit.",
        "switch": "PROPOSED_CUTS_ENABLED"
      },
      {
        "id": "describe",
        "region": "decks/analysis/describe",
        "lead": "Describe your deck",
        "rest": " in a sentence or two. Suggested changes uses it to understand what the deck is for.",
        "switch": "TUNING_ENABLED"
      }
    ],
    "rules": [
      "intent",
      "credits"
    ],
    "tools": [
      "suggested-changes",
      "proposed-cuts",
      "mana-balance"
    ]
  },
  {
    "area": "decks",
    "id": "versions",
    "name": "Versions",
    "sub": "Every commit, kept.",
    "capture": {
      "phone": "p-deck-versions",
      "desktop": null
    },
    "labels": [
      {
        "id": "version",
        "region": "decks/versions/version",
        "lead": "Each commit",
        "rest": " saves a version with its date, card count and average mana value. Open one to see which of its new cards you own today.",
        "switch": null
      },
      {
        "id": "precon-link",
        "region": "decks/versions/precon-link",
        "lead": "Built from a precon?",
        "rest": " Link it, and the deck’s history starts from the box as v0.",
        "switch": "PRECONS_ENABLED"
      }
    ],
    "rules": [
      "commit"
    ],
    "tools": []
  },
  {
    "area": "decks",
    "id": "games",
    "name": "Games",
    "sub": "What happened at the table.",
    "capture": {
      "phone": "p-deck-games",
      "desktop": null
    },
    "labels": [
      {
        "id": "log",
        "region": "decks/games/log",
        "lead": "Log a game",
        "rest": " after you play. It takes about fifteen seconds, and Suggested changes reads your games.",
        "switch": null
      },
      {
        "id": "matchups",
        "region": "decks/games/matchups",
        "lead": "Matchups",
        "rest": " splits a deck’s games by the commander, the colors or the friend across the table.",
        "switch": "SOCIAL_GAMES_ENABLED"
      }
    ],
    "rules": [],
    "tools": [
      "matchups"
    ]
  },
  {
    "area": "decks",
    "id": "stats",
    "name": "Stats",
    "sub": "The deck, drawn.",
    "capture": {
      "phone": "p-deck-stats",
      "desktop": null
    },
    "labels": [
      {
        "id": "curve",
        "region": "decks/stats/curve",
        "lead": "The curve",
        "rest": " counts the deck’s cards by mana value. Tap a card type to light it up.",
        "switch": "DECK_STATS_ENABLED"
      }
    ],
    "rules": [],
    "tools": []
  },
  {
    "area": "decks",
    "id": "notes",
    "name": "Notes",
    "sub": "The small stuff, kept with the deck.",
    "capture": {
      "phone": "p-deck-notes",
      "desktop": null
    },
    "labels": [
      {
        "id": "note",
        "region": "decks/notes/note",
        "lead": "A note",
        "rest": " stays with the deck through every commit. No tool reads your notes.",
        "switch": "DECK_NOTES_ENABLED"
      }
    ],
    "rules": [],
    "tools": []
  },
  {
    "area": "shopping",
    "id": "deck-shopping",
    "name": "A deck’s Shopping",
    "sub": "What one deck still needs.",
    "capture": {
      "phone": "p-deck-shopping",
      "desktop": "d-shopping"
    },
    "labels": [
      {
        "id": "total",
        "region": "shopping/deck-shopping/total",
        "lead": "The total",
        "rest": " is what this deck still needs at Mana Pool. “Buy these at Mana Pool” opens a cart with them.",
        "switch": null
      },
      {
        "id": "limit",
        "region": "shopping/deck-shopping/limit",
        "lead": "Marking cards over $10",
        "rest": " sets this deck’s price limit. Cards over it get cheaper stand-ins.",
        "switch": "SWAP_TOOLS_ENABLED"
      },
      {
        "id": "standins",
        "region": "shopping/deck-shopping/standins",
        "lead": "⇄",
        "rest": " opens cheaper stand-ins for a card over your limit.",
        "switch": "SWAP_TOOLS_ENABLED"
      },
      {
        "id": "spare",
        "region": "shopping/deck-shopping/spare",
        "lead": "The friends mark",
        "rest": " means a friend can spare that card. Press it to see who, and ask for one. An ask with no answer lapses after 14 days.",
        "switch": "SOCIAL_FRIENDS_ENABLED"
      },
      {
        "id": "buy",
        "region": "shopping/deck-shopping/buy",
        "lead": "buy",
        "rest": " shows the price. Press it when you’ve bought the card, and it goes into your Collection.",
        "switch": "SHOPPING_MARK_BOUGHT_ENABLED"
      }
    ],
    "rules": [
      "own-it",
      "prices",
      "proxy"
    ],
    "tools": [
      "stand-ins",
      "friend-spares"
    ]
  },
  {
    "area": "shopping",
    "id": "all-decks",
    "name": "Shopping for all decks",
    "sub": "Every deck’s missing cards in one cart.",
    "capture": {
      "phone": "p-decks",
      "desktop": null
    },
    "labels": [
      {
        "id": "cart",
        "region": "shopping/all-decks/cart",
        "lead": "Shop all decks",
        "rest": " puts every deck’s missing cards in one cart, so you check out at Mana Pool once.",
        "switch": "ALL_DECKS_CART_ENABLED"
      }
    ],
    "rules": [],
    "tools": []
  },
  {
    "area": "friends",
    "id": "friends",
    "name": "Friends",
    "sub": "Your friends, and your pods.",
    "capture": {
      "phone": "p-friends",
      "desktop": "d-friends"
    },
    "labels": [
      {
        "id": "face",
        "region": "friends/friends/face",
        "lead": "Your signature card",
        "rest": " is how friends see you, beside your name.",
        "switch": "SIGNATURE_CARD_ENABLED"
      },
      {
        "id": "add",
        "region": "friends/friends/add",
        "lead": "Add a friend",
        "rest": " sends a link that works once, or shows a QR code to scan at the table. Nobody can find you by searching.",
        "switch": "SOCIAL_FRIENDS_ENABLED"
      },
      {
        "id": "friend",
        "region": "friends/friends/friend",
        "lead": "A friend’s page",
        "rest": " shows their spares, wishlist and the decks they let you open.",
        "switch": "SOCIAL_FRIENDS_ENABLED"
      },
      {
        "id": "pod",
        "region": "friends/friends/pod",
        "lead": "A pod",
        "rest": " is a group you play with. You pick, pod by pod, who sees your spares.",
        "switch": "SOCIAL_FRIENDS_ENABLED"
      },
      {
        "id": "rule0",
        "region": "friends/friends/rule0",
        "lead": "Rule 0 check",
        "rest": " compares everyone’s seat before tonight’s game.",
        "switch": "RULE_ZERO_ENABLED"
      }
    ],
    "rules": [
      "friends-see",
      "hidden-deck",
      "invites"
    ],
    "tools": [
      "friends"
    ]
  }
] as const;

export const ABOUT_RULES = {
  "autofill": {
    "text": "When The 99 fills a deck, it uses your Collection first. It picks cards to buy only where you run short, and then it picks the ones your commander’s decks play most.",
    "switch": null
  },
  "lock": {
    "text": "A locked card is safe from every tool: Suggested changes, Proposed cuts, Clear all auto, Pull it and Update from a list all skip it. The lock ends when you commit a version without the card.",
    "switch": "NEVER_CUT_ENABLED"
  },
  "targets": {
    "text": "Targets come from decks with your commander, so a Kinnan deck asks for more ramp than most. Going over a target never counts against you.",
    "switch": null
  },
  "intent": {
    "text": "At either end of the scale, brackets come down to intent, so your cards can fit two. A Squirrel deck with no Game Changers passes at both Exhibition and Core. Only you know which, so you pick.",
    "switch": "ANALYSIS_TAB_ENABLED"
  },
  "credits": {
    "text": "Reading a bracket is free. Anything written just for you uses a credit: an Overview, a Suggested changes run, a Look deeper. A run that comes back empty-handed gives the credit back.",
    "switch": null
  },
  "commit": {
    "text": "A card you add to a committed deck takes your copy right away. Your other decks see that only once you commit. Until then, “Put back” on Review changes still brings back a cut.",
    "switch": null
  },
  "one-copy": {
    "text": "A copy you own can live in only one committed deck at a time. The first deck to commit gets it, and drafts wait behind committed decks. Own one Sol Ring and run it in three decks, and two of them show it short.",
    "switch": null
  },
  "never-decklist": {
    "text": "Changing your Collection never changes a decklist. A deck that loses its copy keeps the card, shows it short and puts it on its shopping list.",
    "switch": null
  },
  "replace": {
    "text": "With Replace, any card that isn’t in the file leaves your Collection, and changes you made in the app are overwritten. With Add, your quantities go up and nothing leaves.",
    "switch": "COLLECTION_EDIT_ENABLED"
  },
  "own-it": {
    "text": "A card you own can still be on Shopping. If your Ghalta deck already holds your only Sol Ring, your Sai deck needs another.",
    "switch": null
  },
  "prices": {
    "text": "Prices are Mana Pool’s, and they refresh daily. A bare “buy” means Mana Pool has no price for that printing at all.",
    "switch": null
  },
  "proxy": {
    "text": "A proxy comes off the shopping list and uses no copy. A token you mark “I have one” leaves every deck’s list, since any printing counts.",
    "switch": null
  },
  "friends-see": {
    "text": "Friends see your name, your signature card, your wishlist and the decks you let them open. They never see your collection, or a deck’s prices, buy list or notes.",
    "switch": "SOCIAL_FRIENDS_ENABLED"
  },
  "hidden-deck": {
    "text": "A deck you hide looks deleted to friends: no tile, and its link stops working. Hiding it never frees its cards as spares.",
    "switch": "FRIEND_DECKS_ENABLED"
  },
  "invites": {
    "text": "Invites are given out by The 99, never bought. Whatever email you type, you’re told “Invitation sent”, so nobody can use an invite to find out who’s on The 99.",
    "switch": "SOCIAL_INVITES_ENABLED"
  }
} as const;

export const ABOUT_STRINGS = {
  index: "One page for each part of the app, drawn from the app itself. The ? on any screen opens its page.",
  goodToKnow: "Good to know",
  tryIt: "Try it",
  onThisPage: "On this page",
  bannerLead: (page: string) => `New on ${page}:`,
  bannerMulti: "New in the app",
  back: (screen: string) => `‹ Back to ${screen}`,
  toolShowMe: "Show me ›", // replaces "How it works ›"
} as const;

// Addendum A1 (2026-10-28): where the ? lands on the screens with no section of their own. Each lands on a page section
// with one label or rule lit (the halo, no New tag), under the "‹ Back to {screen}" bar. Never the /about index.
export const ABOUT_Q_LANDINGS = {
  "card-details": { lands: "collection/cards", lit: { label: "key" }, note: "desktop only: at 390 card details covers the ?" },
  sets: { lands: "collection/cards", lit: { label: "tabs" } },
  proxies: { lands: "shopping/deck-shopping", lit: { rule: "proxy" } },
  history: { lands: "collection/upload", lit: { rule: "replace" } },
  wishlist: { lands: "collection/cards", lit: { label: "tabs" } },
  "new-deck": { lands: "decks/your-decks", lit: { label: "new-deck" } }, // /decks/new, /decks/import
  "new-deck@precons": { lands: "decks/your-decks", lit: { label: "precons" } }, // /decks/precons/**
  "new-deck@choose": { lands: "commanders/for-you", lit: { label: "places" } }, // /commanders/choose
  settings: { lands: "home/whats-new", lit: { label: "lead" } },
  credits: { lands: "decks/analysis", lit: { rule: "credits" } },
  // account: no landing. The menu never names a screen; a ? pressed while it is open answers for the page under it.
} as const;
