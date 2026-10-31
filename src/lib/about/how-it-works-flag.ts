/**
 * RETIRED (always on, Hugh 2026-10-31): no surface reads this any more. The appendix, the method tags
 * and the id a visit records draw for every reader. Nothing reads it; it goes when the
 * switch itself is deleted with the rest of group 3.
 */
export function howItWorksEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.HOW_IT_WORKS_ENABLED === "true";
}
