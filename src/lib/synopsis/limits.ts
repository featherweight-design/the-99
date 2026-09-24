import { RESERVATION_TTL_MS } from "../model/allowance-rule";

/**
 * The synopsis contract's fixed values. Every one of them is part of what the contract version
 * covers: moving a count, a budget or a rule means bumping `SYNOPSIS_CONTRACT_VERSION`.
 *
 * A BUMP IS NOT AN EDIT (Hugh, ruling B, 2026-09-23). Reuse is keyed on the list fingerprint
 * alone, so a synopsis written under an older contract keeps showing until the player's next
 * edit, and only a write for a new list uses the new contract. The version is stored per run so
 * the eval harness can tell the contracts' outcomes apart.
 */
export const SYNOPSIS_CONTRACT_VERSION = 1;

/** A pending run older than this was abandoned; the read-time reaper fails it as `interrupted`
 *  and refunds its unit. Below `RESERVATION_TTL_MS`, so the reap always lands while the unit
 *  is still reserved and can be refunded rather than silently expiring. */
export const SYNOPSIS_REAPER_CUTOFF_MS = 5 * 60 * 1000;
if (SYNOPSIS_REAPER_CUTOFF_MS >= RESERVATION_TTL_MS) {
  throw new Error("SYNOPSIS_REAPER_CUTOFF_MS must be below RESERVATION_TTL_MS");
}

/** One budget across the client's two attempts. */
export const SYNOPSIS_DEADLINE_MS = 90_000;
/** Room for every section at its maximum count and budget, with headroom for JSON. */
export const SYNOPSIS_MAX_TOKENS = 3_000;

/**
 * Counts per section (`SYNOPSIS-modal.md` §4.2). Checked by the validator, never by the schema:
 * a count out of range is a REFUSED section with a reason the player is shown, not a malformed
 * reply that is silently retried.
 */
export const SECTION_COUNTS = {
  strategy: { min: 3, max: 5 },
  keep: { min: 2, max: 3 },
  sendBack: { min: 2, max: 3 },
  tips: { min: 2, max: 4 },
  keyCards: { min: 5, max: 8 },
  weaknesses: { min: 1, max: 3 },
} as const;

/** A tip names at least this many cards, every one in the deck (brief §6). */
export const TIP_MIN_CARDS = 2;

/**
 * Character budgets, one per item, as a proxy for the LINE budgets Design set
 * (`SYNOPSIS-modal.md` §4.2), taking the tighter of the two widths. Counted over the text as it
 * RENDERS: a `[[Name]]` mark counts as its name.
 *
 * THE LINES ARE THE DESIGN VALUE and these are derived from them, never the other way round
 * (brief §4.2: a budget is not loosened to make generation pass). The derivation, per item:
 * - overview: ≤ 6 lines in the tab's two-thirds column at 1300 (~100 chars a line), ≤ 12 in the
 *   modal at 390 (~48) → 576;
 * - a strategy step: ≤ 2 lines at 1300 (~88 in the 700 modal), ≤ 3 at 390 → 144;
 * - a keep / send-back line: ≤ 2 lines in a half column at 1300 (~40), ≤ 2 at 390 → 80;
 * - a tip: ≤ 2 lines at 1300, ≤ 4 at 390 → 176;
 * - a key card's job: ≤ 1 line in its column at 1300 (~60), ≤ 2 at 390 → 60;
 * - a weakness: ≤ 2 lines at 1300, ≤ 4 at 390 → 176.
 * Characters per line are estimates from the measure; `probe:synopsis-ui` (PR 3) measures the
 * longest accepted text in each slot at both widths, and a figure it shows to be too loose is
 * TIGHTENED here with a contract bump.
 */
export const CHAR_BUDGETS = {
  overview: 576,
  strategy: 144,
  mulligan: 80,
  tip: 176,
  job: 60,
  weakness: 176,
} as const;
