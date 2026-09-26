import { sql, type SQL } from "drizzle-orm";
import { cards } from "../../db/schema";
import { NON_GAME_LAYOUTS, NON_GAME_TYPE_LINES } from "./game-card";

/**
 * `isGameCard` as a SQL predicate over `cards`, for a query that filters in the database — card
 * search, whose LIMIT would otherwise be spent on rows a filter in code then throws away. Built
 * from the same two sets, so the two forms cannot disagree about what is a card.
 */
export function isGameCardWhere(): SQL {
  const list = (values: ReadonlySet<string>) => sql.join([...values].map((v) => sql`${v}`), sql`, `);
  return sql`(${cards.layout} not in (${list(NON_GAME_LAYOUTS)}) and btrim(${cards.typeLine}) not in (${list(NON_GAME_TYPE_LINES)}))`;
}
