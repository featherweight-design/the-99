"""About as six visual pages R1 (account 2, 2026-10-27): the content.

Every label and rule here is drawn from the audit's keep list (docs/superpowers/about-visual/audit-2026-10-27.md) and
written to the walk's voice rules (walk-rulings-2026-10-27.md): plain full sentences, say what happens, no sales-y
asides, a concrete example for an abstract rule. Boxes are fractions of each capture (x, y, w, h), measured on today's
captures: phone = public/about/shots/amonkhet (390x844), desktop = 1300x900 contact-sheet frames.
"""

AREAS = [
    ("home", "Home", "What’s new, what to build next, and the decks you left off."),
    ("collection", "Collection", "Every card you own, and how cards get in."),
    ("commanders", "Commanders", "Who to build next, from what you own or what’s worth buying."),
    ("decks", "Decks", "Building a deck, reading it, and keeping its versions."),
    ("shopping", "Shopping", "What your decks still need, and the cheaper ways to get it."),
    ("friends", "Friends", "The people you play with, your pods, and what they can see."),
]

# A label: (id, lead, sentence, phone box or None, desktop box or None, switch or None)
# A box of None means today's capture of that width doesn't hold the region (flagged on the canvas, a capture task).
SECTIONS = {
    "decks": [
        dict(id="your-decks", name="Your decks", sub="Every deck, with what it needs next.",
             phone="p-decks", desk=None, labels=[
                 ("new-deck", "New deck", " starts from a commander. “Import a deck” brings in a list you already play.",
                  (0.04, 0.165, 0.92, 0.058), None, None),
                 ("deck-status", "A deck’s status", " says what to do next. “To buy” is a full deck you can’t sleeve yet, and “Draft” is one you’ve never committed.",
                  (0.077, 0.852, 0.153, 0.026), None, None),
                 ("decks-stats", "Stats", " puts every deck side by side: when each was last played, and how it went.",
                  (0.04, 0.322, 0.30, 0.045), None, "LINEUP_ENABLED"),
             ], rules=[], tools=["lineup"]),
        dict(id="your-deck", name="Your deck", sub="The list, and what each row is telling you.",
             phone="p-deck-your-deck", desk="d-deck", labels=[
                 ("row", "A row’s dot", " shows whether you own the card: filled green is in your Collection, hollow and dashed is not. A bright edge marks a row you changed since your last commit.",
                  (0.041, 0.392, 0.918, 0.04), (0.068, 0.648, 0.45, 0.04), None),
                 ("bracket-marks", "The marks after a name", " flag what matters for your bracket: Game Changers, mass land denial, extra turns and tutors. Exhibition and Core allow no Game Changers, so count them before the rule zero chat.",
                  (0.041, 0.3198, 0.42, 0.0184), (0.068, 0.548, 0.11, 0.024), "ANALYSIS_TAB_ENABLED"),
                 ("lock", "Lock cards", " protects the cards you pick. No tool will offer to cut a locked card.",
                  (0.041, 0.1598, 0.2974, 0.0521), None, "NEVER_CUT_ENABLED"),
                 ("mix", "Recommended mix", " counts ramp, draw, removal, wipes and lands against what decks like yours run. “consider →” shows cards that fill a gap.",
                  None, (0.068, 0.205, 0.912, 0.13), None),
                 ("commit", "Your changes", " wait here until you commit. “Commit as v2” saves them as the deck’s next version.",
                  None, (0.068, 0.035, 0.912, 0.15), None),
             ], rules=["autofill", "lock", "targets"], tools=["top-off"]),
        dict(id="analysis", name="Analysis", sub="Where your deck sits, and the tools that tune it.",
             phone="p-deck-analysis", desk="d-analysis", labels=[
                 ("bracket", "Analyze", " reads your list against the Commander Format Panel’s bracket rules and shows where your cards sit. Reading a bracket is free.",
                  (0.05, 0.773, 0.9, 0.052), (0.071, 0.062, 0.578, 0.235), "ANALYSIS_TAB_ENABLED"),
                 ("findings", "What is in this deck", " counts Game Changers, mass land denial, extra turns, two-card infinites and tutors. Each count opens to show its cards.",
                  None, (0.071, 0.40, 0.906, 0.135), "ANALYSIS_TAB_ENABLED"),
                 ("suggested", "Suggested changes", " offers up to five cards to add and five to cut, each with its reason. Each run uses a credit.",
                  None, (0.071, 0.628, 0.449, 0.12), "TUNING_ENABLED"),
                 ("cuts", "Proposed cuts", " counts where a deck over 100 runs long, for free. “Look deeper” names the cards for a credit.",
                  None, (0.528, 0.628, 0.449, 0.12), "PROPOSED_CUTS_ENABLED"),
                 ("describe", "Describe your deck", " in a sentence or two. Suggested changes uses it to understand what the deck is for.",
                  (0.04, 0.578, 0.92, 0.152), None, "TUNING_ENABLED"),
             ], rules=["intent", "credits"], tools=["suggested-changes", "proposed-cuts"]),
        dict(id="versions", name="Versions", sub="Every commit, kept.",
             phone="p-deck-versions", desk=None, labels=[
                 ("version", "Each commit", " saves a version with its date, card count and average mana value. Open one to see which of its new cards you own today.",
                  (0.036, 0.09, 0.928, 0.31), None, None),
                 ("precon-link", "Built from a precon?", " Link it, and the deck’s history starts from the box as v0.",
                  (0.04, 0.53, 0.92, 0.15), None, "PRECONS_ENABLED"),
             ], rules=["commit"], tools=[]),
        dict(id="games", name="Games", sub="What happened at the table.",
             phone="p-deck-games", desk=None, labels=[
                 ("log", "Log a game", " after you play. It takes about fifteen seconds, and Suggested changes reads your games.",
                  (0.041, 0.114, 0.918, 0.052), None, None),
                 ("matchups", "Matchups", " splits a deck’s games by the commander, the colors or the friend across the table.",
                  (0.041, 0.19, 0.918, 0.23), None, "SOCIAL_GAMES_ENABLED"),
             ], rules=[], tools=["matchups"]),
        dict(id="stats", name="Stats", sub="The deck, drawn.",
             phone="p-deck-stats", desk=None, labels=[
                 ("curve", "The curve", " counts the deck’s cards by mana value. Tap a card type to light it up.",
                  (0.041, 0.2141, 0.9179, 0.6646), None, "DECK_STATS_ENABLED"),
             ], rules=[], tools=[]),
        dict(id="notes", name="Notes", sub="The small stuff, kept with the deck.",
             phone="p-deck-notes", desk=None, labels=[
                 ("note", "A note", " stays with the deck through every commit. No tool reads your notes.",
                  (0.0436, 0.4245, 0.9128, 0.0545), None, "DECK_NOTES_ENABLED"),
             ], rules=[], tools=[]),
    ],
    "home": [
        dict(id="home", name="Home", sub="Where every visit starts.", phone="p-home", desk="d-home", labels=[
            ("help", "The ?", " on any screen opens that screen’s part of these pages.",
             (0.708, 0.024, 0.113, 0.052), None, "HELP_PANEL_ENABLED"),
            ("ready", "Ready to build", " shows two commanders you could build today from cards you own. They change every day.",
             (0.044, 0.281, 0.913, 0.34), (0.065, 0.13, 0.655, 0.42), None),
            ("in-use", "Cards in use", " counts only committed decks. “Spoken for twice” is cards your decks want more copies of than you own.",
             None, (0.73, 0.105, 0.245, 0.175), None),
        ], rules=[], tools=[]),
        dict(id="whats-new", name="What’s new", sub="News for you, newest first.", phone="p-home-feed", desk=None, labels=[
            ("lead", "The top story", " is the newest thing for you: a set, a precon, a price drop on your wishlist, or a combo you can now make.",
             (0.041, 0.2493, 0.9179, 0.2343), None, "HOME_FEED_ENABLED"),
        ], rules=[], tools=[]),
    ],
    "collection": [
        dict(id="cards", name="Cards", sub="Everything you own, card by card.", phone="p-collection", desk="d-collection", labels=[
            ("tabs", "Cards, Sets, Proxies, History and Wishlist", " are your Collection’s tabs.",
             (0.03, 0.105, 0.82, 0.045), (0.075, 0.13, 0.15, 0.035), None),
            ("add", "The +", " adds cards by name, by scanning them, or from a file.",
             (0.887, 0.1, 0.092, 0.043), (0.85, 0.055, 0.13, 0.045), "COLLECTION_EDIT_ENABLED"),
            ("key", "The key", " explains every mark a card can carry, from Game Changer to In use.",
             (0.031, 0.293, 0.938, 0.104), (0.065, 0.348, 0.92, 0.03), None),
            ("taken", "“none free”", " means committed decks hold every copy you own.",
             (0.43, 0.508, 0.2, 0.024), None, None),
        ], rules=["one-copy", "never-decklist"], tools=["find-a-deck", "wishlist"]),
        dict(id="upload", name="Upload a file", sub="Bring in an export from another app.", phone="p-upload", desk=None, labels=[
            ("drop", "Drop in a CSV", " from ManaBox, Moxfield, Archidekt or Deckbox, or paste a list. Nothing changes until you confirm.",
             (0.046, 0.324, 0.908, 0.327), None, None),
        ], rules=["replace"], tools=["collection-sync"]),
    ],
    "commanders": [
        dict(id="for-you", name="For you", sub="Commanders you own, ranked by fit.", phone="p-commanders", desk="d-commanders", labels=[
            ("places", "For you, Discover and Help me choose", " are three ways to find your next commander.",
             (0.03, 0.105, 0.62, 0.045), (0.065, 0.13, 0.15, 0.035), "COMMANDERS_PLACE_ENABLED"),
            ("fit", "The fit score", " out of 100 says how well your cards suit a commander.",
             (0.736, 0.562, 0.195, 0.06), (0.92, 0.39, 0.06, 0.06), None),
            ("styles", "Play styles", " come from the decks EDHREC tracks for that commander.",
             (0.036, 0.655, 0.928, 0.1), (0.07, 0.8, 0.6, 0.06), None),
        ], rules=[], tools=["help-me-choose"]),
        dict(id="discover", name="Discover", sub="Commanders worth buying.", phone="p-discover", desk=None, labels=[
            ("order", "The order", " you pick changes what leads. Each order says what it ranks by.",
             (0.04, 0.24, 0.92, 0.05), None, None),
        ], rules=[], tools=[]),
    ],
    "shopping": [
        dict(id="deck-shopping", name="A deck’s Shopping", sub="What one deck still needs.", phone="p-deck-shopping", desk="d-shopping", labels=[
            ("total", "The total", " is what this deck still needs at Mana Pool. “Buy these at Mana Pool” opens a cart with them.",
             (0.04, 0.24, 0.92, 0.135), (0.065, 0.005, 0.5, 0.065), None),
            ("limit", "Marking cards over $10", " sets this deck’s price limit. Cards over it get cheaper stand-ins.",
             (0.04, 0.403, 0.92, 0.032), (0.065, 0.085, 0.35, 0.03), "SWAP_TOOLS_ENABLED"),
            ("standins", "⇄", " opens cheaper stand-ins for a card over your limit.",
             (0.545, 0.617, 0.063, 0.031), (0.395, 0.355, 0.03, 0.03), "SWAP_TOOLS_ENABLED"),
            ("spare", "The friends mark", " means a friend can spare that card. Press it to see who, and ask for one. An ask with no answer lapses after 14 days.",
             (0.489, 0.661, 0.119, 0.031), (0.425, 0.355, 0.03, 0.03), "SOCIAL_FRIENDS_ENABLED"),
            ("buy", "buy", " shows the price. Press it when you’ve bought the card, and it goes into your Collection.",
             (0.632, 0.623, 0.214, 0.018), (0.455, 0.355, 0.06, 0.03), "SHOPPING_MARK_BOUGHT_ENABLED"),
        ], rules=["own-it", "prices", "proxy"], tools=["stand-ins", "friend-spares"]),
        dict(id="all-decks", name="Shopping for all decks", sub="Every deck’s missing cards in one cart.", phone="p-decks", desk=None, labels=[
            ("cart", "Shop all decks", " puts every deck’s missing cards in one cart, so you check out at Mana Pool once.",
             (0.04, 0.232, 0.45, 0.065), None, "ALL_DECKS_CART_ENABLED"),
        ], rules=[], tools=[]),
    ],
    "friends": [
        dict(id="friends", name="Friends", sub="Your friends, and your pods.", phone="p-friends", desk="d-friends", labels=[
            ("face", "Your signature card", " is how friends see you, beside your name.",
             (0.04, 0.155, 0.92, 0.055), (0.11, 0.025, 0.4, 0.05), "SIGNATURE_CARD_ENABLED"),
            ("add", "Add a friend", " sends a link that works once, or shows a QR code to scan at the table. Nobody can find you by searching.",
             (0.041, 0.289, 0.918, 0.057), (0.81, 0.025, 0.12, 0.04), "SOCIAL_FRIENDS_ENABLED"),
            ("friend", "A friend’s page", " shows their spares, wishlist and the decks they let you open.",
             (0.041, 0.462, 0.918, 0.06), (0.11, 0.13, 0.82, 0.05), "SOCIAL_FRIENDS_ENABLED"),
            ("pod", "A pod", " is a group you play with. You pick, pod by pod, who sees your spares.",
             (0.04, 0.625, 0.92, 0.2), (0.11, 0.335, 0.82, 0.175), "SOCIAL_FRIENDS_ENABLED"),
            ("rule0", "Rule 0 check", " compares everyone’s seat before tonight’s game.",
             (0.08, 0.879, 0.841, 0.0625), None, "RULE_ZERO_ENABLED"),
        ], rules=["friends-see", "hidden-deck", "invites"], tools=["friends"]),
    ],
}

