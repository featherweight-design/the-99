import { createHash } from "node:crypto";

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
export const runToken = (runId: string): string =>
  // sha256, first 12 hex characters. A 32-bit FNV hash truncated to seven base-36 characters was
  // the first version and it is not collision-resistant: two run ids colliding produce the same
  // `custom_id`, which the database's global unique constraint then rejects — and the insert is
  // `onConflictDoNothing`, so the new run's intent would be ABSENT while `submit` still sent the
  // request. That is a request nobody can reconcile and therefore work that can be paid for
  // twice, arriving through the one mechanism built to prevent it.
  //
  // 48 bits over the handful of runs this will ever see is not a risk worth modelling; the point
  // is that the failure mode is silent and expensive, so the cheap strong hash is correct even
  // though the weak one would almost certainly have held.
  createHash("sha256").update(runId).digest("hex").slice(0, 12);

/**
 * A short stable token for a model id, for the same reason `runToken` exists: `custom_id` is
 * length-capped, and the ids are long and share a prefix.
 */
export const modelToken = (model: string): string =>
  createHash("sha256").update(model).digest("hex").slice(0, 4);

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
      // Short by construction: run token + MODEL token + index.
      //
      // `model.slice(0, 1)` was the first version and it does not disambiguate: every Anthropic
      // id starts `claude-`, so `claude-sonnet-4-5` and `claude-sonnet-5` both reduced to `c`.
      // Two models in one run would then produce identical `custom_id`s, which the global unique
      // constraint rejects — and the insert is a claim, so the second model's chunks would be
      // unclaimed while the request still went out, or a recovery could not tell the two apart.
      customId: `${token}-${modelToken(model)}${i}`,
      intentKey: `${runId}:${model}:${i}`,
      names: names.slice(i * CARDS_PER_REQUEST, (i + 1) * CARDS_PER_REQUEST),
    });
  }
  return chunks;
}

/** Per-million-token rates, batch-discounted, as the pricing table holds them. */
/** `system`: the rate the instruction block is booked at, when caching makes it the write rate. */
export type Rates = { in: number; out: number; system?: number };

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
  bodyOverheadTokens = 0,
): number {
  // Input is the instruction block once per REQUEST — one system block each — plus the cards in
  // that request, PLUS the body's own fixed text.
  //
  // That last term was missing and it made the ceiling too low: `renderBody` wraps the cards in
  // a "Label these N cards." line and eleven `---` separators, none of which `perCardTokens`
  // covers. A ceiling that omits part of the request is not a ceiling, and this is the quantity
  // the $55 hard stop is enforced against — so the caller derives it from the real renderer
  // rather than estimating it here.
  // With a cache breakpoint the block is booked at the WRITE rate on every request (`rates.system`):
  // batch requests run in parallel, so the worst case is that none finds a warm cache.
  const inTokens = chunks * (bodyOverheadTokens + CARDS_PER_REQUEST * perCardTokens);
  const outTokens = chunks * maxTokensPerRequest;
  return (chunks * systemTokens * (rates.system ?? rates.in) + inTokens * rates.in + outTokens * rates.out) / 1e6;
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

/**
 * How many requests may be submitted in ONE provider batch, given the budget left.
 *
 * **This exists because `batches.create` is atomic.** Submit 2,653 requests and the run is
 * committed to whatever they cost; there is no stopping at the cap mid-batch. So a spend
 * stop is only enforceable if the run goes in WAVES: each wave's worst case must fit the
 * REMAINING budget, and the next wave is authorised after the previous one's true cost is
 * known.
 *
 * Returns 0 when not even one request fits, which the caller must treat as a refusal rather
 * than as an empty wave — otherwise a run with no budget left loops forever submitting
 * nothing.
 */
export function waveSize(
  remainingUsd: number,
  systemTokens: number,
  perCardTokens: number,
  maxTokensPerRequest: number,
  rates: Rates,
  cap = 400,
  bodyOverheadTokens = 0,
): number {
  const perRequest = worstCaseUsd(1, systemTokens, perCardTokens, maxTokensPerRequest, rates, bodyOverheadTokens);
  if (perRequest <= 0) return cap;
  return Math.max(0, Math.min(cap, Math.floor(remainingUsd / perRequest)));
}

/**
 * A numeric override, REFUSED unless it is a real number in range.
 *
 * Pure, and here rather than in the script, because it guards money and therefore needs tests.
 *
 * `Number("abc")` is `NaN`, and NaN defeats every comparison this run protects spend with:
 * `worst > cap` is false, `share < floor` is false, `projected > reportAt` is false. One mistyped
 * variable would switch the cap, the floor and the pause off at once — silently, with the run
 * reporting that it had passed every guard. Bounded ABOVE as well as below, because
 * `LABEL_CAP_USD=5500` is a plausible typo that would authorise a hundred times the approved
 * spend.
 */
export function boundedNumber(
  name: string, raw: string | undefined, fallback: number, min: number, max: number,
): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a finite number, got "${raw}"`);
  if (n < min || n > max) throw new Error(`${name} must be between ${min} and ${max}, got ${n}`);
  return n;
}

/**
 * What a paused run should tell the operator, and whether a dispatch can resume it at all.
 *
 * Pure and tested because this sentence has been WRONG THREE TIMES, each time in a way that read
 * fine and could not be followed:
 *
 *   1. "re-run with LABEL_REPORT_AT_USD=<cap>" — names 55, which the dispatch form refuses.
 *   2. "a higher report line, up to $50" — unfollowable for a run already AT 50, which is the
 *      case most likely to pause.
 *   3. (this) — the remaining trap would be naming a figure above the ceiling as though asking
 *      for it were possible.
 *
 * So the rule is: state the figure the report line must REACH, and say plainly whether the form
 * can reach it. Past the ceiling there is no input, only a decision — and the text must not
 * suggest otherwise, which is what `plan.test.ts` asserts rather than pinning the wording.
 */
export function pauseRemediation(
  projectedUsd: number, dispatchCeilingUsd: number,
): { canResume: boolean; neededUsd: number; text: string } {
  // ROUNDED UP to the cent. The comparison the run makes is `projected > line`, so a line set to
  // a truncated projection still pauses — telling the operator to enter $41.08 for a projection
  // of $41.081 would send them round the loop again for a rounding error.
  const neededUsd = Math.ceil(projectedUsd * 100) / 100;
  const canResume = neededUsd <= dispatchCeilingUsd;
  const text = canResume
    ? `To resume, the report line has to reach $${neededUsd.toFixed(2)}, and card-labels.yml `
      + `accepts up to $${dispatchCeilingUsd.toFixed(2)} — so dispatch again with \`pause\` at `
      + `$${neededUsd.toFixed(2)} or more, once he has approved it.`
    : `To resume, the report line would have to reach $${neededUsd.toFixed(2)}, and card-labels.yml `
      + `accepts at most $${dispatchCeilingUsd.toFixed(2)}. NO DISPATCH CAN DO IT: a projection this `
      + `size is past what was approved, so resuming needs that ceiling raised deliberately in the `
      + `workflow, not a different input.`;
  return { canResume, neededUsd, text };
}
