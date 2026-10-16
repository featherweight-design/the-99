import { SWITCH_FLAGS } from "../switches/flags";
import { MOMENTS, type MomentId } from "./registry";
import { momentsEnabled } from "./flag";

/**
 * The moments this reader may be shown: every one whose tool switch is on, or none at all with `MOMENTS_ENABLED`
 * off. Resolved from the reader's own env (`requestSwitchEnv`), so a moment follows its tool exactly as the screen
 * that draws the tool does. Server-side by its imports.
 */
export function liveMoments(env: NodeJS.ProcessEnv): MomentId[] {
  if (!momentsEnabled(env)) return [];
  return MOMENTS.filter((m) => m.tool === null || SWITCH_FLAGS[m.tool](env)).map((m) => m.id);
}
