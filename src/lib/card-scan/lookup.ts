import { sql } from "drizzle-orm";
import { db } from "../../db";
import { MAX_GUESSES, poolGuesses, vectorLiteral, type MatchAnswer, type NearRow } from "./match";

/** HNSW's candidate list per read; above the default 40, because a guess is a top-1 under a filter. */
const EF_SEARCH = 100;

export type IndexMeta = { version: string; model: string };

export type Lookup =
  | { kind: "ok"; index: string; answer: MatchAnswer }
  | { kind: "model"; index: IndexMeta }
  | { kind: "no-index" };

/**
 * The guesses for one fingerprint, in ONE transaction so the meta row and every row read are one index
 * generation: repeatable read, because read committed would let an ingest committing between two of them mix versions. Each guess is the nearest row whose card is not already a
 * guess: up to `MAX_GUESSES` `LIMIT 1` reads, each excluding the cards found so far. A plain nearest-k would hand back
 * one card when that card has k printings near the query (a basic land has hundreds), leaving one guess and no
 * margin. `iterative_scan` keeps HNSW scanning past the excluded rows instead of coming back empty. The nearest row is
found inside a subquery over `scan_index` alone, so the planner keeps the HNSW index; the card's name is joined after.
 */
export async function lookupGuesses(embedding: Float32Array, model: string): Promise<Lookup> {
  const vec = vectorLiteral(embedding);
  return db.transaction(
    async (tx) => {
      // `lock_timeout` first: an ingest holds `scan_index` exclusively for minutes while it republishes, and a lookup
      // waiting on it would hang to the platform's limit instead of answering 503 `no-index` through the route's catch.
      await tx.execute(sql`select set_config('lock_timeout', '2s', true), set_config('hnsw.ef_search', ${String(EF_SEARCH)}, true), set_config('hnsw.iterative_scan', 'strict_order', true)`);
      const meta = (await tx.execute(sql`select version, model, rows from scan_index_meta where id = 1`)).rows[0] as
        | { version: string; model: string; rows: number }
        | undefined;
      if (!meta || meta.rows === 0) return { kind: "no-index" } as const;
      if (meta.model !== model) return { kind: "model", index: { version: meta.version, model: meta.model } } as const;
      const rows: NearRow[] = [];
      for (let k = 0; k < MAX_GUESSES; k++) {
        const found = rows.map((r) => r.oracleId);
        const exclude = found.length ? sql`where s.oracle_id <> all(${`{${found.join(",")}}`}::uuid[])` : sql``;
        const hit = (
          await tx.execute(sql`
            select n.oracle_id::text as "oracleId", n.scryfall_id::text as "scryfallId",
                   coalesce(c.name, '') as name, n.distance::float8 as distance
            from (
              select s.oracle_id, s.scryfall_id, s.embedding <=> ${vec}::halfvec(256) as distance
              from scan_index s
              ${exclude}
              order by s.embedding <=> ${vec}::halfvec(256)
              limit 1
            ) n left join cards c on c.oracle_id = n.oracle_id`)
        ).rows[0] as NearRow | undefined;
        if (!hit) break;
        rows.push(hit);
      }
      return { kind: "ok", index: meta.version, answer: poolGuesses(rows) } as const;
    },
    // Never `accessMode: "read only"`: on the pooled Neon connection it poisons the next transaction taken from the
    // pool (`draft-state-snapshot.test.ts`). The reads write nothing.
    { isolationLevel: "repeatable read" },
  );
}