# Good to know: (id, sentence, switch). The diagram for each is drawn in pieces.py.
RULES = {
    "autofill": ("When The 99 fills a deck, it uses your Collection first. It picks cards to buy only where you run short, and then it picks the ones your commander’s decks play most.", None),
    "lock": ("A locked card is safe from every tool: Suggested changes, Proposed cuts, Clear all auto, Pull it and Update from a list all skip it. The lock ends when you commit a version without the card.", "NEVER_CUT_ENABLED"),
    "targets": ("Targets come from decks with your commander, so a Kinnan deck asks for more ramp than most. Going over a target never counts against you.", None),
    "intent": ("At either end of the scale, brackets come down to intent, so your cards can fit two. A Squirrel deck with no Game Changers passes at both Exhibition and Core. Only you know which, so you pick.", "ANALYSIS_TAB_ENABLED"),
    "credits": ("Reading a bracket is free. Anything written just for you uses a credit: an Overview, a Suggested changes run, a Look deeper. A run that comes back empty-handed gives the credit back.", None),
    "commit": ("A card you add to a committed deck takes your copy right away. Your other decks see that only once you commit. Until then, “Put back” on Review changes still brings back a cut.", None),
    "one-copy": ("A copy you own can live in only one committed deck at a time. The first deck to commit gets it, and drafts wait behind committed decks. Own one Sol Ring and run it in three decks, and two of them show it short.", None),
    "never-decklist": ("Changing your Collection never changes a decklist. A deck that loses its copy keeps the card, shows it short and puts it on its shopping list.", None),
    "replace": ("With Replace, any card that isn’t in the file leaves your Collection, and changes you made in the app are overwritten. With Add, your quantities go up and nothing leaves.", "COLLECTION_EDIT_ENABLED"),
    "own-it": ("A card you own can still be on Shopping. If your Ghalta deck already holds your only Sol Ring, your Sai deck needs another.", None),
    "prices": ("Prices are Mana Pool’s, and they refresh daily. A bare “buy” means Mana Pool has no price for that printing at all.", None),
    "proxy": ("A proxy comes off the shopping list and uses no copy. A token you mark “I have one” leaves every deck’s list, since any printing counts.", None),
    "friends-see": ("Friends see your name, your signature card, your wishlist and the decks you let them open. They never see your collection, or a deck’s prices, buy list or notes.", "SOCIAL_FRIENDS_ENABLED"),
    "hidden-deck": ("A deck you hide looks deleted to friends: no tile, and its link stops working. Hiding it never frees its cards as spares.", "FRIEND_DECKS_ENABLED"),
    "invites": ("Invites are given out by The 99, never bought. Whatever email you type, you’re told “Invitation sent”, so nobody can use an invite to find out who’s on The 99.", "SOCIAL_INVITES_ENABLED"),
}

