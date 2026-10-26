// Whether a deck's commander has moved since its newest version: the one rule every "is this deck
// pending" question gains when a commander change becomes a draft change (plan decision 2).
//
// The live `decks.commander_oracle_id` / `partner_oracle_id` columns ARE the draft's commander, and
// a commit copies them into the version (`versions.ts`, `commitVersionIn`). So a deck is pending
// on its commander exactly when the live pair differs from the version's pair.
//
// Written once per language. The TypeScript form (here) serves the readers that already hold both
// rows; the SQL form (`pending-sql.ts`, apart so client components take no drizzle-orm) serves
// the two queries that decide pending in the database (the availability CTE and
// the deck list's pending edge), so the rule is not restated by hand at either site.

/** A deck's leader: its commander, and its partner when it has one. */
export type CommanderPair = { commanderOracleId: string; partnerOracleId: string | null };

/** The pair as a sorted set. Which of the two sits in which column is not a change: a pair's
 *  order carries no meaning, and a swap that only exchanges the columns leads the same deck. */
function members(pair: CommanderPair): string[] {
  return [pair.commanderOracleId, pair.partnerOracleId].filter((id): id is string => id !== null).sort();
}

/** True when the live pair leads the deck differently from the version's pair. */
export function commanderMoved(version: CommanderPair, live: CommanderPair): boolean {
  const a = members(version);
  const b = members(live);
  return a.length !== b.length || a.some((id, i) => id !== b[i]);
}


/**
 * How a change moves cards between the 99 and the command zone, read off the current leader, the
 * new one, and the body. `none`: nothing comes out of the body. `trade`: a single out of the 99
 * trades places with the old single. `halfTrade` (the addendum): one half of a new pair comes out
 * of the 98 while both old halves leave, so one old half takes its slot (the reader's choice) and
 * the other leaves the deck.
 *
 * A single becoming a pair (Hugh, 2026-10-26: a precon such as Turtle Power starts with one
 * commander, and its partners sit in the 99) keeps the deck at 100 only when a half comes out of
 * the 99, since a pair leads 98. `pairTrade`: both new halves come out of the 99 and the old single
 * takes one of their slots. `pairUp`: one new half comes out of the 99, and the old single either
 * leaves the deck or is the other half.
 *
 * Null for a change no design draws, held back: a half out of the 98 beside a half the pair keeps,
 * both new halves out of the 98, a single becoming a pair with nothing out of the 99 (the deck
 * would hold 101), and a pair becoming a single.
 */
export type TradeShape = "none" | "trade" | "halfTrade" | "pairTrade" | "pairUp";

export function tradeShape(
  toIds: readonly string[], fromIds: readonly string[], body: ReadonlySet<string>,
): TradeShape | null {
  const fromBody = toIds.filter((id) => !fromIds.includes(id) && body.has(id)).length;
  const departing = fromIds.filter((id) => !toIds.includes(id)).length;
  if (fromIds.length !== toIds.length) {
    if (fromIds.length === 2) return null;
    if (fromBody === 2) return "pairTrade";
    return fromBody === 1 ? "pairUp" : null;
  }
  if (fromBody === 0) return "none";
  if (toIds.length === 1) return "trade";
  return fromBody === 1 && departing === 2 ? "halfTrade" : null;
}

/** Whether a change can be offered at all: the loader and the write apply this one rule. */
export function offerable(
  toIds: readonly string[], fromIds: readonly string[], body: ReadonlySet<string>,
): boolean {
  return tradeShape(toIds, fromIds, body) !== null;
}
