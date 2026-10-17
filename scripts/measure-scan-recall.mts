// measure:scan-recall — how often the scan index's HNSW search disagrees with an exact scan, on a database's own
// build. READ-ONLY: one repeatable-read, read-only transaction; every setting it makes is transaction-local
// (`hnsw.ef_search` and `hnsw.iterative_scan`, as `lookupGuesses` sets them, and the index turned off for the exact
// scan). It writes nothing and builds nothing.
//
//   MEASURE_URL=<direct url> MEASURE_BRANCH=br-... pnpm measure:scan-recall
//
// The branch is NAMED and checked against `neon.branch_id` first, the `pull:staging` rule. The queries are the
// probe's hard cases: blends of two stored rows (a fingerprint between two cards, where the margin is small) and
// rows nudged toward a third, chosen deterministically. Each is asked as the route asks (`lookupGuesses`): up to
// three reads, each the nearest row of a card not found yet, sorted best first; the margin is first minus second. For each `ef_search` it prints how
// many first cards differ from the exact scan, how many answers land on the other side of the sure gate, the worst
// score and margin gaps, and the median time per guess.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig, type PoolClient } from "@neondatabase/serverless";
import ws from "ws";
import { SURE_MARGIN } from "../src/lib/scan/lookup";
import { MAX_GUESSES } from "../src/lib/card-scan/match";

neonConfig.webSocketConstructor = ws;

const { MEASURE_URL, MEASURE_BRANCH } = requireEnv(["MEASURE_URL", "MEASURE_BRANCH"]);
const QUERIES = Number(process.env.MEASURE_QUERIES ?? 200);
const EFS = (process.env.MEASURE_EFS ?? "40,100,400,1000").split(",").map(Number);

type Answer = { first: string; s1: number; margin: number | null; ms: number };

const parse = (t: string) => Float32Array.from(t.slice(1, -1).split(",").map(Number));
const literal = (v: Float32Array) => `[${Array.from(v, (x) => x.toFixed(6)).join(",")}]`;
function mix(parts: [Float32Array, number][]): Float32Array {
  const out = new Float32Array(parts[0][0].length);
  for (const [v, w] of parts) for (let i = 0; i < out.length; i++) out[i] += v[i] * w;
  const n = Math.hypot(...out);
  return out.map((x) => x / n);
}

async function nearest(c: PoolClient, q: string, not: string[]) {
  const r = await c.query<{ oracle_id: string; d: number }>(
    `select s.oracle_id::text, (s.embedding <=> $1::halfvec(256))::float8 as d from scan_index s
     ${not.length ? "where s.oracle_id <> all($2::uuid[])" : ""} order by s.embedding <=> $1::halfvec(256) limit 1`,
    not.length ? [q, `{${not.join(",")}}`] : [q],
  );
  return r.rows[0];
}

/** As `lookupGuesses` asks: up to `MAX_GUESSES` reads, each excluding the cards found so far, then best first. */
async function ask(c: PoolClient, q: string): Promise<Answer> {
  const t0 = performance.now();
  const found: { oracle_id: string; d: number }[] = [];
  for (let k = 0; k < MAX_GUESSES; k++) {
    const hit = await nearest(c, q, found.map((f) => f.oracle_id));
    if (!hit) break;
    found.push(hit);
  }
  const ms = (performance.now() - t0) / Math.max(1, found.length);
  found.sort((x, y) => x.d - y.d);
  const [a, b] = found;
  return { first: a.oracle_id, s1: 1 - a.d, margin: b ? b.d - a.d : null, ms };
}

void (async () => {
  const pool = new Pool({ connectionString: MEASURE_URL, max: 1 });
  const c = await pool.connect();
  try {
    await c.query("begin transaction isolation level repeatable read read only");
    const branch = (await c.query<{ b: string | null }>("select current_setting('neon.branch_id', true) as b")).rows[0].b;
    if (branch !== MEASURE_BRANCH) {
      console.error(`refusing: the database reports branch ${branch ?? "(unknown)"}, not ${MEASURE_BRANCH}. Nothing was read.`);
      process.exitCode = 2;
      return;
    }
    const meta = (await c.query("select version, rows from scan_index_meta where id = 1")).rows[0];
    console.log(`index ${meta?.version ?? "(none)"}, ${meta?.rows ?? 0} rows; ${QUERIES} queries; sure gate ${SURE_MARGIN}`);
    if (!meta || meta.rows === 0) return;
    const picked = (
      await c.query<{ e: string }>(
        `select embedding::text as e from scan_index order by md5(scryfall_id::text || face) limit $1`,
        [QUERIES * 3],
      )
    ).rows.map((r) => parse(r.e));
    const queries: string[] = [];
    for (let i = 0; i < QUERIES; i++) {
      const [a, b, x] = [picked[3 * i], picked[3 * i + 1], picked[3 * i + 2]];
      // Two in three are blends of two cards, weighted a little apart; one in three is a row nudged toward a third.
      queries.push(literal(i % 3 === 2 ? mix([[a, 0.8], [x, 0.2]]) : mix([[a, 0.5 + (i % 5) * 0.03], [b, 0.5 - (i % 5) * 0.03]])));
    }
    await c.query("select set_config('enable_indexscan', 'off', true), set_config('enable_bitmapscan', 'off', true)");
    const exact: Answer[] = [];
    for (const q of queries) exact.push(await ask(c, q));
    await c.query("select set_config('enable_indexscan', 'on', true), set_config('enable_bitmapscan', 'on', true), set_config('hnsw.iterative_scan', 'strict_order', true)");
    const exactMs = exact.map((a) => a.ms).sort((x, y) => x - y)[exact.length >> 1];
    console.log(`exact scan: median ${exactMs.toFixed(1)}ms per guess`);
    console.log(`\n| ef_search | first card differs | other side of the gate | worst score gap | worst margin gap | median ms per guess |\n|---|---|---|---|---|---|`);
    for (const ef of EFS) {
      await c.query("select set_config('hnsw.ef_search', $1, true)", [String(ef)]);
      let differs = 0, flips = 0, worstScore = 0, worstMargin = 0;
      const ms: number[] = [];
      for (let i = 0; i < queries.length; i++) {
        const got = await ask(c, queries[i]);
        const want = exact[i];
        ms.push(got.ms);
        if (got.first !== want.first) differs++;
        worstScore = Math.max(worstScore, Math.abs(got.s1 - want.s1));
        const gm = got.margin ?? 1, wm = want.margin ?? 1;
        worstMargin = Math.max(worstMargin, Math.abs(gm - wm));
        if ((gm >= SURE_MARGIN) !== (wm >= SURE_MARGIN)) flips++;
      }
      ms.sort((x, y) => x - y);
      console.log(`| ${ef} | ${differs} of ${queries.length} | ${flips} | ${worstScore.toFixed(5)} | ${worstMargin.toFixed(5)} | ${ms[ms.length >> 1].toFixed(1)} |`);
    }
  } finally {
    await c.query("rollback").catch(() => {});
    c.release();
    await pool.end();
  }
})();
