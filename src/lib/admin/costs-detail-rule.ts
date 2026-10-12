import { ledgerLimits, type LedgerLimits } from "../eval/ledger-limits";
import type { ModelFeature } from "../model/allowance-rule";
import { batchCostMicroUsd, FEATURE_CALLS, featureWorstCaseMicroUsd } from "../model/prices";
import { usdToMicro } from "../model/spend-rule";
import { monthParam, type MonthKey } from "./costs-rule";

/**
 * The Costs detail as arithmetic (admin PR 3: By model, Player against system, By feature and
 * model, Refunds, Reserved against spent, Per account, Card label runs, Eval ledgers). Pure and
 * client-safe: `costs.ts` reads the month's rows and the committed ledgers and hands them here.
 *
 * Every dollar is integer micro-dollars. A run is one `model_calls` row; a provider call is one
 * `model_call_parts` row, or the run itself when it has none and cost something (a row from before the
 * parts table). A partless run that cost nothing made no provider call: it is a `noCall` bill (an
 * empty Look-deeper pool settles at $0 and writes no part), counted as a run and never as a call.
 * Such a row keeps its own `model`, and when that joins two models with `+` it is a COMPOSITE,
 * named as one and never split by guesswork (brief, locked rule 13): its effort is not recorded.
 */

export type Origin = "player" | "system";
export type CallRow = {
  id: string;
  userId: string;
  feature: string;
  origin: Origin;
  status: "reserved" | "spent" | "refunded";
  model: string | null;
  /** Null when the call returned no usage: a run, but no dollars. */
  micro: number | null;
  createdAt: Date;
};
export type PartRow = { callId: string; step: string; model: string; effort: string | null; micro: number };
/**
 * One `card_label_batches` run's chunks in the month, by model. The token sums are 0, never null,
 * until a chunk collects (the query coalesces them); an uncollected run is told apart by `collected === 0`.
 */
export type LabelRunRow = {
  runId: string;
  model: string;
  batches: number;
  collected: number;
  inTokens: number;
  outTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  firstAt: Date;
};
/** An eval ledger line, as `scripts/eval/lib/ledger.mts` writes it. */
export type LedgerEntry = { at: string; usd: number; requests: number; pending?: string; settles?: string };
export type LedgerFile = { file: string; entries: readonly LedgerEntry[] };

export type DetailRows = { calls: readonly CallRow[]; parts: readonly PartRow[]; labelRuns: readonly LabelRunRow[]; ledgers: readonly LedgerFile[] };

/** The four series every split draws, each in its own ink. */
export type Series = { player: number; rewrites: number; labels: number; evals: number };

/** What a system run is: a `labels` row is card labels, any other system row a rewrite or prose. */
const seriesOf = (c: { origin: Origin; feature: string }): "player" | "rewrites" | "labels" =>
  c.origin === "player" ? "player" : c.feature === "labels" ? "labels" : "rewrites";

export const isComposite = (model: string) => model.includes("+");

/** The provider calls under each priced run: its parts, or the run itself when it has none and cost something. */
function providerCalls(calls: readonly CallRow[], parts: readonly PartRow[]) {
  const byCall = new Map<string, PartRow[]>();
  for (const p of parts) byCall.set(p.callId, [...(byCall.get(p.callId) ?? []), p]);
  return calls
    .filter((c) => c.micro !== null)
    .map((c) => {
      const own = byCall.get(c.id);
      return {
        call: c,
        steps: own?.length
          ? own.map((p) => ({ step: p.step as string | null, model: p.model, effort: p.effort ?? null, recorded: true, micro: p.micro }))
          : c.micro === 0
            ? []
            : [{ step: null, model: c.model ?? "", effort: null, recorded: false, micro: c.micro ?? 0 }],
      };
    });
}

/** The value at a fraction through a sample, interpolated as Postgres's `percentile_cont` does. */
export function percentileCont(values: readonly number[], fraction: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = fraction * (sorted.length - 1);
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo));
}

/** Under this many runs a p90 is one of the few runs there are, and is drawn as `—`. */
export const P90_MIN_RUNS = 5;

