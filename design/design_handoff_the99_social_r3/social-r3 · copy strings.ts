// social-r3 · copy strings.ts. R1 (opponents in the game log, and matchups). PLACEHOLDERS: /copy-review sets the words.
// Target: additions to src/lib/copy/game-log.ts (gameLogCopy.seats, gameLogCopy.matchups, gameLogCopy.history.vs).
// The file's rule holds: NO STRING HERE PRINTS A PERCENTAGE OR `net`. Every count carries its denominator.
// Opponent labels and display names are player-typed (30 max) and reach no model.

const games = (n: number) => (n === 1 ? "1 game" : `${n} games`);
const decks = (n: number) => (n === 0 ? "no decks" : n === 1 ? "1 deck" : `${n} decks`);

export const socialGamesCopy = {
  // ── The form's seat row ───────────────────────────────────────────────
  seats: {
    label: "Across the table",
    count: (filled: number, seats: number) => `${filled} of ${seats} seats`, // seats = pod size − 1
    you: "You",
    youTag: "YOU",
    add: "Add opponent",
    change: (name: string) => `Change ${name}`, // the seat's art, aria
    clear: (name: string) => `Clear ${name}’s seat`, // the ✕, aria
    addName: "Add a name",
    labelAria: "Who played it",
    labelCounter: (n: number) => `${n} / 30`,
    whichDeck: "Which deck?",
    addCommander: "Add a commander",
    seatPod: "Seat a pod",
    // On a loss, with at least one seat filled.
    wonHint: "Lost. If one of them won, press their trophy. Optional.",
    wonHintPhone: "Lost. If one of them won, press their Won. Optional.",
    wonAria: (name: string) => `${name} won`,
    wonPill: "Won", // phone
    wonLine: "won this game", // under the winning seat
    // Pod size pressed below the filled seats.
    held: (seats: number) => `All ${seats} seats are filled. Clear a seat to make the pod smaller.`,
  },

  // ── The seat picker (desktop panel, phone sheet) ──────────────────────
  picker: {
    title: "Seat an opponent", // the sheet's heading; the panel's aria-label
    placeholder: "Friend or any commander",
    placeholderNoFriends: "Any commander",
    friends: "Friends",
    commanders: "Commanders",
    deckCount: decks,
    seated: "seated",
    footFriends: "Type to search every commander too.",
    footAnyone: "Any commander in the catalog. Name who played it on the seat.",
    back: "Back to friends",
    theirDecks: (name: string) => `${name}’s decks`,
    footDecks: (name: string) => `Name and commander only: nothing else of ${name}’s is read.`,
    noDecks: (name: string) => `${name} has no decks in The 99.`,
    anotherCommander: "Another commander",
    anotherCommanderSub: (name: string) => `search the catalog for what ${name} played`,
    pickCommander: "Pick a commander", // replaces Another commander when the friend has no decks
    justFriend: (name: string) => `Just ${name}`,
    justFriendSub: "no deck or commander",
    footNoDecks: (name: string) => `Either way, ${name}’s name is kept with the game.`,
    partner: "+ partner", // G6, not drawn
  },

  // ── History ───────────────────────────────────────────────────────────
  history: {
    vs: "vs",
    wonAria: "won",
    // `name · deck` for a friend's deck; `name · Commander` (short name) for anyone with a label or a friend with a commander.
  },

  // ── Matchups ──────────────────────────────────────────────────────────
  matchups: {
    heading: "Matchups",
    recorded: (recorded: number, total: number) => `recorded in ${recorded} of ${total} games`,
    split: "Split by", // radiogroup aria
    byCommander: "Commander",
    byColors: "Colors",
    byFriend: "Friend",
    empty: "No opponents recorded yet. Add who sat across the table when you log a game, and this splits your games by commander, colors and friend.",
    mostlyOne: "Most rows are a single game. A row means more each time a name comes back.",
    allOne: "Every row so far is a single game.",
    games,
    counts: (w: number, l: number, d: number) => (d > 0 ? `${w} W · ${l} L · ${d} D` : `${w} W · ${l} L`), // past 10 games
    squareAria: (w: number, l: number, d: number) =>
      [w && `${w} won`, d && `${d} drawn`, l && `${l} lost`].filter(Boolean).join(", "),
    beatAria: (n: number) => (n === 1 ? "beat you in 1 game" : `beat you in ${n} games`),
    legend: "Squares are games: W won, L lost, D drawn.",
    legendBeat: "how many of your losses they won.",
    legendPhone: "Squares are games: W won, L lost, D drawn. The trophy counts the losses they won.",
    // Identity names reuse format.ts (guilds, shards and wedges); these cover what it does not name.
    fourColors: "Four colors",
    fourColorsSub: (missing: string) => `no ${missing}`,
    fiveColors: "Five colors",
    colorless: "Colorless",
  },
} as const;
