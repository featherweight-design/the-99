// Proves card scanning's server match (plan `2026-10-16-card-scan.md` PR 1) against a real index on a scratch branch:
//
//   a. the file checks refuse a wrong model, a row off unit length and a short file, before any write;
//   b. the CLI refuses a target that is not the branch it names, and writes nothing;
//   c. `publishScanIndex` replaces the index and its meta row, all rows counted;
//   d. `lookupGuesses` over pgvector's HNSW agrees with an exact fp32 scan of the same rows, pooled as the lab pools
//      them: the same first card, every shared guess's score within 2e-3 (halfvec), the margin within 4e-3 wherever it
//      is under 0.1 (near the scanner's 0.02 gate; a far runner-up is where HNSW's recall is weakest and the margin is
//      already huge), and the same side of the gate every time, on rows nudged off themselves and on blends of two
//      cards' rows, which put the margin near the gate;
//   e. the most-printed card in the index still gets three distinct guesses;
//   f. a request naming another model is refused, and nothing is read.
//
// It REPLACES `scan_index` on its database, so it refuses production, staging and local-dev by `neon.branch_id`
// (`assertScratchBranch`). Point the worktree's `.env` DATABASE_URL at a scratch branch made from local-dev, migrated
// to 0137, and SCAN_ROWS_DIR at `export_index.py all --server`'s output:
//
//   SCAN_ROWS_DIR=… pnpm probe:card-scan-match
import { requireEnv } from "./lib/env.mjs";
import { spawnSync } from "node:child_process";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { publishScanIndex, readScanRows, scanRowsRefusal } from "./lib/scan-index";
import { lookupGuesses } from "../src/lib/card-scan/lookup";
import { EMBED_DIM, SCAN_MODEL, poolGuesses } from "../src/lib/card-scan/match";

neonConfig.webSocketConstructor = ws;
const { DATABASE_URL, SCAN_ROWS_DIR } = requireEnv(["DATABASE_URL", "SCAN_ROWS_DIR"]);
const QUERIES = 40;
let failures = 0;

