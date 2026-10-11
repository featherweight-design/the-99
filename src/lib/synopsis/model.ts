/**
 * Contract 7's model and effort, unchanged: what production runs while `OVERVIEW_V2_ENABLED` is
 * off. Contract 7 was never measured on Sonnet 5.5, so the switch below is tied to the contracts it
 * was measured on, and merging it changes no production Overview until the v2 switch flips
 * (decided 2026-10-11).
 */
export const SYNOPSIS_MODEL_V7 = "claude-sonnet-5";
export const SYNOPSIS_EFFORT_V7 = "low" as const;

/**
 * The model the v2 contracts (11 and 12) are written by (lane brief, "Model"). A named constant and nothing more:
 * the eval harness (sub-project 10) may change it before launch, so no code branches on its value.
 * Every run stores the model it used, so a change is visible in the outcomes it produces.
 */
export const SYNOPSIS_MODEL = "claude-sonnet-5-5";

/**
 * The reasoning effort it is asked for, set explicitly. Sonnet 5 at `low` was the ruling of
 * 2026-09-24 (full Sonnet 5 with adaptive thinking truncated or timed out a third of its answers).
 *
 * Sonnet 5.5 at `medium` from 2026-10-11 (Hugh), measured on the eight staging decks of the Overview
 * corpus, one answer each, under the plans-first prompt: $0.051 an answer, a median of 12s (36s at
 * most), and no failed or truncated reply in 25 answers across four runs, against Sonnet 5 at `low` at $0.060, a
 * median of 24s and one deck failing twice on the reply's shape. On the seven decks both
 * runs answered (`docs/superpowers/eval/metrics-plan-first-*.md`) it named more key cards (16/58
 * against 9/58) and weaknesses (7/22 against 6/22) and led more strategies with the primary plan
 * (3/7 against 2/7), tied on mulligans (1/5) and primary plans (7/7), and named one combo fewer
 * (1/4 against 2/4: Gishath's). One answer each, so a single combo is within noise; the switch rests
 * on the cost, the speed and the failures. The ceiling it needs is
 * `SYNOPSIS_MAX_TOKENS_V8`, and the request streams.
 */
export const SYNOPSIS_EFFORT = "medium" as const;
