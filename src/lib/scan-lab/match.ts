/**
 * The card-scan lab's index and nearest-neighbour search, pure. The index is built offline by
 * `scripts/research/card-scan/export_index.py` (by default one row per paper printing, plus the
 * back face of a double-faced card, because the embedder tells printings apart and the spike found
 * one reference per oracle misses most other printings) and hosted outside the repository, as two
 * files:
 *
 *   scan-index.json  { version, model, dim, rows, oracles: [[oracleId, name]...], rowOracle: [i...] }
 *   scan-index.bin   rows*dim int8 (each row quantised by its own scale), then rows float32 scales
 *
 * Matching identifies the CARD (its oracle id), never the printing: rows of one oracle pool into
 * one answer, and the player picks the set after.
 */

export type IndexMeta = {
  version: string;
  model: string;
  dim: number;
  rows: number;
  oracles: [string, string][];
  rowOracle: number[];
};

export type ScanIndex = {
  meta: IndexMeta;
  codes: Int8Array;
  scales: Float32Array;
};

export type Guess = { oracleId: string; name: string; score: number };

export function parseIndex(meta: IndexMeta, bin: ArrayBuffer): ScanIndex {
  const { rows, dim } = meta;
  if (meta.rowOracle.length !== rows) throw new Error("index rows disagree");
  if (bin.byteLength !== rows * dim + rows * 4) throw new Error("index size disagrees");
  return { meta, codes: new Int8Array(bin, 0, rows * dim), scales: new Float32Array(bin.slice(rows * dim)) };
}

/** The `k` best oracles for an L2-normalised query, each scored by its best row (cosine). */
export function topOracles(index: ScanIndex, q: Float32Array, k = 5): Guess[] {
  const { rows, dim, oracles, rowOracle } = index.meta;
  const best = new Map<number, number>();
  for (let r = 0; r < rows; r++) {
    let s = 0;
    const o = r * dim;
    for (let i = 0; i < dim; i++) s += q[i] * index.codes[o + i];
    s *= index.scales[r];
    const oi = rowOracle[r];
    const prev = best.get(oi);
    if (prev === undefined || s > prev) best.set(oi, s);
  }
  return [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([oi, score]) => ({ oracleId: oracles[oi][0], name: oracles[oi][1], score }));
}

export function normalise(v: Float32Array): Float32Array {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

/**
 * Frames agree when the same oracle is top-1 on `need` frames in a row, each clearing the margin
 * over its runner-up (the friend's pipeline: commit only after several frames agree).
 */
export function agreement(history: { oracleId: string; margin: number }[], need = 3, minMargin = 0.02): string | null {
  if (history.length < need) return null;
  const last = history.slice(-need);
  const id = last[0].oracleId;
  return last.every((h) => h.oracleId === id && h.margin >= minMargin) ? id : null;
}
