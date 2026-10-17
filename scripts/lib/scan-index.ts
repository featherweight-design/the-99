// Card scanning's server index: reading the exporter's files and publishing them (plan `2026-10-16-card-scan.md`).
// `pnpm db:seed:scan-index` and `pnpm probe:card-scan-match` share it, so the probe proves the publish the ingest runs.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PoolClient } from "@neondatabase/serverless";
import { EMBED_DIM, SCAN_MODEL, vectorLiteral } from "../../src/lib/card-scan/match";

export type ScanRows = {
  version: string;
  model: string;
  keys: [scryfallId: string, face: string, oracleId: string][];
  /** rows × dim, unit length. */
  vectors: Float32Array;
  /**
   * Each row's embedding as the source database printed it, when the rows come from one (the copy). Written as given,
   * because a halfvec read into floats and printed again does not always land on the same fp16 value.
   */
  literals?: string[];
};

/** The fewest rows a real index publishes: the every-printing gallery held 103,823 on 2026-10-14. */
export const MIN_ROWS = 100_000;
/** How far from unit length a row may be. */
const NORM_TOLERANCE = 1e-3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Rows per insert statement: a row's text form is about 2.5KB, so a statement is about 1.3MB. */
const BATCH = 500;

/** Reads `scan-rows.json` and `scan-rows.f32` from `dir`. */
export function readScanRows(dir: string): ScanRows & { dim: number; rows: number } {
  const meta = JSON.parse(readFileSync(join(dir, "scan-rows.json"), "utf8")) as {
    version: string; model: string; dim: number; rows: number; keys: [string, string, string][];
  };
  const bin = readFileSync(join(dir, "scan-rows.f32"));
  const vectors = new Float32Array(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
  return { ...meta, vectors };
}

/** Why these rows must not be published, or null. Checked before the target is touched. */
export function scanRowsRefusal(r: ScanRows & { dim: number; rows: number }, minRows = MIN_ROWS): string | null {
  if (r.model !== SCAN_MODEL) return `model is ${r.model}, not ${SCAN_MODEL}`;
  if (r.dim !== EMBED_DIM) return `dim is ${r.dim}, not ${EMBED_DIM}`;
  if (r.keys.length !== r.rows) return `${r.keys.length} keys for ${r.rows} rows`;
  if (r.vectors.length !== r.rows * EMBED_DIM) return `${r.vectors.length} values for ${r.rows} rows of ${EMBED_DIM}`;
  if (r.rows < minRows) return `${r.rows} rows, under the floor of ${minRows}`;
  const seen = new Set<string>();
  for (let i = 0; i < r.rows; i++) {
    const [sid, face, oid] = r.keys[i];
    if (!UUID.test(sid) || !UUID.test(oid) || (face !== "front" && face !== "back")) return `row ${i} has a bad key`;
    if (seen.has(`${sid}_${face}`)) return `row ${i} repeats ${sid} ${face}`;
    seen.add(`${sid}_${face}`);
    let n = 0;
    for (let d = 0; d < EMBED_DIM; d++) {
      const x = r.vectors[i * EMBED_DIM + d];
      if (!Number.isFinite(x)) return `row ${i} holds a non-finite value`;
      n += x * x;
    }
    if (Math.abs(Math.sqrt(n) - 1) > NORM_TOLERANCE) return `row ${i} is not unit length`;
  }
  return null;
}

/**
 * Replaces the index and its meta row in ONE transaction on `client`. The HNSW index is dropped first and built
 * after the rows, which is far quicker than maintaining it row by row; lookups wait on the table until it commits
 * (the drop holds an exclusive lock), and a failure anywhere rolls every step back, the old index included.
 */
/** One parameterised statement against the target: a `PoolClient`'s `query`, shaped down to what the publish uses. */
export type ScanQuery = (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;

/**
 * The publish's statements, inside a transaction the caller opened: the old rows and the index go, the new rows go
 * in, the index is built again, the meta row is written and the count is checked. `beforeCommit` runs last, still
 * inside the transaction (the copy's verify against its source); throwing from it rolls everything back.
 */
export async function publishScanIndexIn(
  q: ScanQuery,
  r: ScanRows,
  log: (s: string) => void = () => {},
  beforeCommit: () => Promise<void> = async () => {},
): Promise<void> {
  const rows = r.keys.length;
  await q("set local maintenance_work_mem = '256MB'");
  await q("drop index if exists scan_index_embedding_idx");
  await q("delete from scan_index");
  for (let start = 0; start < rows; start += BATCH) {
    const end = Math.min(rows, start + BATCH);
    const params: string[] = [];
    const values: string[] = [];
    for (let i = start; i < end; i++) {
      const [sid, face, oid] = r.keys[i];
      const p = params.length;
      params.push(sid, face, oid, r.literals?.[i] ?? vectorLiteral(r.vectors.subarray(i * EMBED_DIM, (i + 1) * EMBED_DIM)));
      values.push(`($${p + 1}::uuid, $${p + 2}, $${p + 3}::uuid, $${p + 4}::halfvec(${EMBED_DIM}))`);
    }
    await q(`insert into scan_index (scryfall_id, face, oracle_id, embedding) values ${values.join(",")}`, params);
    if ((start / BATCH) % 40 === 0) log(`  ${end} of ${rows} rows`);
  }
  log("  building the HNSW index");
  await q("create index scan_index_embedding_idx on scan_index using hnsw (embedding halfvec_cosine_ops)");
  await q(
    `insert into scan_index_meta (id, version, model, rows, published_at) values (1, $1, $2, $3, now())
     on conflict (id) do update set version = excluded.version, model = excluded.model, rows = excluded.rows, published_at = now()`,
    [r.version, r.model, rows],
  );
  const [{ n }] = (await q("select count(*)::int as n from scan_index")).rows as { n: number }[];
  if (n !== rows) throw new Error(`published ${n} rows, expected ${rows}`);
  await beforeCommit();
}

/** `publishScanIndexIn` in a transaction of its own on `client`. */
export async function publishScanIndex(client: PoolClient, r: ScanRows, log: (s: string) => void = () => {}): Promise<void> {
  await client.query("begin");
  try {
    await publishScanIndexIn((text, params) => client.query(text, params), r, log);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  }
}

/**
 * The index as one comparable figure: its row count and an md5 over every row's text in key order. The embedding's
 * text is its halfvec's, so a copy that wrote the same fp16 values reads the same figure on both sides.
 */
export const SCAN_FIGURE_SQL = `
  select count(*)::int as rows,
         md5(coalesce(string_agg(scryfall_id::text || ' ' || face || ' ' || oracle_id::text || ' ' || embedding::text,
                                 chr(30) order by scryfall_id, face), '')) as md5
  from scan_index`;

/** A halfvec's text form (`[0.1,-0.2,...]`) into `out` at `offset`. */
export function parseHalfvec(text: string, out: Float32Array, offset: number): void {
  const inner = text.trim().replace(/^\[|\]$/g, "");
  const parts = inner.split(",");
  if (parts.length !== EMBED_DIM) throw new Error(`a row holds ${parts.length} values, not ${EMBED_DIM}`);
  for (let d = 0; d < EMBED_DIM; d++) out[offset + d] = Number(parts[d]);
}