# The shipped tool cards (src/lib/copy/discovery.ts showcaseCopy.tools), with their crop and footer.
TOOLS = {
    "top-off": ("Top off", "Ranks your own cards for a deck’s open slots. Nothing is added until you say so.", None, "Try it on Ghalta"),
    "suggested-changes": ("Suggested changes", "Up to five swaps, read from your games, your notes and the list.", "1 credit", "Try it on Ghalta"),
    "proposed-cuts": ("Proposed cuts", "Counts where a deck runs long. A deeper look names the cuts.", "free · look deeper 1 credit", "Try it on Sai"),
    "mana-balance": ("Mana Balance", "Counts every source of each color against what your spells ask for.", "free", "Try it on Ghalta"),
    "stand-ins": ("Cheaper stand-ins", "For a card over your price limit: cards that do the same job for less.", None, "Try it on Sai"),
    "friend-spares": ("Friends’ spares", "A friend’s spare copy of a card your deck still needs, before you buy one.", None, "Try it on Sai"),
    "matchups": ("Matchups", "Splits a deck’s games by the commander, colors or friend across the table.", None, "Try it on Ghalta"),
    "lineup": ("Stats for your decks", "Every deck side by side: when each last played, and how it went.", None, "See your decks on Stats"),
    "find-a-deck": ("Find a deck", "Reads your decks for the one a card you own fits best.", "1 credit", "Try it on a card you own"),
    "wishlist": ("Wishlist", "Cards you want that no deck is asking for. A card leaves once you have enough.", None, "Open your wishlist"),
    "collection-sync": ("Collection Sync", "Merges a new file with what you changed here, card by card, and asks only where both moved.", None, "Upload a file"),
    "help-me-choose": ("Help me choose", "Say what you want, and we’ll rank commanders by how well they fit it, owned or not.", None, "Open Help me choose"),
    "friends": ("Friends and pods", "Add the people you play with, then seat them when you log a game.", None, "Open Friends"),
}
