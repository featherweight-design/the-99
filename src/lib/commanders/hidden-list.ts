import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, commanderSupport, decks, hiddenCommanders } from "../../db/schema";
import { loadHiddenSlugs } from "./hidden-matches";
import { hiddenLane, hiddenRowHref, type HiddenRow } from "./hidden-row";

// The Hidden list's read (`/commanders/hidden`, hide-commander README §3). Off Home's and /decks' cached import
// path, as `hidden-matches.ts` is: only the Hidden route reaches this module, and it caches nothing.

/**
 * The reader's hidden commanders, newest first, each with what its row needs to say where an Unhide puts it and
 * where a press opens it: owned, commander-legal, an index candidate, and the deck built around it if there is one.
 *
 * Every correlated subquery aliases its own table and names the hidden row's column through the table
 * (`"hidden_commanders".oracle_id`) by hand, the rule AGENTS.md sets for a projection: a bare `oracle_id` there
 * would resolve to the subquery's own column and answer true of every row. Exported so a test can read the SQL.
 */
export function hiddenListQuery(userId: string) {
  return db
    .select({
      oracleId: hiddenCommanders.oracleId,
      hiddenAt: hiddenCommanders.hiddenAt,
      name: cards.name,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
      legal: cards.commanderLegal,
      owned: sql<boolean>`exists (
        select 1 from ${collectionItems} ci
        where ci.user_id = ${userId} and ci.oracle_id = ${hiddenCommanders}.oracle_id
      )`,
      candidate: sql<boolean>`exists (
        select 1 from ${commanderSupport} cs where cs.commander_oracle_id = ${hiddenCommanders}.oracle_id
      )`,
      // Either half of a pair helms its deck (`notBuiltBy`). The one last edited, where several are.
      deckId: sql<string | null>`(
        select d.id from ${decks} d
        where d.user_id = ${userId}
          and (d.commander_oracle_id = ${hiddenCommanders}.oracle_id or d.partner_oracle_id = ${hiddenCommanders}.oracle_id)
        order by d.last_edited_at desc
        limit 1
      )`,
    })
    .from(hiddenCommanders)
    .innerJoin(cards, eq(cards.oracleId, hiddenCommanders.oracleId))
    .where(eq(hiddenCommanders.userId, userId))
    // The order `loadHiddenIds` reads, and the index's (`hidden_commanders_user_hidden_at_idx`).
    .orderBy(desc(hiddenCommanders.hiddenAt), hiddenCommanders.oracleId);
}

/**
 * The rows `/commanders/hidden` draws. The page slug of each unbuilt one comes from `loadHiddenSlugs`, which
 * resolves it the way the page does; a built one needs none, since its row opens the deck.
 *
 * The whole collection's ids are read only when an unbuilt hidden commander is unowned: that is the one case the
 * slug lookup reads the discovery population for, and the population's dedup suffixes depend on the whole
 * collection. Otherwise the owned hidden ids stand in, as `findOwnedExcludedMatches` passes them.
 */
export async function loadHiddenList(userId: string, env: NodeJS.ProcessEnv): Promise<HiddenRow[]> {
  const rows = await hiddenListQuery(userId);
  if (rows.length === 0) return [];

  const unbuilt = rows.filter((r) => !r.deckId);
  const collectionIds = unbuilt.some((r) => !r.owned)
    ? (
        await db
          .selectDistinct({ oracleId: collectionItems.oracleId })
          .from(collectionItems)
          .where(eq(collectionItems.userId, userId))
      ).map((r) => r.oracleId)
    : unbuilt.map((r) => r.oracleId);
  const slugs = unbuilt.length > 0
    ? await loadHiddenSlugs(userId, unbuilt.map((r) => r.oracleId), collectionIds, env)
    : new Map<string, string>();

  return rows.map((r) => ({
    oracleId: r.oracleId,
    name: r.name,
    colorIdentity: r.colorIdentity,
    imageUri: r.imageUri,
    hiddenAt: r.hiddenAt.toISOString(),
    lane: hiddenLane({ built: !!r.deckId, owned: r.owned, legal: r.legal, candidate: r.candidate }),
    href: hiddenRowHref({ deckId: r.deckId, slug: slugs.get(r.oracleId) ?? null }),
  }));
}
