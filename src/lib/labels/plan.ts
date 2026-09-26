/**
 * What a label run intends to do, before it does any of it. PURE — no database, no API.
 *
 * Separated from the script so the two decisions that cost money can be unit-tested: how
 * work is chunked into requests, and whether the projected spend is inside the cap. The
 * script around this is I/O; these are the rules.
 */

/** Cards per request. 12 in the sample, and the figure every measured cost rests on. */
export const CARDS_PER_REQUEST = 12;

/**
 * A run token, short and unique per run, from which every `custom_id` is derived.
 *
 * **It must be short.** The provider caps `custom_id` length, and the run id is a
 * 29-character timestamp, so the token is a slice of a hash of it rather than the id
 * itself. And it must be UNIQUE per run, or a recovery that lists the provider's batches
 * matches requests from an earlier run — which is either adopting a stale result or
 * re-paying for a finished chunk (#1056 round 4).
 */
export const runToken = (runId: string): string => {
  let h = 0x811c9dc5;
  for (const ch of runId) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).padStart(7, "0").slice(0, 7);
};

/** One request: the id sent to the provider, and the cards it asks about. */
export type Chunk = { customId: string; intentKey: string; names: string[] };

/**
 * Splits cards into requests, with the ids a resumed run must reproduce EXACTLY.
 *
 * Both ids are deterministic in `(runId, model, index)`, which is what lets a resumed run
 * compute the same key for the same work and find its own intent rather than creating a
 * second. So the input order matters: callers pass cards in a stable order (the query's
 * `order by`), or a resumed run chunks differently and the keys stop matching.
 */
export function planChunks(runId: string, model: string, names: readonly string[]): Chunk[] {
  const token = runToken(runId);
  const chunks: Chunk[] = [];
  for (let i = 0; i * CARDS_PER_REQUEST < names.length; i++) {
    chunks.push({
      // Short by construction: token + model initial + index. `m` disambiguates two models
      // in one run, whose chunk indices both start at 0.
      customId: `${token}-${model.slice(0, 1)}${i}`,
      intentKey: `${runId}:${model}:${i}`,
      names: names.slice(i * CARDS_PER_REQUEST, (i + 1) * CARDS_PER_REQUEST),
    });
  }
  return chunks;
}

/** Per-million-token rates, batch-discounted, as the pricing table holds them. */
export type Rates = { in: number; out: number };

/**
 * The WORST case for a run, which is what the cap must bind on.
 *
 * Not the estimate: a run is authorised against the most it could cost, because the actual
 * output length is unknown until the model answers. `maxTokensPerRequest` is the ceiling
 * every request carries, so the worst case is every request returning it in full.
 */
export function worstCaseUsd(
  chunks: number,
  systemTokens: number,
  perCardTokens: number,
  maxTokensPerRequest: number,
  rates: Rates,
): number {
  // Input is the instruction block once per REQUEST — one system block each, no caching
  // (see `SENDS_CACHE_BREAKPOINT`) — plus the cards in that request.
  const inTokens = chunks * (systemTokens + CARDS_PER_REQUEST * perCardTokens);
  const outTokens = chunks * maxTokensPerRequest;
  return (inTokens * rates.in + outTokens * rates.out) / 1e6;
}

export type CapVerdict =
  | { ok: true; worstUsd: number }
  | { ok: false; worstUsd: number; why: string };

/**
 * Whether a run may proceed under the cap, INCLUDING what earlier runs already spent.
 *
 * `alreadySpentUsd` is the ledger's total, so a second attempt after a partial run cannot
 * authorise the full amount again — which is the hole the sample's own ledger had to close
 * twice. A run is refused when its worst case plus what is already spent would pass the
 * cap, never when the estimate would: authorising on the estimate is authorising on a
 * figure the run is not bound by.
 */
export function withinCap(worstUsd: number, alreadySpentUsd: number, capUsd: number): CapVerdict {
  const total = worstUsd + alreadySpentUsd;
  if (total > capUsd) {
    return {
      ok: false,
      worstUsd,
      why: `worst case $${worstUsd.toFixed(2)} plus $${alreadySpentUsd.toFixed(2)} already spent `
        + `would reach $${total.toFixed(2)}, past the $${capUsd.toFixed(2)} cap`,
    };
  }
  return { ok: true, worstUsd };
}

/**
 * Whether a finished run may PUBLISH, or must refuse and leave the previous labels standing.
 *
 * The floor is a share of the cards the run asked about, not an absolute count, so it holds
 * for a 32,000-card backfill and a 390-card weekly refresh alike. A refusal is a hard
 * failure — the run exits non-zero — because a partially-labelled table is
 * indistinguishable from a complete one to every reader, which is what #704 cost.
 */
export type FloorVerdict = { ok: true; share: number } | { ok: false; share: number; why: string };

export function meetsFloor(returned: number, asked: number, floor: number): FloorVerdict {
  // An empty run never publishes, whatever the share arithmetic says: 0/0 is 1 by the
  // formula and "nothing was asked for" is not a successful run.
  if (asked === 0) return { ok: false, share: 0, why: "the run asked about no cards at all" };
  const share = returned / asked;
  if (share < floor) {
    return {
      ok: false,
      share,
      why: `only ${returned} of ${asked} cards came back (${(100 * share).toFixed(1)}%), `
        + `under the ${(100 * floor).toFixed(0)}% floor — the previous labels stand`,
    };
  }
  return { ok: true, share };
}
