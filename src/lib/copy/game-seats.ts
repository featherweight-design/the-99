// src/lib/copy/game-seats.ts: the game log's "Across the table" row and its seat picker (Social R3, PR 2).
// Set by /copy-review from the handoff's placeholders (`design/design_handoff_the99_social_r3/social-r3 · copy
// strings.ts`). Two edits, both on the won hint: "Lost." restated the Result chosen two lines above, so the
// hint now opens on the instruction. The friend and pod strings (PR 3) come from the same file; the matchup
// strings land with the PR that draws them. NO STRING HERE PRINTS A PERCENTAGE: every count carries its denominator.
// Opponent labels are player-typed (30 max) and reach no model.

export const gameSeatsCopy = {
  seats: {
    label: "Across the table",
    /** `seats` is the pod size minus one. */
    count: (filled: number, seats: number) => `${filled} of ${seats} seats`,
    you: "You",
    youTag: "YOU",
    add: "Add opponent",
    /** The seat's art press, reopening the picker. */
    change: (name: string) => `Change ${name}`,
    /** The seat's ✕. */
    clear: (name: string) => `Clear ${name}’s seat`,
    addName: "Add a name",
    labelAria: "Who played it",
    labelCounter: (n: number) => `${n} / 30`,
    /** On a loss, with at least one seat filled. */
    wonHint: "If one of them won, press their trophy. Optional.",
    wonHintPhone: "If one of them won, press their Won. Optional.",
    wonAria: (name: string) => `${name} won`,
    wonPill: "Won",
    wonLine: "won this game",
    /** A pod size pressed below the filled seats; `filled` is how many are. The handoff said "All N seats", false while the pod has room left. */
    /** Under a friend seated alone, and the press that opens that friend's decks. */
    whichDeck: "Which deck?",
    /** The chips' label, beside one chip per pod. */
    seatPod: "Seat a pod",
    /** A pod larger than the table: who was left out. `names` reads "Sam, Jo and Lee". */
    podLeftOut: (names: string) => `No room for ${names}. A pod seats up to 8.`,
    /** A pod's seats could not be read. */
    podFailed: "Couldn’t seat that pod. Try again.",
    held: (filled: number) => `${filled} seats are filled. Clear a seat to make the pod smaller.`,
  },
  picker: {
    /** The sheet's heading, and the panel's name. */
    title: "Seat an opponent",
    /** The field while the reader has no friends to list. */
    placeholder: "Any commander",
    placeholderFriends: "Friend or any commander",
    friends: "Friends",
    commanders: "Commanders",
    deckCount: (n: number) => (n === 0 ? "no decks" : n === 1 ? "1 deck" : `${n} decks`),
    /** A friend already at the table, dimmed. */
    seated: "seated",
    footFriends: "Type to search every commander too.",
    back: "Back to friends",
    theirDecks: (name: string) => `${name}’s decks`,
    footDecks: (name: string) => `Name and commander only: nothing else of ${name}’s is read.`,
    noDecks: (name: string) => `${name} has no decks in The 99.`,
    anotherCommander: "Another commander",
    anotherCommanderSub: (name: string) => `search the catalog for what ${name} played`,
    /** Replaces Another commander when the friend has no decks. */
    pickCommander: "Pick a commander",
    justFriend: (name: string) => `Just ${name}`,
    justFriendSub: "no deck or commander",
    footNoDecks: (name: string) => `Either way, ${name}’s name is kept with the game.`,
    /** Not drawn in the handoff: a friends or decks read that failed is not an empty list. */
    friendsFailed: "Couldn’t load your friends. Any commander still works.",
    decksFailed: (name: string) => `Couldn’t load ${name}’s decks.`,
    footAnyone: "Any commander in the catalog. Name who played it on the seat.",
    close: "Close",
    searching: "Searching…",
    /** Not drawn in the handoff: the one line a search with no hit needs. */
    noMatch: "No commander by that name.",
    /** Not drawn either: a search that failed is not a search with no hit. */
    failed: "Couldn\u2019t search just now. Try again.",
  },
} as const;