export type ModelRow = {
  model: string;
  composite: boolean;
  micro: number;
  /** Provider calls, from `model_calls`. */
  calls: number;
  /** Label chunks (`card_label_batches` rows) priced at this model. */
  batches: number;
  features: string[];
  segs: Omit<Series, "evals">;
  /** A label run at this model has chunks still collecting, or could not be priced: the figure is so far. */
  incomplete: boolean;
};

export type FeatureRow = {
  feature: string;
  origin: Origin;
  /** The provider call step, null for a run from before the parts table. */
  step: string | null;
  model: string;
  /** Null: not recorded (every pre-parts run, and a part that set none). */
  effort: string | null;
  runs: number;
  micro: number;
  meanMicro: number;
  p90Micro: number | null;
};

/**
 * `unpriced`: a chunk's model cannot be batch-priced, so its dollars are unknown. `uncollected`: chunks
 * whose usage has not arrived, so `micro` prices only the collected ones. Either makes the figure partial.
 */
export type LabelRun = { runId: string | null; firstAt: Date; source: "batches" | "collector"; batches: number | null; tokens: { in: number; out: number } | null; micro: number; unpriced?: true; uncollected?: number };

export type LedgerRow = {
  file: string;
  requests: number;
  settledMicro: number;
  pendingMicro: number;
  allTimeMicro: number;
  /** The first and last entry the ledger still counts, all time: the canvas's Window. */
  firstAt: string | null;
  lastAt: string | null;
  /** The ledger's hard cap and ask line, from the table the eval scripts enforce; null for a file none guards. */
  limits: LedgerLimits | null;
};

export type CostDetail = {
  series: Series;
  /** `model_calls` system rows that are card labels (the manual collector), already inside `series.labels`. */
  labelCallsMicro: number;
  /** Some label run is unpriced or still collecting, so `series.labels` and every total holding it are so far. */
  labelsIncomplete: boolean;
  models: ModelRow[];
  modelsTotal: number;
  features: FeatureRow[];
  runs: number;
  callsMicro: number;
  refunds: { runs: number; micro: number; byFeature: { feature: string; runs: number; micro: number }[] };
  /** `runs` counts every player press of the feature; `meanMicro` is over the priced ones, null when none is priced yet. */
  reserved: { feature: ModelFeature; reservedMicro: number; meanMicro: number | null; runs: number }[];
  accounts: { userId: string; presses: number; credits: number; micro: number }[];
  labelRuns: LabelRun[];
  ledgers: LedgerRow[];
};

/** A ledger's settled and pending spend in a month, and all time netted as `spent()` nets it. */
export function ledgerRow(ledger: LedgerFile, month: MonthKey): LedgerRow {
  const prefix = monthParam(month);
  const closed = new Set(ledger.entries.flatMap((e) => (e.settles ? [e.settles] : [])));
  const open = (e: LedgerEntry) => !!e.pending && !closed.has(e.pending);
  let requests = 0, settled = 0, pending = 0, all = 0;
  let firstAt: string | null = null;
  let lastAt: string | null = null;
  for (const e of ledger.entries) {
    // A pending entry the ledger has settled is the worst case it no longer counts; `spent()` drops it.
    if (e.pending && !open(e)) continue;
    const usd = usdToMicro(e.usd);
    all += usd;
    if (!firstAt || e.at < firstAt) firstAt = e.at;
    if (!lastAt || e.at > lastAt) lastAt = e.at;
    if (!e.at.startsWith(prefix)) continue;
    if (e.pending) pending += usd;
    else {
      settled += usd;
      requests += e.requests;
    }
  }
  return { file: ledger.file, requests, settledMicro: settled, pendingMicro: pending, allTimeMicro: all, firstAt, lastAt, limits: ledgerLimits(ledger.file) };
}

