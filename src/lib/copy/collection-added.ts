// Collection's Date added sort: the option, its two directions, and the figure that leads a row's type line
// (or a tile's sub-line) while it is the sort. Beside `collection-price.ts`, whose slot it reuses.
//
// A date is EXACT when something real brought the holding (a hand add, an edit, a file arriving into a
// collection that already had content) and "since" when the data only says it was there by then: the file that
// filled an empty collection dates every holding to its day.

export const collectionAddedCopy = {
  sortLabel: "Date added",
  /** Ascending is oldest first, as every key names its own pair. */
  direction: { asc: "Oldest", desc: "Newest" },
  /** The figure on a row: `Oct 12` for an exact arrival, `since Sep 2` for a holding only known to be there by then. */
  exact: (day: string) => day,
  since: (day: string) => `since ${day}`,
  /** The clause the row or tile name gains, last, while sorted by date added. */
  spokenExact: (day: string) => `added ${day}`,
  spokenSince: (day: string) => `in your collection since ${day}`,
} as const;
