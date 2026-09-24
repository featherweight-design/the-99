/**
 * The model the synopsis is written by (lane brief, "Model"). A named constant and nothing more:
 * the eval harness (sub-project 10) may change it before launch, so no code branches on its value.
 * Every run stores the model it used, so a change is visible in the outcomes it produces.
 */
export const SYNOPSIS_MODEL = "claude-sonnet-5";

/**
 * The reasoning effort it is asked for, set explicitly (Hugh's ruling, 2026-09-24). Contract A+B's
 * 96% was measured at `low`; full Sonnet with adaptive thinking truncated or timed out a third of
 * its answers, so this is the only setting measured to work rather than a preference.
 */
export const SYNOPSIS_EFFORT = "low" as const;
