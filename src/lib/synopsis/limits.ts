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
// 2: the Mulligan's figures gained the send-back bounds and the commanders' mana values.
// 3: contract A (Hugh, 2026-09-24): a list section drops a failing line and renders when its
//    minimum survives; prose still fails whole.
// 4: contract B: one automatic repair of the refused sections, in the same write.
// 5: Hugh's rating (2026-09-24): a universal staple is never a Key card, and the deck's colors
//    are named (Gruul), never written as mana letters.
// 6: the Mulligan's land range is a fixed line the model does not write; a generated line may not
//    state a land count, hold the commander in hand, or open with its heading's word.
// 7: the Mulligan's budget restated in the prompt (eval harness, primer-budget-c): all four
//    sections rendered on 100% of held-out answers, against 89% on 6. The validator is unchanged.
export const SYNOPSIS_CONTRACT_VERSION = 7;
// 8: the v2 method (plan 2026-10-10-overview-accuracy.md): a weakness checklist with tiers and
//    evidence refs on every claim. Written only while `OVERVIEW_V2_ENABLED` is on.
export const SYNOPSIS_CONTRACT_VERSION_V2 = 8;

/** The contract a write is made under: 8 while the v2 method is on, 7 otherwise. */
export function synopsisContractVersion(v2: boolean): number {
  return v2 ? SYNOPSIS_CONTRACT_VERSION_V2 : SYNOPSIS_CONTRACT_VERSION;
}

/** The most cards one claim's evidence may cite (contract 8). */
export const EVIDENCE_MAX = 4;

/** A pending run older than this was abandoned; the read-time reaper fails it as `interrupted`
 *  and refunds its unit. Below `RESERVATION_TTL_MS`, so the reap always lands while the unit
 *  is still reserved and can be refunded rather than silently expiring. */
export const SYNOPSIS_REAPER_CUTOFF_MS = 5 * 60 * 1000;
if (SYNOPSIS_REAPER_CUTOFF_MS >= RESERVATION_TTL_MS) {
  throw new Error("SYNOPSIS_REAPER_CUTOFF_MS must be below RESERVATION_TTL_MS");
}

/**
 * One budget across the client's two attempts. 110s, as tuning's (#902). It was sized when the
 * synopsis ran adaptive thinking at an 8,000-token ceiling (83-100s with the in-deadline retry);
 * at `effort: "low"` and 3,000 tokens a call runs far shorter, and the budget is kept so the
 * repair call (contract B) shares it. The action runs from the deck page, whose `maxDuration`
 * (120s, set by tuning D1) must stay above this or the platform kills the call before it can refund.
 */
export const SYNOPSIS_DEADLINE_MS = 110_000;

/**
 * The least of that budget worth sending the repair with (contract B). The measured repair runs
 * about 18s at the median (eval harness, 2026-09-24); one sent with less than this would mostly
 * time out, and a timed-out call is still billed. Below it the first answer stands as checked.
 */
export const SYNOPSIS_REPAIR_MIN_MS = 30_000;
/**
 * The answer's worst case, from the contract's own counts and budgets (below), since a reply past
 * them is refused anyway. At every section's maximum: overview 576, strategy 5 × 144, mulligan
 * 6 × 80, tips 4 × 176 plus their card lists, key cards 8 × 60 plus names and claims, weaknesses
 * 3 × 176. About 4,700 characters of text and 1,000 more of names, marks and JSON keys: roughly
 * 1,500 tokens, rounded up to 2,000.
 */
export const SYNOPSIS_ANSWER_TOKENS_WORST_CASE = 2_000;

/**
 * Room for the model's reasoning at `effort: "low"` (`SYNOPSIS_EFFORT`), which counts inside
 * `max_tokens`. Full Sonnet with adaptive thinking is NOT viable here: at an 8,000-token ceiling
 * it truncated or timed out a third of its answers (eval harness, 2026-09-24).
 */
export const SYNOPSIS_REASONING_HEADROOM_TOKENS = 1_000;

/**
 * The most output any measured answer used: sonnet-low's maximum over 176 answers (eval harness,
 * 2026-09-24). The ceiling must hold it, or a reply the harness accepted is cut off here.
 */
export const SYNOPSIS_OBSERVED_MAX_OUTPUT_TOKENS = 2_240;

/**
 * The output ceiling (the-99-d9, relaying Hugh's ruling, 2026-09-24): the answer's worst case plus
 * the reasoning headroom, and above the measured maximum. `limits.test.ts` pins both.
 */
export const SYNOPSIS_MAX_TOKENS = 3_000;

/**
 * The contract-8 ceiling (plan 2026-10-10-overview-accuracy.md, section 6). The reply adds a
 * `{ text, evidence }` object to every line and a seven-topic checklist whose weakness lines are
 * written before the code cuts them to three: about 1,100 tokens over contract 7's worst case of
 * 2,000, plus the same 1,000 of reasoning headroom, rounded up to the 4,500 the plan's cost
 * ceiling was priced at. The spend guard's worst case is computed from this figure.
 */
export const SYNOPSIS_MAX_TOKENS_V8 = 4_500;

/**
 * Counts per section (`SYNOPSIS-modal.md` §4.2). Checked by the validator, never by the schema:
 * a count out of range is a REFUSED section with a reason the player is shown, not a malformed
 * reply that is silently retried.
 */
export const SECTION_COUNTS = {
  strategy: { min: 3, max: 5 },
  // 1-2 since the land range became a fixed line (Hugh, 2026-09-24): each generated line says
  // something the range cannot, so fewer of them.
  keep: { min: 1, max: 2 },
  sendBack: { min: 1, max: 2 },
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