const mean = (xs: readonly number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

const RESERVED_FEATURES = Object.keys(FEATURE_CALLS) as ModelFeature[];

/** A batch run's cost, or null when its model cannot be priced from summed meters. */
function batchPrice(model: string, t: LabelRunRow): number | null {
  try {
    return batchCostMicroUsd(model, t);
  } catch {
    return null;
  }
}

export function costDetail(rows: DetailRows, month: MonthKey): CostDetail {
  const calls = providerCalls(rows.calls, rows.parts);

  // By model: provider calls, inked by the run's origin; then the label batches.
  const models = new Map<string, ModelRow>();
  const modelRow = (model: string) => {
    let m = models.get(model);
    if (!m) models.set(model, (m = { model, composite: isComposite(model), micro: 0, calls: 0, batches: 0, features: [], segs: { player: 0, rewrites: 0, labels: 0 }, incomplete: false }));
    return m;
  };
  for (const { call, steps } of calls) {
    for (const s of steps) {
      const m = modelRow(s.model);
      m.micro += s.micro;
      m.calls += 1;
      m.segs[seriesOf(call)] += s.micro;
      if (!m.features.includes(call.feature)) m.features.push(call.feature);
    }
  }
  const labelRuns: LabelRun[] = [];
  const runsById = new Map<string, LabelRun>();
  let batchMicro = 0;
  let labelsIncomplete = false;
  for (const r of rows.labelRuns) {
    // `batchCostMicroUsd` prices a dated id on its base card and refuses a model it cannot price
    // from summed meters (no rate, or a rate step). Such a run is drawn as unpriced, never as $0.
    // Chunks still collecting have no usage yet, so a run with any is priced from the collected ones
    // and marked partial, and so is every total it reaches.
    const priced = r.collected === 0 ? 0 : batchPrice(r.model, r);
    const micro = priced ?? 0;
    const uncollected = r.batches - r.collected;
    const partial = priced === null || uncollected > 0;
    if (partial) labelsIncomplete = true;
    const m = modelRow(r.model);
    m.micro += micro;
    m.batches += r.batches;
    m.segs.labels += micro;
    if (partial) m.incomplete = true;
    batchMicro += micro;
    const run = runsById.get(r.runId);
    if (run) {
      run.batches = (run.batches ?? 0) + r.batches;
      run.micro += micro;
      if (priced === null) run.unpriced = true;
      if (uncollected > 0) run.uncollected = (run.uncollected ?? 0) + uncollected;
      if (r.firstAt < run.firstAt) run.firstAt = r.firstAt;
      if (r.collected > 0) run.tokens = { in: (run.tokens?.in ?? 0) + r.inTokens, out: (run.tokens?.out ?? 0) + r.outTokens };
    } else {
      const fresh: LabelRun = { runId: r.runId, firstAt: r.firstAt, source: "batches", batches: r.batches, tokens: r.collected > 0 ? { in: r.inTokens, out: r.outTokens } : null, micro, ...(priced === null ? { unpriced: true as const } : {}), ...(uncollected > 0 ? { uncollected } : {}) };
      runsById.set(r.runId, fresh);
      labelRuns.push(fresh);
    }
  }
  // The manual collector (`scripts/label-cards-collect.mts`) writes one `model_calls` labels row per
  // model per run, keyed `labels:<runId>:<model>`, once every batch of the run has ended, and never a
  // batch row: the two writers are disjoint, so both are listed and summed (admin audit findings 3 and 8).
  for (const c of rows.calls) {
    if (c.feature === "labels" && c.micro !== null) labelRuns.push({ runId: null, firstAt: c.createdAt, source: "collector", batches: null, tokens: null, micro: c.micro });
  }
  labelRuns.sort((a, b) => a.firstAt.getTime() - b.firstAt.getTime());

  const series: Series = { player: 0, rewrites: 0, labels: batchMicro, evals: 0 };
  let labelCallsMicro = 0;
  for (const c of rows.calls) {
    if (c.micro === null) continue;
    series[seriesOf(c)] += c.micro;
    if (seriesOf(c) === "labels") labelCallsMicro += c.micro;
  }
  const ledgers = rows.ledgers.map((l) => ledgerRow(l, month));
  // Evals in the month, netted as `spent()` nets them: settled, plus every worst case still open.
  series.evals = ledgers.reduce((n, l) => n + l.settledMicro + l.pendingMicro, 0);

  // By feature and model: one row per feature, origin, step, model and effort.
  const byKey = new Map<string, { row: FeatureRow; costs: number[] }>();
  for (const { call, steps } of calls) {
    for (const s of steps) {
      const key = [call.feature, call.origin, s.step, s.model, s.recorded ? s.effort ?? "" : "-"].join("|");
      let f = byKey.get(key);
      if (!f) byKey.set(key, (f = { row: { feature: call.feature, origin: call.origin, step: s.step, model: s.model, effort: s.effort, runs: 0, micro: 0, meanMicro: 0, p90Micro: null }, costs: [] }));
      f.costs.push(s.micro);
    }
  }
  const features = [...byKey.values()]
    .map(({ row, costs }) => ({
      ...row,
      runs: costs.length,
      micro: costs.reduce((a, b) => a + b, 0),
      meanMicro: mean(costs) ?? 0,
      p90Micro: costs.length >= P90_MIN_RUNS ? percentileCont(costs, 0.9) : null,
    }))
    .sort((a, b) => b.micro - a.micro || a.feature.localeCompare(b.feature));

  const player = rows.calls.filter((c) => c.origin === "player");
  const refunded = player.filter((c) => c.status === "refunded");
  const refundByFeature = new Map<string, { feature: string; runs: number; micro: number }>();
  for (const c of refunded) {
    const f = refundByFeature.get(c.feature) ?? { feature: c.feature, runs: 0, micro: 0 };
    f.runs += 1;
    f.micro += c.micro ?? 0;
    refundByFeature.set(c.feature, f);
  }

  const reserved = RESERVED_FEATURES.map((feature) => {
    const pressed = player.filter((c) => c.feature === feature);
    const priced = pressed.flatMap((c) => (c.micro === null ? [] : [c.micro]));
    return { feature, reservedMicro: featureWorstCaseMicroUsd(feature), meanMicro: mean(priced), runs: pressed.length };
  });

  const accounts = new Map<string, { userId: string; presses: number; credits: number; micro: number }>();
  for (const c of player) {
    const a = accounts.get(c.userId) ?? { userId: c.userId, presses: 0, credits: 0, micro: 0 };
    a.presses += 1;
    if (c.status === "spent") a.credits += 1;
    a.micro += c.micro ?? 0;
    accounts.set(c.userId, a);
  }

  const modelList = [...models.values()].sort((a, b) => b.micro - a.micro || a.model.localeCompare(b.model));
  return {
    series,
    labelCallsMicro,
    labelsIncomplete,
    models: modelList,
    modelsTotal: modelList.reduce((n, m) => n + m.micro, 0) + series.evals,
    features,
    runs: calls.length,
    callsMicro: calls.reduce((n, c) => n + (c.call.micro ?? 0), 0),
    refunds: {
      runs: refunded.length,
      micro: refunded.reduce((n, c) => n + (c.micro ?? 0), 0),
      byFeature: [...refundByFeature.values()].sort((a, b) => b.micro - a.micro),
    },
    reserved,
    accounts: [...accounts.values()].sort((a, b) => b.micro - a.micro || a.userId.localeCompare(b.userId)),
    labelRuns,
    ledgers: ledgers.sort((a, b) => b.settledMicro + b.pendingMicro - (a.settledMicro + a.pendingMicro) || (b.lastAt ?? "").localeCompare(a.lastAt ?? "")),
  };
}

/** `ledger-help-me-choose.jsonl` reads `Help me choose`; the original campaign's `ledger.jsonl` has no name of its own. */
export function ledgerName(file: string, original: string): string {
  const m = /^ledger-(.+)\.jsonl$/.exec(file);
  if (!m) return original;
  const words = m[1].replace(/-/g, " ");
  return words[0].toUpperCase() + words.slice(1);
}

/** A model as the tables print it: the vendor prefix dropped, a composite's halves likewise. */
export const shortModel = (model: string) => model.split("+").map((m) => m.replace(/^claude-/, "")).join("+");
