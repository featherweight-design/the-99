// src/lib/copy/game-seats.ts: the game log's "Across the table" row and its seat picker (Social R3, PR 2).
// Set by /copy-review from the handoff's placeholders (`design/design_handoff_the99_social_r3/social-r3 · copy
// strings.ts`). Two edits, both on the won hint: "Lost." restated the Result chosen two lines above, so the
// hint now opens on the instruction. The friend, pod and matchup strings of that file land with the PRs that
// draw them. NO STRING HERE PRINTS A PERCENTAGE: every count carries its denominator.
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
    held: (filled: number) => `${filled} seats are filled. Clear a seat to make the pod smaller.`,
  },
  picker: {
    /** The sheet's heading, and the panel's name. */
    title: "Seat an opponent",
    placeholder: "Any commander",
    footAnyone: "Any commander in the catalog. Name who played it on the seat.",
    close: "Close",
    searching: "Searching…",
    /** Not drawn in the handoff: the one line a search with no hit needs. */
    noMatch: "No commander by that name.",
    /** Not drawn either: a search that failed is not a search with no hit. */
    failed: "Couldn\u2019t search just now. Try again.",
  },
} as const;
