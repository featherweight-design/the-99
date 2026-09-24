/**
 * The model the synopsis is written by (lane brief, "Model"). A named constant and nothing more:
 * the eval harness (sub-project 10) may change it before launch, so no code branches on its value.
 * Every run stores the model it used, so a change is visible in the outcomes it produces.
 */
export const SYNOPSIS_MODEL = "claude-sonnet-5";
