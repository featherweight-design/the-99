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
 * A short stable fingerprint of the cards one request asks about, in the order it asks.
 *
 * This is what makes a chunk's identity its CONTENT rather than its position. Keyed on an index,
 * a card entering or leaving the stale set between waves moved every later chunk's contents under
 * an unchanged key, so a resumed run had to refuse outright rather than skip cards nobody asked
 * about. Keyed on the names, a shifted set simply produces different chunks for the cards still
 * unlabelled, and an unchanged chunk reproduces its own key.
 *
 * Ten hex characters (40 bits) because the key also goes into `custom_id`, which the provider
 * caps; within one run's few thousand chunks a collision is not a risk worth modelling, and the
 * global unique constraint on `custom_id` would refuse one loudly rather than mix two requests.
 */
export const chunkHash = (names: readonly string[]): string =>
  createHash("sha256").update(names.join("\u0000")).digest("hex").slice(0, 10);

/**
 * Splits cards into requests, with ids derived from WHAT each request asks about.
 *
 * Both ids are deterministic in `(runId, model, names, attempt)`, which is what lets a resumed run
 * compute the same key for the same work and find its own intent rather than creating a second.
 * Callers still pass cards in a stable order (the query's `order by`), so an unchanged set chunks
 * the same way and reproduces its keys.
 *
 * **The attempt number exists because content addressing reproduces a key that may already be
 * spent.** A chunk whose batch reached a terminal failure (its results expired, or every request
 * errored) re-plans to the same names, and so to the same hash; the earlier intent row still holds
 * that key and that `custom_id`, and both are unique. The insert is the claim, so a reused key
 * would read as another process's claim and stop the run — or, worse, a recovery could not tell
 * the two requests apart. So `priorAsked` carries every intent this run already recorded for this
 * model, whatever its status, and a chunk whose names match one of them takes the next attempt.
 * Retiring the failed row instead was the alternative and is refused: that row is the evidence of
 * what was billed (an expired batch is reserved at its worst case from it), and deleting or
 * rewriting it is how one charge gets counted twice or not at all.
 */
