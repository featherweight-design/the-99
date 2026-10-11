/**
 * The model the synopsis is written by (lane brief, "Model"). A named constant and nothing more:
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
 * median of 24s and one deck failing twice on the reply's shape. It matched or beat Sonnet 5 low on
 * every corpus check (`docs/superpowers/eval/metrics-plan-first-*.md`). The ceiling it needs is
 * `SYNOPSIS_MAX_TOKENS_V8`, and the request streams.
 */
export const SYNOPSIS_EFFORT = "medium" as const;
