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
 * the other leaves the deck. Null for a change no design draws, held back: a half out of the 98
 * beside a half the pair keeps, and both new halves out of the 98.
 */
export type TradeShape = "none" | "trade" | "halfTrade";

export function tradeShape(
  toIds: readonly string[], fromIds: readonly string[], body: ReadonlySet<string>,
): TradeShape | null {
  const fromBody = toIds.filter((id) => !fromIds.includes(id) && body.has(id)).length;
  if (fromBody === 0) return "none";
  if (toIds.length === 1) return "trade";
  const departing = fromIds.filter((id) => !toIds.includes(id)).length;
  return fromBody === 1 && departing === 2 ? "halfTrade" : null;
}

/** Whether a change can be offered at all: the loader and the write apply this one rule. */
export function offerable(
  toIds: readonly string[], fromIds: readonly string[], body: ReadonlySet<string>,
): boolean {
  return tradeShape(toIds, fromIds, body) !== null;
}
