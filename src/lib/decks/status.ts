// Lives apart from read.ts deliberately. read.ts imports the Drizzle client,
// which throws at module init without DATABASE_URL — so a "use client"
// component that value-imports from it pulls the db into the browser bundle
// and the page dies on hydration. Pure helpers a client component needs must
// not sit in a module that touches the database.

/**
 * The whole deck-status vocabulary. Every value is a distinct state with one
 * meaning and one next action, and the seven are exhaustive over FOUR facts:
 * whether the deck has ever committed a version, how many cards it has matched
 * to the catalog, how many of those the player owns, and how many imported
 * lines we could not put a card to. The version is the fact R6 added, and it is
 * tested before the other three.
 *
 * `built` throughout is the matched count alone. Unresolved lines are not in it
 * and never push a deck to its body size or over: a list of 97 matched cards and
 * 2 lines we could not name is `Building`, not `Unresolved`. The two summed are
 * `total` (see `DeckDetail` in read.ts), which is the deck the player asked for
 * rather than the deck we can compute a status from.
 *
 * The body size below is 99 for a single commander and 98 for a pair — the deck
 * is 100 cards either way, and `deck-size.ts` is where that is decided.
 *
 * | Value        | When                                             | Means                           | Next action     |
 * | ------------ | ------------------------------------------------ | ------------------------------- | --------------- |
 * | `New`        | no version, 0 matched cards                      | A commander and nothing else    | Add cards       |
 * | `Draft`      | no version, any number of cards                  | Provisional, whatever its length| Commit it       |
 * | `Over`       | committed, past the body size                    | Past a legal list               | Cut the excess  |
 * | `Building`   | committed, short of the body size                | Cut and not yet refilled        | Add the rest    |
 * | `Unresolved` | committed, at the size, some line unresolved     | Carrying lines we cannot name   | Resolve or drop |
 * | `To buy`     | committed, at the size, no unresolved, some owed | A legal list you cannot sleeve  | Buy the missing |
 * | `Complete`   | committed, at the size, no unresolved, none owed | Sleeve it and play it           | Play it         |
 *
 * THE PHASE TESTS FIRST, and that is the whole shape of this function. A deck
 * with no committed version is provisional however long its list is — "a draft
 * is a draft at any length", which is how every other tool means the word and
 * none of them requires a document to be empty first.
 *
 * What that costs, stated: an uncommitted deck loses its COUNT word here. A
 * 104-card idea reads `Draft` rather than `Over`. The figure survives in the
 * tile's detail row and the unresolved badge draws either way, and the ruling
 * behind it is that while a draft is open the count facts are transient — they
 * describe the editing rather than the deck. R6 overruled the brief's own
 * ruling 1 to reach this, deliberately, because a phase placed below the count
 * tests can only ever fire on the deck that needed no help: R5 put it under
 * `To buy` and it could not reach a deck with a card left to buy.
 *
 * `Building` means one thing now — a COMMITTED deck currently short of its body
 * size, so you cut cards and have not refilled. It used to be the catch-all
 * every half-finished idea fell into.
 *
 * "To buy" is not the same question as "do you own a copy". A card the player
 * owns can still be a card this deck has to buy, because an older finished deck
 * is already holding the copies — one Sol Ring across four sleeved decks is
 * three purchases. `unfundedCount` is that count and is what the last two rows
 * turn on; ownership alone would call such a deck `Complete` while its own
 * shopping list named twelve cards.
 *
 * `Playable` was retired by #357. It covered the last three rows at once and
 * rendered in the same green as `Complete`, so a 99-card list needing fifteen
 * cards bought announced itself as ready to put on a table. Exactly one value
 * now means playable, and it is `Complete`.
 */
export type StatusPill =
  | "New"
  | "Draft"
  | "Over"
  | "Building"
  | "Unresolved"
  | "To buy"
  | "Complete";

