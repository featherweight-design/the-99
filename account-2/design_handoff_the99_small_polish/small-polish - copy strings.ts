// Proposed additions. Placeholders: /copy-review settles the wording.

// src/lib/copy/shell.ts, beside `loading.decks`: the precon route's skeleton says nothing visible.
export const preconsLoadingCopy = {
  // One role="status" line for screen readers while the tile skeleton shows.
  status: "Loading precons",
} as const;

// src/lib/copy/tokens.ts, tokensCopy.row (R2): the refusal toast's detail line names the token.
export const tokensRowAddition = {
  refusedDetail: (name: string) => `${name} token`,
} as const;

// Otherwise item 5 reuses tokensCopy.row and tokensCopy.makers unchanged (join, joined, owned, have, haveOn,
// noMaker, refused, makers.label, makers.printing). Only where they draw moves.
// Items 1, 2 and 3 have no copy.
