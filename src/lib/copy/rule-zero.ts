// src/lib/copy/rule-zero.ts: the Rule 0 table check's strings (plan `2026-10-16-rule-zero.md`, PR 3).
// Set by /copy-review on 2026-10-17 from the handoff's `design/design_handoff_the99_rule_zero/rule-zero · copy
// strings.ts`, readiness gap 14 included: eight edits (the three "his" strings go pronoun-free, `swap.sub` names no
// gesture, `setup.tooFew`, `setup.friendDecksFoot` and `read.nothingBody` tightened, `expired.body` drops "Tables last
// the night", which contradicted the 24 hours). The honesty line was checked against the shipped detection strings
// and kept. Reused shipped strings are named, not copied: BRACKET_NAMES, `bracketPhrase` and the findings labels
// (deckAnalysisCopy), the provenance opener ("How we make these decisions"), the pod card's tags (socialCopy.pods),
// the game log's "You" (gameSeatsCopy). Board references are to the handoff's boards (E, U, T, S, L phone; F, V, D,
// W, H desktop).

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
    // Not drawn: your seat waits for a deck. `setter` is null when their profile is gone, so the sentence names nobody.
    homeBodyWaiting: (setter: string | null, n: number, closes: string) =>
      `${setter === null ? "You’re seated." : `${setter} seated you.`} Pick your deck at the table. ${seated(n)}, open until ${closes}.`,
    homeBodyWaitingOwn: (n: number, closes: string) => `You set the table. Pick your deck there. ${seated(n)}, open until ${closes}.`,
    homeOpen: "Open the table",
  },

  // Setup (U1 to U4)
  setup: {
    whoTitle: "Who’s playing?",
    whoSub: (pod: string) => `${pod} · pick tonight’s players. A game seats 2 to 8.`,
    noDecks: "no decks yet",
    picksOwn: "picks their own", // tile sub for a member who isn't your friend
    decks: (n: number) => (n === 1 ? "1 deck" : `${n} decks`), // tile sub for you and a friend with decks ("5 decks")
    count: seated,
    next: "Next: decks",
    tooFew: "Seat one more player.",
    tooMany: "A game seats up to 8.",
    inviteTitle: "Playing with someone not on The 99?",
    inviteBody: (owner: string) => `Invite them. Once they join and ${owner} adds them to the pod, they can take a seat.`,
    inviteBodyOwner: "Invite them. Once they join, add them to the pod and they can take a seat.",
    decksTitle: "Tonight’s decks",
    decksSub: "You start each seat; everyone can change their own on their phone.",
    pick: "Pick a deck",
    leaveIt: (name: string) => `or leave it to ${name}`,
    leaveItRow: (name: string) => `Leave it to ${name}`,
    leaveItSub: "their seat waits until they pick",
    notFriendRow: (name: string) => `${name} picks their own`,
    notFriendSub: "not your friend, so their decks aren’t listed",
    friendDecksTitle: (name: string) => `${name}’s deck`,
    yourDecksTitle: "Your deck", // the same screen for your own seat
    // Not drawn: your own seat with no deck (you have none, or Seats reopens a seat you cleared). Its pick is made on
    // the table, from your own seat.
    yourSeatWaits: "Pick yours on the table",
    friendDecksList: (name: string) => `${name}’s decks`, // the list's name
    backToSeats: "Back to the seats", // the ‹ on a player's decks
    whoGroup: "Who is playing", // the tiles' group name
    close: "Close",
    friendDecksFoot: "Name and commander only. Brackets appear once the table is set.",
    back: "Players", // "‹ Players"
    set: "Set the table",
    // Not drawn by the boards: a Set the table or Seats the server refused (the table closed, a member left), in the
    // warning slot, role alert. The sheet stays open with the seats kept.
    failed: "We couldn’t set the table. Try again.",
    // Not drawn: the pod already has an open table you were not seated at (one per pod, G7).
    occupied: "This pod already has a table tonight.",
  },

  // The page and the read (T1 to T10)
  page: {
    title: "Rule 0 check",
    // The meta line after the pod's name (drawn in bold), then `open until`: its own line on the phone, after a ` · `
    // on desktop. "Thursday night · set by Colin · 4 seated · open until 9:40 pm tomorrow"
    metaSetBy: (setter: string | null, n: number) => ` · set by ${setter ?? "you"} · ${seated(n)}`,
    metaOpen: (closes: string) => `open until ${closes}`,
    closesTomorrow: (time: string) => `${time} tomorrow`, // "9:40 pm tomorrow"; today's close is the time alone
    closesOn: (time: string, day: string) => `${time} ${day}`, // "12:30 am Mon": two calendar days on, across a clock change
    seats: "Seats", // setter only
    readKicker: "The read",
    updated: (when: string) => `updated ${when}`, // "updated just now", "updated 9:42 pm"
    log: "Log this game",
  },
  read: {
    balanced: (bracket: string) => `Balanced: every deck reads ${bracket}.`,
    // When the read seats do not all read the same: no single bracket is claimed for them.
    balancedMixed: "Balanced: every deck sits within a bracket of the rest.",
    balancedBody: "No deck sits a bracket or more from the rest. It’s a read of each list, so still say what you brought.",
    high: (whose: string, deck: string) => `${whose} ${deck} reads above the table.`, // "Colin’s Zimone Combo", "Your Zimone Combo"
    low: (whose: string, deck: string) => `${whose} ${deck} reads below the table.`,
    sitsAt: (middle: string, deck: string, reads: string) => `The table sits at ${middle}; ${deck} reads ${reads}.`,
    oneBody: (middle: string, deck: string, reads: string) => `The table sits at ${middle}; ${deck} reads ${reads}. Worth a word before you shuffle.`,
    // T3: a low seat's sentence ends on why low is worth raising, where a high one's ends on the shuffle.
    lowBody: (middle: string, deck: string, reads: string) => `The table sits at ${middle}; ${deck} reads ${reads}. Low is worth the same word as high.`,
    // T7: a flagged seat whose declaration drifted says so in place of the closing line.
    driftNote: (whose: string, declared: string) => `${whose} declared ${declared} is from before its last reading, so it settles nothing.`,
    oneBodyOwn: (middle: string, deck: string, reads: string) => `The table sits at ${middle}; ${deck} reads ${reads}. You have decks that sit closer.`,
    two: "Two decks sit off the table, one each way.",
    many: (n: number) => `${n} decks sit off the table.`,
    // T4, T6: the middle, then each flagged seat. T5: each seat after `splitBody`. Parts join with `readsList`.
    middleIs: (middle: string) => `The middle is ${middle}.`,
    seatReads: (whose: string, deck: string, reads: string) => `${whose} ${deck} reads ${reads}`,
    seatReadsRange: (whose: string, deck: string, range: string, from: string) => `${whose} ${deck} reads ${range}, measured from ${from}`,
    seatDeclared: (name: string, answer: string) => `${name} declared ${answer}`, // "Colin declared Optimized", "You declared Optimized"
    // T8, T9: who the read compares while seats are left out. `names` comes from `seatNames`.
    comparing: (names: string, both: boolean, reads: string) => `Comparing ${names}: ${both ? "both" : "all"} read ${reads}.`,
    comparingMixed: (names: string) => `Comparing ${names}: they sit within a bracket of each other.`,
    readingMixed: (names: string, name: string) =>
      `${names.charAt(0).toUpperCase()}${names.slice(1)} sit within a bracket of each other. ${name}’s joins in a second.`,
    readingBody: (names: string, both: boolean, reads: string, name: string) =>
      `${names.charAt(0).toUpperCase()}${names.slice(1)} ${both ? "both" : "all"} read ${reads}. ${name}’s joins in a second.`,
    band: "TABLE", // the rail's dashed middle
    railLabel: "Each seat placed on the five brackets",
    keyLabel: "What the counts on each seat are",
    split: "A split: these two decks are a bracket or more apart.",
    splitBody: "With two seats there’s no rest of the table, so both are marked.",
    leftOut: (n: number) => (n === 1 ? "One seat isn’t in the read yet." : `${n} seats aren’t in the read yet.`),
    reading: (name: string) => `Reading ${name}’s deck…`,
    nothing: "Nothing to compare yet.",
    nothingBody: "A read needs two seats with decks we’ve read.",
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
      `it can find a two-card combo, ${a} + ${b}, with ${tutors === 1 ? "1 tutor" : `${tutors} tutors`} to reach it. Upgraded allows a combo only as a draw away.`,
    whyLimit: (have: number, label: string, below: string, limit: number) => `${have} ${label}, where ${below} allows ${limit}.`,
    // What Core's and Upgraded's extra-turn limit counts: a two-card combo that loops turns (the brackets sheet's words).
    loopNouns: ["combo that loops turns", "combos that loop turns"] as const,
    whyLow: (bracket: string) => `nothing we counted passes ${bracket}’s limits, and the rest of the table reads higher. Counts can miss cards, so ask what it’s built to do.`,
    // T6: a low range nobody answered. `name` is null for the viewer's own seat.
    whyLowRange: (lo: string, hi: string, name: string | null) =>
      `the rules leave ${lo} against ${hi} to the player, and ${name === null ? "you haven’t" : `${name} hasn’t`} said. Even at ${hi} it sits below the table.`,
    undeclared: (from: string) => `not declared · measured from ${from}`,
    declared: (answer: string, range: string) => `declared ${answer} · reads ${range}`,
    drifted: (declared: string, from: string) => `declared ${declared}, outside this reading · measured from ${from}`,
    stale: "from before its last change",
    short: (n: number) => `${n} of 100 cards.`,
    shortBody: "A deck is read once it’s complete, so this seat is left out of the read for now.",
    over: (n: number) => `${n} cards, over 100.`,
    // Neutral on whether a reading exists: an over-100 deck may never have been read (the board's had one).
    overBody: "Any reading from before that change isn’t used. Back at 100, it joins the read.",
    readingNow: "Reading this deck.",
    readingNowBody: "It’s at 100 and hasn’t been read before; this takes a second or two.",
    waiting: (name: string) => `${name} picks their own deck on their phone. Until then this seat is left out of the read.`,
    commanders: (commander: string, partner: string) => `${commander} + ${partner}`, // a partner pair, as whyCombo pairs cards
    picking: "Picking their deck", // T10: the deck line of a seat that waits
    pickingOwn: "Picking your deck",
    pickingSub: "their seat joins the read when they do", // T10: the commander line of a seat that waits
    pickingSubOwn: "your seat joins the read when you do",
    needsAnalysis: "Needs a fresh analysis.",
    needsAnalysisBody: (name: string | null) =>
      name === null
        ? "Analyze it again from its deck page. Until then your seat is left out of the read."
        : `${name} can analyze it again from the deck page. Until then this seat is left out of the read.`,
    label: (name: string | null) => (name === null ? "Your seat" : `${name}’s seat`),
    changeDeck: "Change deck",
    changedNow: "changed just now",
    changedAgo: (ago: string) => `changed ${ago}`, // "changed 1 min ago"
  },

  // The suggestion and Change deck (S1 to S6)
  swap: {
    title: "Closer to the table",
    sub: (middle: string) => `Your decks that read nearer ${middle}. A swap changes it for everyone at the table.`,
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
    body: (pod: string, setter: string) => `${pod}’s table closed 24 hours after ${setter} set it. Games logged from it stay on each deck’s Games tab.`,
    back: "Back to Friends",
  },
} as const;

