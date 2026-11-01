import { SWITCH_FLAGS } from "../switches/flags";
import type { SwitchName } from "../switches/registry";
import { MOMENTS, type MomentId } from "./registry";

/**
 * The moments this reader may be shown: every one whose tool switch is on. Resolved from the reader's own env (`requestSwitchEnv`), so a moment follows its tool exactly as the screen
 * that draws the tool does. Server-side by its imports.
 */
export function liveMoments(env: NodeJS.ProcessEnv): MomentId[] {
  // Widened: no moment has a tool switch today (the last, the Analysis tab's, retired 2026-11-01), and the literal
  // registry would narrow every `tool` to null.
  return MOMENTS.filter((m) => {
    const tool = m.tool as SwitchName | null;
    return tool === null || SWITCH_FLAGS[tool](env);
  }).map((m) => m.id);
}
