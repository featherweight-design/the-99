// Proposed additions. Placeholders: /copy-review settles the wording.

// src/lib/copy/shell.ts, beside `loading.decks`: the precon route's skeleton says nothing visible.
export const preconsLoadingCopy = {
  // One role="status" line for screen readers while the tile skeleton shows.
  status: "Loading precons",
} as const;

// Item 5 changes no strings: the token tile reuses tokensCopy.row (join, joined, owned, have, haveOn,
// from, noMaker, refused, and every aria string) unchanged. Only where they draw moves.
// Items 1, 2 and 3 have no copy.
