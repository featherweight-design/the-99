// Lives apart from read.ts deliberately. read.ts imports the Drizzle client,
// which throws at module init without DATABASE_URL — so a "use client"
// component that value-imports from it pulls the db into the browser bundle
// and the page dies on hydration. Pure helpers a client component needs must
// not sit in a module that touches the database.

/**
 * The whole deck-status vocabulary. Every value is a distinct state with one
 * meaning and one next action, and the six are exhaustive over the three facts
 * a deck has — how many cards it has matched to the catalog, how many of those
 * the player owns, and how many imported lines we could not put a card to.
 *
 * `built` throughout is the matched count alone. Unresolved lines are not in it
 * and never push a deck to 99 or over: a list of 97 matched cards and 2 lines
 * we could not name is `Building`, not `Unresolved`. The two summed are `total`
 * (see `DeckDetail` in read.ts), which is the deck the player asked for rather
 * than the deck we can compute a status from.
 *
 * | Value        | When                                     | Means                          | Next action     |
 * | ------------ | ---------------------------------------- | ------------------------------ | --------------- |
 * | `Draft`      | 0 matched cards                          | Not started, unresolved or not | Add cards       |
 * | `Building`   | 1–98 matched                             | Short of a legal list          | Add the rest    |
 * | `Over`       | 100+ matched                             | Past a legal list              | Cut the excess  |
 * | `Unresolved` | 99 matched, some line unresolved         | Carrying lines we cannot name  | Resolve or drop |
 * | `To buy`     | 99 matched, no unresolved, some unowned  | A legal list you do not own    | Buy the missing |
 * | `Complete`   | 99 matched, no unresolved, all owned     | Sleeve it and play it          | Play it         |
 *
 * `Playable` was retired by #357. It covered the last three rows at once and
 * rendered in the same green as `Complete`, so a 99-card list needing fifteen
 * cards bought announced itself as ready to put on a table. Exactly one value
 * now means playable, and it is `Complete`.
 */
export type StatusPill = "Draft" | "Building" | "Over" | "Unresolved" | "To buy" | "Complete";

/**
 * Order is load-bearing, and each test earns its place above the next.
 *
 * The count is tested first, and `Over` before everything below it: an illegal
 * card count is the thing standing between the deck and a legal list, so
 * neither owning every card nor having named every line changes the answer. A
 * 104-card deck whose every card is owned is `Over`.
 *
 * Below 99, unresolved lines and ownership are both silent. A deck still being
 * built is `Building` whatever else is true of it, because the count is the
 * honest headline and the other two are not yet the thing to act on.
 *
 * At exactly 99, `Unresolved` outranks `To buy`: an unnamed line is a card we
 * cannot even price, so it has to be settled before the remainder is a
 * shopping list. The import handoff's reconciliation model requires this
 * ordering as well as recommending it — unresolved rows "never read as errors
 * or as 'to buy'" (see the header of `lib/copy/deck-import.ts`), and a deck
 * whose unresolved lines were outranked by ownership would read as exactly
 * that.
 */
export function statusPill(args: {
  built: number;
  ownedCount: number;
  unresolvedCount?: number;
}): StatusPill {
  if (args.built === 0) return "Draft";
  if (args.built < 99) return "Building";
  if (args.built > 99) return "Over";
  if ((args.unresolvedCount ?? 0) > 0) return "Unresolved";
  return args.ownedCount === args.built ? "Complete" : "To buy";
}