function check(label: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok || !detail ? "" : `: ${detail}`}`);
  if (!ok) failures += 1;
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
const client = await pool.connect();
try {
  const [{ branch }] = (await client.query("select current_setting('neon.branch_id', true) as branch")).rows as { branch: string }[];
  assertScratchBranch(branch, "probe:card-scan-match replaces scan_index");
  const data = readScanRows(SCAN_ROWS_DIR);
  const rows = data.rows;

  // a. the file checks
  check("a. the real files pass", scanRowsRefusal(data) === null, scanRowsRefusal(data) ?? "");
  check("a. a wrong model is refused", scanRowsRefusal({ ...data, model: "other" })?.startsWith("model") === true);
  const skewed = data.vectors.slice();
  skewed[7 * EMBED_DIM] += 0.5;
  check("a. a row off unit length is refused", scanRowsRefusal({ ...data, vectors: skewed }) === "row 7 is not unit length");
  check("a. a short file is refused", scanRowsRefusal({ ...data, keys: data.keys.slice(0, 10), vectors: data.vectors.slice(0, 10 * EMBED_DIM), rows: 10 })?.includes("under the floor") === true);

  // b. the CLI refuses a target it was not told about
  const before = (await client.query("select to_regclass('scan_index_meta') is not null as ok")).rows[0] as { ok: boolean };
  check("b. migration 0137 is applied here", before.ok);
  // `--dry-run`: the CLI loads `.env` over the environment (`env.mjs`), so a target pair kept there would replace the
  // misnamed one passed here; dry-run still refuses on the branch, and can never publish.
  const wrong = spawnSync("pnpm", ["-s", "db:seed:scan-index", SCAN_ROWS_DIR, "--dry-run"], {
    env: { ...process.env, SCAN_INDEX_TARGET_URL: DATABASE_URL, SCAN_INDEX_TARGET_BRANCH: "br-not-this-one" },
    encoding: "utf8",
  });
  check("b. a misnamed branch exits 2", wrong.status === 2, `${wrong.status} ${wrong.stderr}`);
  check("b. and says why", /reports branch/.test(wrong.stderr));

  // c. publish (`--reuse` keeps an index this probe already published with the same version and rows, to re-run d-f)
  const held = (await client.query("select version, rows from scan_index_meta")).rows[0] as { version: string; rows: number } | undefined;
  if (process.argv.includes("--reuse") && held?.version === data.version && held.rows === rows) {
    console.log("     reusing the published index");
  } else {
    const t0 = Date.now();
    await publishScanIndex(client, data, (s) => console.log(s));
    console.log(`     published ${rows} rows in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  const meta = (await client.query("select version, model, rows from scan_index_meta")).rows[0] as { version: string; model: string; rows: number };
  check("c. the meta row names the index", meta.version === data.version && meta.model === SCAN_MODEL && meta.rows === rows, JSON.stringify(meta));
  const [{ n }] = (await client.query("select count(*)::int as n from scan_index")).rows as { n: number }[];
  check("c. every row is there", n === rows, `${n}`);

  // d. HNSW against an exact scan, on rows nudged off their own embedding so a query is not its own row
  const names = new Map<string, string>();
  const exact = (q: Float32Array) => {
    const best = new Map<string, { s: number; sid: string }>();
    for (let r = 0; r < rows; r++) {
      let s = 0;
      const o = r * EMBED_DIM;
      for (let i = 0; i < EMBED_DIM; i++) s += q[i] * data.vectors[o + i];
      const oid = data.keys[r][2];
      const prev = best.get(oid);
      if (!prev || s > prev.s) best.set(oid, { s, sid: data.keys[r][0] });
    }
    return poolGuesses([...best.entries()].map(([oracleId, { s, sid }]) => ({ oracleId, name: names.get(oracleId) ?? "", scryfallId: sid, typeLine: "", imageUri: null, distance: 1 - s })));
  };
  const nudged = (r: number, seed: number) => {
    const q = new Float32Array(EMBED_DIM);
    let norm = 0;
    for (let i = 0; i < EMBED_DIM; i++) {
      q[i] = data.vectors[r * EMBED_DIM + i] + 0.04 * Math.sin(seed * 31 + i * 7);
      norm += q[i] * q[i];
    }
    for (let i = 0; i < EMBED_DIM; i++) q[i] /= Math.sqrt(norm);
    return q;
  };
  // Half the length of the mix toward the other card: equal parts put the two cards' scores close together.
  const blend = (r: number, s: number) => {
    const q = new Float32Array(EMBED_DIM);
    let norm = 0;
    for (let i = 0; i < EMBED_DIM; i++) {
      q[i] = data.vectors[r * EMBED_DIM + i] + 0.9 * data.vectors[s * EMBED_DIM + i];
      norm += q[i] * q[i];
    }
    for (let i = 0; i < EMBED_DIM; i++) q[i] /= Math.sqrt(norm);
    return q;
  };
  const GATE = 0.02;
  let sameTop = 0, worstScore = 0, worstMargin = 0, gateFlips = 0, nearGate = 0;
  const ms: number[] = [];
  for (let k = 0; k < QUERIES * 2; k++) {
    const r = Math.floor(((k + 1) * 2654435761) % rows);
    const q = k < QUERIES ? nudged(r, k) : blend(r, Math.floor(((k + 7) * 40503) % rows));
    const t = Date.now();
    const got = await lookupGuesses(q, SCAN_MODEL);
    ms.push(Date.now() - t);
    const want = exact(q);
    if (got.kind !== "ok") {
      check(`d. query ${k} answered`, false, got.kind);
      continue;
    }
    if (got.answer.guesses[0]?.oracleId === want.guesses[0]?.oracleId) sameTop += 1;
    for (const g of got.answer.guesses) {
      const w = want.guesses.find((x) => x.oracleId === g.oracleId);
      if (w) worstScore = Math.max(worstScore, Math.abs(w.score - g.score));
    }
    // Compared whatever the runner-up: HNSW naming a different second card is exactly when its margin could
    // overstate the confidence. One side having a margin and the other none is a failure of its own.
    if ((got.answer.margin === null) !== (want.margin === null)) worstMargin = Infinity;
    else if (got.answer.margin !== null && want.margin !== null) {
      if ((got.answer.margin >= GATE) !== (want.margin >= GATE)) gateFlips += 1;
      if (want.margin < 0.1) {
        nearGate += 1;
        worstMargin = Math.max(worstMargin, Math.abs(got.answer.margin - want.margin));
      }
    }
  }
  ms.sort((a, b) => a - b);
  console.log(`     ${sameTop}/${QUERIES * 2} same first card; worst score gap ${worstScore.toFixed(5)}; ${nearGate} margins under 0.1, worst gap ${worstMargin.toFixed(5)}; ${gateFlips} gate flips; lookup median ${ms[ms.length >> 1]}ms, worst ${ms[ms.length - 1]}ms`);
  check("d. HNSW names the exact scan's first card every time", sameTop === QUERIES * 2, `${sameTop}/${QUERIES * 2}`);
  check("d. scores within 2e-3 of fp32", worstScore <= 2e-3, worstScore.toFixed(5));
  check("d. some margins land near the gate", nearGate >= 10, `${nearGate}`);
  check("d. margins under 0.1 within 4e-3 of fp32", worstMargin <= 4e-3, worstMargin.toFixed(5));
  check("d. never the other side of the 0.02 gate", gateFlips === 0, `${gateFlips}`);

  // e. the most-printed card
  const per = new Map<string, number[]>();
  data.keys.forEach(([, , oid], r) => per.set(oid, [...(per.get(oid) ?? []), r]));
  const [topOracle, topRows] = [...per.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const most = await lookupGuesses(nudged(topRows[0], 99), SCAN_MODEL);
  const distinct = most.kind === "ok" ? new Set(most.answer.guesses.map((g) => g.oracleId)).size : 0;
  check(`e. the most-printed card (${topRows.length} rows) gets three distinct guesses`, distinct === 3, `${distinct}`);
  check("e. and is the first of them", most.kind === "ok" && most.answer.guesses[0]?.oracleId === topOracle);

  // f. another model
  const other = await lookupGuesses(nudged(0, 1), "dhvazquez/mtg_card_identification_embeddings@653d88d int8");
  check("f. another model is refused", other.kind === "model");
} finally {
  client.release();
  await pool.end();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
