import type { SwitchName } from "../switches/registry";

/**
 * The fifteen moments (discovery R1, plan `2026-10-16-moments.md`), in the FIXED ORDER that breaks a tie: the order a
 * deck is made (handoff README, Q2). M16, the Friends Home card, is not a moment (Hugh, 2026-10-16): Home gets a
 * permanent Friends section instead, in a PR of its own. `tool` is the switch the moment's tool lives behind, or null
 * for a surface that has none (Top off, Card assignments; the friends moments since `SOCIAL_FRIENDS_ENABLED` retired):
 * off for a reader, the moment is absent. `after` names a moment that must be spent first, which is how Mana Balance
 * always takes a later visit than Suggested changes.
 *
 * Client-safe: a type import only.
 */
export const MOMENTS = [
  { id: "precons", m: "M14", tool: null },
  { id: "help-me-choose", m: "M12", tool: "HELP_ME_CHOOSE_ENABLED" },
  { id: "top-off", m: "M1", tool: null },
  { id: "proposed-cuts", m: "M3", tool: "PROPOSED_CUTS_ENABLED" },
  { id: "suggested-changes", m: "M2", tool: "TUNING_ENABLED" },
  { id: "mana-balance", m: "M4", tool: "ANALYSIS_TAB_ENABLED", after: "suggested-changes" },
  { id: "card-assignments", m: "M7", tool: null },
  { id: "stand-ins", m: "M5", tool: "SWAP_TOOLS_ENABLED" },
  { id: "friend-spares", m: "M6", tool: null },
  { id: "find-a-deck", m: "M8", tool: "SWAP_TOOLS_ENABLED" },
  { id: "wishlist", m: "M9", tool: null },
  { id: "collection-sync", m: "M15", tool: null },
  { id: "lineup", m: "M13", tool: null },
  { id: "matchups", m: "M10", tool: null },
  { id: "friends-after-game", m: "M11", tool: null },
] as const satisfies readonly { id: string; m: string; tool: SwitchName | null; after?: string }[];

export type MomentId = (typeof MOMENTS)[number]["id"];

const RANK = new Map<string, number>(MOMENTS.map((m, i) => [m.id, i]));
const AFTER = new Map<string, string>(
  MOMENTS.flatMap((m) => ("after" in m ? [[m.id, m.after] as [string, string]] : [])),
);

export function isMomentId(v: unknown): v is MomentId {
  return typeof v === "string" && RANK.has(v);
}

/**
 * Which moment takes the visit, or none (STATES-moments, "A moment's life").
 *
 * - `onScreen`: the eligible anchors on screen when the tie window closed (the first one on screen, plus 600ms).
 * - `live`: the moments whose tool switch is on for this reader.
 * - `spent`: the reader's spent set, for good.
 * - `visitTaken`: this visit already showed a moment, on any screen, in any tab.
 *
 * One per visit; a spent moment never returns; a moment waiting on `after` is not yet eligible; and among what is left,
 * the fixed order decides. A loser is not spent.
 */
export function pickMoment(input: {
  onScreen: readonly string[];
  live: ReadonlySet<string>;
  spent: ReadonlySet<string>;
  visitTaken: boolean;
}): MomentId | null {
  if (input.visitTaken) return null;
  let best: MomentId | null = null;
  for (const id of input.onScreen) {
    if (!isMomentId(id) || !input.live.has(id) || input.spent.has(id)) continue;
    const after = AFTER.get(id);
    if (after !== undefined && !input.spent.has(after)) continue;
    if (best === null || RANK.get(id)! < RANK.get(best)!) best = id;
  }
  return best;
}
