import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { scoreWriterVersion } from "./writer-version";
import { READY_COUNT } from "./ready-to-build";
import { recordSoftFailure } from "../cache/soft-failure";

/**
 * How many of each Ready-to-build candidate's themes none of the reader's decks play, which Home's
 * rotation leans on (Hugh, 2026-09-27). The same measure as `/discover`'s Something new
 * (`unplayedTags` over `loadPlayedTags`): a theme is a commander's EDHREC tag slug, a deck plays
 * the tags of BOTH its commanders, and drafts count.
 *
 * ONE statement, and it reads nothing `getRankedList` returns, so Home runs it beside that call in
 * the same `Promise.all` rather than after it: no serial round trip (the ranked list is the other
 * half of a page fa is making faster). It therefore picks its own candidates, the same way the
 * ranked list orders them (`rank_score desc, oracle_id`, built commanders out), with a margin past
 * the set in case the two disagree about a tie. A commander it did not cover counts 0.
 *
 * It also condemns every set `getRankedList` would not serve: one row carrying the `rank_score`
 * sentinel or an old `writer_version` (`loadScores`), or one VISIBLE row whose synergy is
 * `degraded` (`assemble`, which exempts built commanders exactly as this does). Any of those means
 * the ranked list is recomputed this render, so this returns NO candidates and the rotation walks
 * its plain shuffle, rather than leaning on an order the ranking no longer holds.
 *
 * Measured on staging, Hugh's account: 4.0ms, returning 40 integers.
 */
export const NOVELTY_CANDIDATES = READY_COUNT + 12;

export function unplayedCountsSql(
  userId: string,
  limit = NOVELTY_CANDIDATES,
  /** The reader's resolved switches: the stale-set test is `loadScores`'s, under the reader's basis. */
  env: NodeJS.ProcessEnv,
): SQL {
  // Raw and aliased throughout: every column is written out against its own alias, so no bare name
  // can resolve against the wrong table (AGENTS.md, the correlated-subquery rule).
  return sql`
    with played as (
      select distinct t.tag ->> 'slug' as slug
      from decks d
      join commander_support ps
        on ps.commander_oracle_id = d.commander_oracle_id
        or ps.commander_oracle_id = d.partner_oracle_id
      cross join lateral jsonb_array_elements(ps.tags) as t(tag)
      where d.user_id = ${userId}
    ),
    candidates as (
      select s.oracle_id
      from commander_scores s
      where s.user_id = ${userId}
        and not exists (
          select 1 from commander_scores stale
          where stale.user_id = ${userId}
            and (stale.rank_score < 0 or stale.writer_version <> ${scoreWriterVersion(env)})
        )
        and not exists (
          select 1 from commander_scores dg
          where dg.user_id = ${userId}
            and dg.synergy_state = 'degraded'
            and not exists (
              select 1 from decks dgd
              where dgd.user_id = ${userId}
                and (dgd.commander_oracle_id = dg.oracle_id or dgd.partner_oracle_id = dg.oracle_id)
            )
        )
        and not exists (
          select 1 from decks bd
          where bd.user_id = ${userId}
            and (bd.commander_oracle_id = s.oracle_id or bd.partner_oracle_id = s.oracle_id)
        )
      order by s.rank_score desc, s.oracle_id
      limit ${limit}
    )
    select c.oracle_id as "oracleId",
      (select count(*) from jsonb_array_elements(cs.tags) as u(tag)
        where not exists (select 1 from played p where p.slug = u.tag ->> 'slug'))::int as "unplayed"
    from candidates c
    join commander_support cs on cs.commander_oracle_id = c.oracle_id
  `;
}

/**
 * The counts as a map, or null when the read fails: the rotation then walks its plain shuffle, so
 * a failed read costs the lean and never the section.
 */
export async function loadUnplayedCounts(
  userId: string,
  env: NodeJS.ProcessEnv,
): Promise<Map<string, number> | null> {
  try {
    const { rows } = await db.execute<{ oracleId: string; unplayed: number }>(unplayedCountsSql(userId, NOVELTY_CANDIDATES, env));
    return new Map(rows.map((r) => [r.oracleId, r.unplayed]));
  } catch (error) {
    recordSoftFailure();
    console.error("home novelty: unplayed counts failed; Home rotates without the lean", error);
    return null;
  }
}
