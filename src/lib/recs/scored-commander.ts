import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { commanderScores } from "../../db/schema";
import { hiddenBy } from "../commanders/hidden";
import { isSchemaLagError, rankableScoreRows } from "./store";

// The commander page's one-row rank read, kept out of store.ts on purpose: it reads
// hidden_commanders, which is not a user_data_touch table, and store.ts sits on Home's and
// /decks' cached import path (scripts/lib/list-cache-tables.test.mts). Only the commander
// detail route reaches this module, and it caches nothing.

/** What `findScoredCommander` resolves a slug to. `rank` is null exactly when `hidden` is true. */
export type ScoredCommander = {
  oracleId: string;
  /** The place the reader's list draws it at, counted over the rows that list draws. Null while the
   *  player has it hidden: no list draws it, so there is no place to name. */
  rank: number | null;
  hidden: boolean;
  anyDegraded: boolean;
};

/**
 * The one-row read behind `findScoredCommander`, split out so its emitted SQL can be pinned.
 *
 * A HIDDEN ROW STILL RESOLVES. Its page opens (the Hidden list and the lists' search both link to
 * it), so the filter cannot sit in `rankableScoreRows`, which would 404 it. It sits in the window
 * instead: the hidden flag partitions the rows, so a non-hidden commander's rank counts only the
 * non-hidden rows ahead of it (the list it was clicked from leaves the hidden ones out), and a hidden
 * one gets no rank at all.
 *
 * The flag is computed ONCE per row, in `flagged`, and the window in `ranked` reads that column for both
 * its CASE and its partition, rather than running the `exists` three times over.
 *
 * The flag's subquery is aliased and its outer column written `"commander_scores".oracle_id` by hand:
 * this is a single-table select, whose projection Drizzle leaves unqualified, and a bare
 * `"oracle_id"` there would resolve to the hidden row's own column and mark every row hidden.
 */
export function scoredCommanderQuery(userId: string, slug: string, env: NodeJS.ProcessEnv) {
  const flagged = db.$with("flagged").as(
    db
      .select({
        oracleId: commanderScores.oracleId,
        slug: commanderScores.slug,
        rankScore: commanderScores.rankScore,
        synergyState: commanderScores.synergyState,
        hidden: sql<boolean>`${hiddenBy(userId, sql`${commanderScores}.oracle_id`)}`.as("hidden"),
      })
      .from(commanderScores)
      // The window runs over the UNBUILT rows, the same population the list
      // shows. The store holds every scored commander, built ones included —
      // it is what `persistScores` writes from, and dropping them there is what
      // used to evict a commander permanently when a deck was built around it
      // — but a rank counted over rows the list does not draw is a rank that
      // disagrees with the list: the commander at the top of the page would
      // read `Rank #2` because a built commander outscored it.
      //
      // A built commander therefore resolves nowhere here, which is where it
      // resolved before this store held it at all: `resolveCommanderSlug` falls
      // through to the owned list (which excludes it) and then to discovery
      // (which excludes what the player owns). Its detail page 404s, exactly as
      // it did before — a separate question from this one, and not one to
      // settle by handing out a rank no list agrees with.
      .where(rankableScoreRows(userId, env)),
  );
  const ranked = db.$with("ranked").as(
    db
      .select({
        oracleId: sql<string>`flagged.oracle_id`.as("oracle_id"),
        slug: sql<string>`flagged.slug`.as("slug"),
        hidden: sql<boolean>`flagged.hidden`.as("hidden"),
        rank: sql<number | null>`(case when flagged.hidden then null else row_number() over (partition by flagged.hidden order by flagged.rank_score desc, flagged.oracle_id) end)::int`.as("rank"),
        // Same window pass, so the caller learns whether these ranks came from an
        // outage-era compute without paying a second round trip. Over the rows the list draws only:
        // a degraded row the player has hidden ranks nothing, so it must not ask for a re-rank.
        anyDegraded: sql<boolean>`bool_or(flagged.synergy_state = 'degraded' and not flagged.hidden) over ()`.as("any_degraded"),
      })
      .from(flagged),
  );
  return db
    .with(flagged, ranked)
    .select({ oracleId: ranked.oracleId, rank: ranked.rank, hidden: ranked.hidden, anyDegraded: ranked.anyDegraded })
    .from(ranked)
    .where(eq(ranked.slug, slug))
    .limit(1);
}

/**
 * Resolves a persisted slug to its commander and rank in one query, returning a
 * single row rather than pulling the user's whole scored list into memory.
 * Rank comes from the stored ordering, so it matches the list the user clicked
 * from — including the oracleId tie-break that recommendCommanders applies.
 */
export async function findScoredCommander(
  userId: string,
  slug: string,
  /** The reader's resolved switches, as `loadScores` takes them: the rank window is the list's. */
  env: NodeJS.ProcessEnv,
): Promise<ScoredCommander | null> {
  try {
    const [row] = await scoredCommanderQuery(userId, slug, env);
    return row ?? null;
  } catch (err) {
    if (!isSchemaLagError(err)) throw err;
    // not a fallback: only the commander detail route asks for one rank, and it caches nothing.
    return null;
  }
}