/**
 * Order is load-bearing, and each test earns its place above the next.
 *
 * THE PHASE TESTS FIRST. A deck with no committed version is `Draft` whatever
 * its counts say, and `New` is the empty case of that — a commander and nothing
 * else. Everything below them describes a COMMITTED deck, which is what makes
 * each of those five words a fact about a real deck rather than about an idea.
 *
 * `New` requires BOTH an empty list and no version, and the second half is not
 * decoration: a committed deck cut back to zero cards has a v1, a version rail
 * and its games, and announcing it as new would be the loudest wrong thing this
 * function could say. That deck falls through to `Building` — committed, and
 * short — which is exactly what it is. R6's prose table states this rule; its
 * cascade snippet tests `built === 0` alone, and the table is the one to build.
 *
 * Below the phase, `Over` comes before everything: an illegal card count is the
 * thing standing between the deck and a legal list, so neither owning every
 * card nor having named every line changes the answer.
 *
 * At exactly the body size, `Unresolved` outranks `To buy`: an unnamed line is a
 * card we cannot even price, so it has to be settled before the remainder is a
 * shopping list. The import handoff's reconciliation model requires this
 * ordering as well as recommending it — unresolved rows "never read as errors
 * or as 'to buy'" (see the header of `lib/copy/deck-import.ts`), and a deck
 * whose unresolved lines were outranked by ownership would read as exactly
 * that.
 */
export function statusPill(args: {
  built: number;
  ownedCount: number;
  /**
   * Slots filled: owned, or printed. Defaults to `ownedCount`, so a caller that
   * cannot compute proxies keeps the pre-proxy answer rather than having to
   * restate it.
   *
   * The `Complete` branch reads THIS and not `ownedCount`: a deck whose only
   * gaps are printed cards is finished, and the pill has always been a claim
   * about the list rather than about a box.
   */
  coveredCount?: number;
  unresolvedCount?: number;
  unfundedCount?: number;
  /** 99, or 98 for a deck with a partner — see `deck-size.ts`. */
  bodySize: number;
  /**
   * Whether this deck has ever committed a version.
   *
   * REQUIRED, and deliberately not optional — R6 prices it as an optional
   * argument and that is the one shape this must not take. A caller that
   * omitted it would silently get the pre-R6 cascade back, and the deck it
   * would misreport is precisely the one this vocabulary exists for: a
   * never-committed 99 announcing itself `Complete`. Two call sites answer it,
   * and the compiler makes them.
   */
  hasVersion: boolean;
}): StatusPill {
  if (!args.hasVersion) return args.built === 0 ? "New" : "Draft";
  return countStatus(args);
}

/**
 * The five count tests, on their own.
 *
 * Exported because a `Draft` deck still needs its count FIGURE. R6 takes the
 * count word out of an uncommitted deck's pill and says plainly what that
 * costs — "the figure survives in the detail row" — and the only way that stays
 * true is if the row can ask the same question the pill stopped asking. A
 * second copy of this cascade written where the figure is drawn would drift
 * from this one the first time a threshold moved.
 *
 * It takes no `hasVersion` and answers as though the deck were committed: it is
 * the arithmetic, and the phase is the caller's business.
 */
export function countStatus(args: {
  built: number;
  ownedCount: number;
  coveredCount?: number;
  unresolvedCount?: number;
  unfundedCount?: number;
  bodySize: number;
}): Exclude<StatusPill, "New" | "Draft"> {
  if (args.built > args.bodySize) return "Over";
  if (args.built < args.bodySize) return "Building";
  if ((args.unresolvedCount ?? 0) > 0) return "Unresolved";
  // Unowned cards are USUALLY unfunded, so the two tests would normally collapse
  // into one. They are kept separate because a caller that cannot compute the
  // seniority allocation still gets the ownership answer rather than a wrong
  // `Complete`.
  //
  // A PROXY is the exception that makes "usually" the right word: a printed card
  // is unowned and funded — it is in `coveredCount` and in no buy row — so this
  // branch can now reach `Complete` with cards the collection has never held.
  // That is the feature, not a hole in the test.
  const unfunded = args.unfundedCount ?? 0;
  const covered = args.coveredCount ?? args.ownedCount;
  return covered === args.built && unfunded === 0 ? "Complete" : "To buy";
}
