"use server";

import { requireUserId } from "../../../lib/auth";
import { scoreOneCommander } from "../../../lib/recs/recommend";
import { findScoredCommander } from "../../../lib/recs/store";
import type { RoleCard, RoleName } from "../../../lib/recs/score";

/** A1: one retry for the whole section. Re-resolves EDHREC and hands back only
    the role cards — the four panels read one payload, so there is one action,
    not one per panel. Null means it failed again and the note stays put. */
export async function retryCoverageFigures(
  slug: string,
): Promise<Record<RoleName, RoleCard[]> | null> {
  const userId = await requireUserId();

  // Resolve the commander using the same two-step path as the page.
  const found = await findScoredCommander(userId, slug);
  if (!found) return null;

  const scored = await scoreOneCommander(userId, found.oracleId, slug);
  if (!scored) return null;

  // Return only roleCards — the section owns the state update.
  if (scored.synergyState === "degraded") return null;

  return scored.roleCards;
}
