// Rule 0 table check R1 · copy strings · account 1, 2026-10-16.
// Brief: docs/superpowers/design-briefs/2026-10-16-rule-zero-table-check.md.
//
// Everything here is NEW and owed to /copy-review before it ships. Reused shipped strings are named, not copied:
// BRACKET_NAMES and the findings labels (deckAnalysisCopy), the provenance opener ("How we make these decisions"),
// the pod card (socialCopy.pods), Add a friend › Invite someone new (inviteCopy.path), the log form (Social R3).
// Board references are to this handoff's boards (E, U, T, S, L phone; F, V, D, W, H desktop).

const seated = (n: number) => `${n} seated`;

export const ruleZeroCopy = {
  // Entry (E1 to E3)
  entry: {
    row: "Rule 0 check",
    rowSub: "Seat tonight’s players, compare their decks",
    open: "Tonight’s table",
    openSub: (n: number, closes: string) => `${seated(n)} · open until ${closes}`, // "4 seated · open until 9:40 pm tomorrow"
    homeKicker: "Tonight’s table",
    homeBody: (setter: string, deck: string, n: number, closes: string) =>
      `${setter} seated you with ${deck}. ${seated(n)}, open until ${closes}.`,
    homeBodyOwn: (deck: string, n: number, closes: string) => `You’re seated with ${deck}. ${seated(n)}, open until ${closes}.`,
    homeOpen: "Open the table",
  },

  // Setup (U1 to U4)
  setup: {
    whoTitle: "Who’s playing?",
    whoSub: (pod: string) => `${pod} · pick tonight’s players. A game seats 2 to 8.`,
    noDecks: "no decks yet",
    picksOwn: "picks their own", // tile sub for a member who isn't your friend
    count: seated,
    next: "Next: decks",
    tooFew: "Seat one more player. A game seats 2 to 8.",
    tooMany: "A game seats up to 8.",
    inviteTitle: "Playing with someone not on The 99?",
    inviteBody: (owner: string) => `Invite them. Once they join and ${owner} adds them to the pod, they can take a seat.`,
    inviteBodyOwner: "Invite them. Once they join, add them to the pod and they can take a seat.",
    decksTitle: "Tonight’s decks",
    decksSub: "You start each seat; everyone can change their own on their phone.",
    pick: "Pick a deck",
    leaveIt: (name: string) => `or leave it to ${name}`,
    leaveItRow: (name: string) => `Leave it to ${name}`,
    leaveItSub: "his seat waits until he picks", // pronoun-free variant owed: "their seat waits until they pick"
    notFriendRow: (name: string) => `${name} picks his own`, // copy-review: pronoun-free variant
    notFriendSub: "not your friend, so his decks aren’t listed",
    friendDecksTitle: (name: string) => `${name}’s deck`,
    friendDecksFoot: "Name and commander only, as the game log’s picker shows a friend’s decks. Brackets appear once the table is set.",
    back: "Players", // "‹ Players"
    set: "Set the table",
  },

  // The page and the read (T1 to T10)
  page: {
    title: "Rule 0 check",
    meta: (pod: string, setter: string | null, n: number, closes: string) =>
      `${pod} · set by ${setter ?? "you"} · ${seated(n)} · open until ${closes}`,
    seats: "Seats", // setter only
    readKicker: "The read",
    updated: (when: string) => `updated ${when}`, // "updated just now", "updated 9:42 pm"
    log: "Log this game",
  },
  read: {
    balanced: (bracket: string) => `Balanced: every deck reads ${bracket}.`,
    balancedBody: "No deck sits a bracket or more from the rest. It’s a read of each list, so still say what you brought.",
    high: (whose: string, deck: string) => `${whose} ${deck} reads above the table.`, // "Colin’s Zimone Combo", "Your Zimone Combo"
    low: (whose: string, deck: string) => `${whose} ${deck} reads below the table.`,
    oneBody: (middle: string, deck: string, reads: string) => `The table sits at ${middle}; ${deck} reads ${reads}. Worth a word before you shuffle.`,
    oneBodyOwn: (middle: string, deck: string, reads: string) => `The table sits at ${middle}; ${deck} reads ${reads}. You have decks that sit closer.`,
    two: "Two decks sit off the table, one each way.",
    many: (n: number) => `${n} decks sit off the table.`,
    split: "A split: these two decks are a bracket apart.",
    splitBody: "With two seats there’s no rest of the table, so both are marked.",
    leftOut: (n: number) => (n === 1 ? "One seat isn’t in the read yet." : `${n} seats aren’t in the read yet.`),
    reading: (name: string) => `Reading ${name}’s deck…`,
    nothing: "Nothing to compare yet.",
    nothingBody: "A read needs two seats with read decks.",
    since: "Since you looked",
    swappedTo: (name: string, deck: string) => `${name} swapped to ${deck}.`,
    honest:
      "Each bracket is read from the list. Game Changers are exact; combos, tutors, extra turns and land denial can be " +
      "missed. A flag is a reason to talk, not a ruling.",
    // the opener is deckAnalysisCopy.provenance.toggle + " →"
  },

  // A seat
  seat: {
    you: "YOU",
    above: "Above the table",
    below: "Below the table",
    split: "Split",
    whyLead: "What puts it here:",
    whyCombo: (a: string, b: string, tutors: number) =>
      `it can find a two-card combo, ${a} + ${b}, with ${tutors} tutors to reach it. Upgraded allows a combo only as a draw away.`,
    whyLimit: (have: number, label: string, below: string, limit: number) => `${have} ${label}, where ${below} allows ${limit}.`,
    whyLow: (bracket: string) => `nothing we counted passes ${bracket}’s limits, and the rest of the table reads higher. Counts can miss cards, so ask what it’s built to do.`,
    undeclared: (from: string) => `not declared · measured from ${from}`,
    declared: (answer: string, range: string) => `declared ${answer} · reads ${range}`,
    drifted: (declared: string, from: string) => `declared ${declared}, outside this reading · measured from ${from}`,
    stale: "from before its last change",
    short: (n: number) => `${n} of 100 cards.`,
    shortBody: "A deck is read once it’s complete, so this seat is left out of the read for now.",
    over: (n: number) => `${n} cards, over 100.`,
    overBody: "Its last reading is from before that change and isn’t used. Back at 100, it joins the read.",
    readingNow: "Reading this deck.",
    readingNowBody: "It’s at 100 and hasn’t been read before; this takes a second or two.",
    waiting: (name: string) => `${name} picks their own deck on their phone. Until then this seat is left out of the read.`,
    changeDeck: "Change deck",
    changedNow: "changed just now",
    changedAgo: (ago: string) => `changed ${ago}`, // "changed 1 min ago"
  },

  // The suggestion and Change deck (S1 to S6)
  swap: {
    title: "Closer to the table",
    sub: (middle: string) => `Your decks that read nearer ${middle}. One tap swaps it in for everyone.`,
    swapIn: "Swap in",
    toast: (deck: string) => `Swapped to ${deck}.`, // shared toast, with the shipped "Undo"
    sheetTitle: "Your deck tonight",
    sheetSub: "Nearest the table first. Everyone sees the change on their next look.",
    seatedTag: "seated",
    notRead: (n: number) => `${n} of 100 · not read yet`,
  },

  // Logging and expiry (L1 to L4)
  log: {
    from: (pod: string) => `From ${pod}’s table. Seats filled; change anything.`,
    fromTable: "from the table", // tag on a seat who isn't your friend
  },
  expired: {
    title: "This table has closed",
    body: (pod: string, setter: string) => `${pod}’s table closed the morning after ${setter} set it. Games logged from it stay on each deck’s Games tab.`,
    back: "Back to Friends",
  },
} as const;
