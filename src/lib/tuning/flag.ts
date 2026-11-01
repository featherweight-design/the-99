/**
 * RETIRED (Hugh 2026-11-01): nothing gates on this any more. Suggested changes (the empty state's
 * Analyze-time description field, the limits box, Additional notes, and the server actions that run
 * and act on a suggestion) followed its parent, the Analysis tab, whose switch is retired too, so it is always on.
 * Its runs still reserve through `reserveModelCall`, so the model-call kill
 * switch stops them. Only the admin registry reads this, until the switch is deleted, and it reads its own
 * variable alone: it once also needed `ANALYSIS_TAB_ENABLED`, retired too, so the admin names no parent for it.
 */
export function tuningEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.TUNING_ENABLED === "true";
}

/**
 * Whether a Suggested changes press may take the v2 run (plan 2026-10-27, P5, approved by Hugh): the count, the
 * request box, line-by-line saves and `suggested_changes_v2`'s own credit. Off, a v2 request is refused before
 * anything is reserved and the panel is v10 as shipped. OFF for anything but the exact string `'true'`. It needs
 * nothing else: the Analysis tab, where Suggested changes mounts, is always drawn (its switch and Suggested changes'
 * are retired). Staging on, production unset; the switch is REMOVED once v2 is everywhere.
 */
export function suggestedChangesV2Enabled(env: NodeJS.ProcessEnv): boolean {
  return env.SUGGESTED_CHANGES_V2_ENABLED === "true";
}

/**
 * RETIRED (Hugh 2026-10-31): nothing gates on this any more. Proposed cuts (its panel, and the
 * model pass behind Look deeper on a deck over 100) followed its parent, the Analysis tab, whose switch
 * is retired too, so it is always on. Only the admin registry reads this, until the
 * switch is deleted, and it reads its own variable alone: it once also needed
 * `ANALYSIS_TAB_ENABLED`, retired too, so the admin names no parent for it.
 */
export function proposedCutsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PROPOSED_CUTS_ENABLED === "true";
}

/** A Tuning tool the hub can draw a tile for, in the hub's fixed order. */
export type HubTool = "suggested" | "mana" | "cuts";

/**
 * The tools the Tuning hub draws, in its fixed order. None has a switch of its own (Suggested changes'
 * retired 2026-11-01, Proposed cuts' 2026-10-31, the hub's never existed: orchestrator, 2026-10-11), and
 * the Analysis tab's is retired too (2026-11-01), so all three are always tools, and the hub (the `Tuning` section with
 * a tile per tool, the tools opening in place, and the trim line's `Proposed cuts →`) always draws.
 */
export const HUB_TOOLS: readonly HubTool[] = ["suggested", "mana", "cuts"];