/**
 * The `whose` the read's headlines take (`read.high`, `read.low`): `Colin’s`, or `Your` for the viewer's own seat,
 * as the reviewed file's own comment on `read.high` gives them. An engineering helper over that parameter, not a
 * new string: the headline opens on it, so the viewer's form is capitalized.
 */
export const whose = (name: string | null): string => (name === null ? "Your" : `${name}’s`);

/** Parts of a read sentence (`seatReads`, `seatDeclared`, ...) as one sentence: `A, B.` */
export const readsList = (parts: readonly string[]): string =>
  // A part with its own comma (`reads Exhibition or Core, measured from Core`) takes semicolons between parts (T6).
  `${parts.join(parts.some((p) => p.includes(",")) ? "; " : ", ")}.`;

/**
 * T8's count of the seats left out for their size: `Peter’s deck has 87 of 100 cards; Max’s has 101.` Null is the
 * viewer. The first names the deck; the rest take the possessive alone.
 */
export function leftOutCards(seats: readonly { name: string | null; cards: number }[]): string {
  const parts = seats.map(({ name, cards }, i) => {
    const who = name === null ? (i === 0 ? "Your deck" : "yours") : i === 0 ? `${name}’s deck` : `${name}’s`;
    const n = cards < 100 ? `${cards} of 100 cards` : i === 0 ? `${cards} cards` : `${cards}`;
    return `${who} has ${n}`;
  });
  return parts.length === 0 ? "" : `${parts.join("; ")}.`;
}

/**
 * The seats a read compares, as T8 and T9 name them: `your seat and Colin’s`, `your seat, Colin’s and Max’s`. Null
 * is the viewer. The first names the seat; the rest take the possessive alone.
 */
export function seatNames(names: readonly (string | null)[]): string {
  const words = names.map((n, i) => (i === 0 ? (n === null ? "your seat" : `${n}’s seat`) : n === null ? "yours" : `${n}’s`));
  return words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
