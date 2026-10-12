/**
 * Each committed eval ledger's limits, keyed by its file under `docs/superpowers/eval/`. ONE
 * source: every eval script and probe that guards a ledger imports its numbers from here, so a
 * reader of this table (the admin's Costs page is the planned one) can never print a limit the
 * scripts stopped enforcing.
 *
 * `hardCapUsd` is the line a send is refused at. `askAtUsd` is where a script stops and asks
 * before spending more; null when that ledger's script has no ask line, only the hard cap.
 * Client-safe: plain data, no imports.
 */
export type LedgerLimits = { readonly hardCapUsd: number; readonly askAtUsd: number | null };

export const LEDGER_LIMITS = {
  /** The original campaign (`scripts/eval/lib/ledger.mts`, the lane brief). */
  "ledger.jsonl": { hardCapUsd: 25, askAtUsd: 15 },
  /** The Overview accuracy line (plan 2026-10-10, Hugh's $15 cap; `corpus.mts`). */
  "ledger-overview-accuracy.jsonl": { hardCapUsd: 15, askAtUsd: 11 },
  /** Tuning lists (Hugh 2026-10-10; `tuning-lists.mts`). */
  "ledger-tuning-lists.jsonl": { hardCapUsd: 3, askAtUsd: 2.5 },
  /** Cuts (`cuts-model.mts`, `cuts-blind.mts`). `cuts-plan.mts` keeps a per-task `--cap` of its own. */
  "ledger-cuts.jsonl": { hardCapUsd: 15, askAtUsd: 10 },
  /** Help me choose (`intake-read.mts`): a hard cap, no ask line. */
  "ledger-help-me-choose.jsonl": { hardCapUsd: 5, askAtUsd: null },
  /** Find a deck (`fits-read.mts`): a hard cap, no ask line. */
  "ledger-find-a-deck.jsonl": { hardCapUsd: 2, askAtUsd: null },
} as const satisfies Record<string, LedgerLimits>;

export type LedgerFileName = keyof typeof LEDGER_LIMITS;

/** A ledger file's limits, or null for a file no script guards by name. */
export function ledgerLimits(file: string): LedgerLimits | null {
  return Object.hasOwn(LEDGER_LIMITS, file) ? LEDGER_LIMITS[file as LedgerFileName] : null;
}