export function planChunks(
  runId: string, model: string, names: readonly string[],
  priorAsked: readonly (readonly string[])[] = [],
): Chunk[] {
  const token = runToken(runId);
  const used = new Map<string, number>();
  for (const asked of priorAsked) {
    const h = chunkHash(asked);
    used.set(h, (used.get(h) ?? 0) + 1);
  }
  const chunks: Chunk[] = [];
  for (let i = 0; i * CARDS_PER_REQUEST < names.length; i++) {
    const these = names.slice(i * CARDS_PER_REQUEST, (i + 1) * CARDS_PER_REQUEST);
    const h = chunkHash(these);
    // Counted within the plan too, so two identical chunks in one plan (which only a caller that
    // failed to dedupe names could produce) still get distinct keys rather than one claim.
    const attempt = (used.get(h) ?? 0) + 1;
    used.set(h, attempt);
    chunks.push({
      // Short by construction: run token + MODEL token + content hash + attempt, 28 characters
      // for any attempt under ten against the provider's 64.
      //
      // `model.slice(0, 1)` was the first version and it does not disambiguate: every Anthropic
      // id starts `claude-`, so `claude-sonnet-4-5` and `claude-sonnet-5` both reduced to `c`.
      // Two models in one run would then produce identical `custom_id`s, which the global unique
      // constraint rejects — and the insert is a claim, so the second model's chunks would be
      // unclaimed while the request still went out, or a recovery could not tell the two apart.
      //
      // The hash is fixed-width, so the attempt digits after it cannot run into it.
      customId: `${token}-${modelToken(model)}${h}${attempt}`,
      intentKey: `${runId}:${model}:${h}:${attempt}`,
      names: these,
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
  // the hard stop is enforced against — so the caller derives it from the real renderer
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

/**
 * The measured cost of labelling one card, used ONLY to project a run before it has measured anything of
 * its own. It is a MEASUREMENT, so it names the run it came from: a figure with no source goes stale
 * silently, and the first one did. It projected from the first sample's $0.001291 while v7 measured
 * $0.001902, so a full run read as $41 against a truth near $61, and the report line would fire late or
 * not at all. `plan.test.ts` pins it to the newest committed re-sample's `usdPerCard`.
 */
export const MEASURED_PER_CARD = {
  usd: 0.001902,
  runId: "run-2026-10-03T02-35-34-739Z",
  measuredOn: "2026-10-03",
  source: "docs/superpowers/benchmarks/2026-09-28-card-label-vocabulary-resample-4-cost.json",
} as const;

/** What a run is projected to cost in all: what it has measured, plus the cards still to do at a rate. */
export const projectedTotalUsd = (measuredUsd: number, remainingCards: number, perCardUsd: number): number =>
  measuredUsd + remainingCards * perCardUsd;

/**
 * Which BUDGET a run id spends from: the runs whose spend is summed together against one cap.
 *
 * The cap used to bound a run id, and a run id is cheap to change. A backfill stopped at its $55 and
 * dispatched again under tomorrow's date started from $0 with a fresh $55, so "a hard stop at $55"
 * bounded nothing but one id. So every `backfill-YYYY-MM-DD` dispatch shares ONE budget: Hugh's stop (now
 * $65) is a backfill budget per prompt version (d9, 2026-10-03). The cron's run, named for its ISO week
 * (`weekly-YYYY-Www`, card-labels.yml's `date -u +%G-W%V`), keeps its OWN $9 each week, because a weekly
 * budget summed across weeks would run out for good and leave new cards unlabelled. So a weekly id, like
 * anything else (a timestamped local run, a probe), is its own family.
 *
 * Matched on the workflow's exact shape rather than a loose prefix, so a hand-typed `backfill-x` does not
 * quietly spend from the backfill budget. The family carries a sigil a run id cannot start with, so a run
 * literally named `@backfill` cannot alias it.
 */
export function budgetFamily(runId: string): string {
  if (/^backfill-\d{4}-\d{2}-\d{2}$/.test(runId)) return "@backfill";
  return runId;
}

/** One ledger row as the spend sum reads it: a single intent, never an aggregate of two. */
export type SpendRow = {
  runId: string; status: string; promptVersion: string | null; askedCards: number;
  inTokens: number | null; outTokens: number | null;
  cacheWriteTokens: number | null; cacheReadTokens: number | null;
};

export type FamilySpend = {
  /** What collected (or floor-held) batches reported, priced. */
  measuredUsd: number;
  /** Cards asked by the rows whose usage is measured — the denominator of this run's own rate. */
  measuredCards: number;
  /** Intents whose results expired unread: billed, so reserved at the worst case. */
  expiredChunks: number;
  reserveUsd: number;
  totalUsd: number;
};

/**
 * What a budget family has ALREADY spent, from the ledger's rows. Pure, so the two ways it can
 * count wrong are tested rather than trusted.
 *
 * EACH ROW IS COUNTED ONCE, by its own status, and a retry is a different row. An expired intent
 * contributes its worst-case reserve (billed, results gone) and never tokens; the intent that
 * re-asked its cards contributes its own measured tokens and never a reserve. Both charges were
 * real, so both are counted — but neither twice, which is what reusing the failed row for the
 * retry would have done (or hidden one of them). Measured tokens count whatever the status: a
 * batch held below the floor has been paid for even though its intents stay open, and its usage
 * is SET on each re-collection rather than added, so re-reading it does not grow the sum.
 *
 * A row with no `prompt_version` counts for NOTHING. That column arrived with this rule; a row
 * written before it carries no record of which prompt it was priced for, and summing a different
 * prompt's spend into today's cap would stop a run on another prompt's history.
 */
export function familySpend(
  rows: readonly SpendRow[], runId: string, promptVersion: string, rates: Rates,
  reservePerChunkUsd: number,
): FamilySpend {
  const family = budgetFamily(runId);
  let measuredUsd = 0, measuredCards = 0, expiredChunks = 0;
  for (const r of rows) {
    if (r.promptVersion === null || r.promptVersion !== promptVersion) continue;
    if (budgetFamily(r.runId) !== family) continue;
    if (r.status === "expired") { expiredChunks++; continue; }
    if (r.inTokens === null && r.outTokens === null) continue;
    // Cache writes at 1.25x the input rate and reads at 0.1x, as the provider bills them.
    measuredUsd += ((r.inTokens ?? 0) * rates.in + (r.outTokens ?? 0) * rates.out
      + (r.cacheWriteTokens ?? 0) * rates.in * 1.25 + (r.cacheReadTokens ?? 0) * rates.in * 0.1) / 1e6;
    measuredCards += r.askedCards;
  }
  const reserveUsd = expiredChunks * reservePerChunkUsd;
  return { measuredUsd, measuredCards, expiredChunks, reserveUsd, totalUsd: measuredUsd + reserveUsd };
}

/**
 * Open intents asked under ANOTHER prompt version whose cards this run would plan again. `planned`
 * is the set the run will actually ask for, after its shared-name and in-flight exclusions. A label
 * stays fresh under the version that wrote it, so a prompt bump costs nothing by itself, but an
 * intent of another version may still be out and paid for, and `reconcile` collects only the
 * current version's: planning one of its cards would pay twice. Only an OVERLAP blocks: an old
 * intent whose cards have all been labelled since (the never-submitted, pre-migration intents of
 * 2026-09-28, whose cards the v8 relabel covered) asks for nothing this run plans, and blocking on it
 * would stop every later run for good.
 */
export function inFlightElsewhere(
  intents: readonly { promptVersion: string | null; asked: readonly string[] | null }[],
  currentVersion: string,
  planned: ReadonlySet<string>,
): { intents: number; versions: string[]; cards: string[] } {
  const hits = intents.filter((i) => i.promptVersion !== currentVersion)
    .map((i) => ({ version: i.promptVersion ?? "unrecorded", cards: (i.asked ?? []).filter((n) => planned.has(n)) }))
    .filter((h) => h.cards.length > 0);
  return {
    intents: hits.length,
    versions: [...new Set(hits.map((h) => h.version))],
    cards: [...new Set(hits.flatMap((h) => h.cards))],
  };
}
