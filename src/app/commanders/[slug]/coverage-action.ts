"use server";

import { requireUserId } from "../../../lib/auth";
import { scoreOneCommander } from "../../../lib/recs/recommend";
import { resolveCommanderSlug } from "../../../lib/discovery/resolve-slug";
import type { RoleCard, RoleName } from "../../../lib/recs/score";

/** A1: one retry for the whole section. Re-resolves EDHREC and hands back only
    the role cards — the four panels read one payload, so there is one action,
    not one per panel. Null means it failed again and the note stays put. */
export async function retryCoverageFigures(
  slug: string,
): Promise<Record<RoleName, RoleCard[]> | null> {
  const userId = await requireUserId();

  // The same resolver the page uses, so the retry reaches the commander the
  // page rendered. Resolving through the store alone would no-op on every
  // discovery page, which is exactly where a degraded EDHREC is retried.
  const found = await resolveCommanderSlug(userId, slug);
  if (!found) return null;

  const scored = await scoreOneCommander(userId, found.oracleId, slug);
  if (!scored) return null;

  // Return only roleCards — the section owns the state update.
  //
  // Only "ok" carries figures. A retry that comes back "absent" has reached
  // EDHREC and been told there is nothing for this commander, which is a
  // different answer from "degraded" and not a better one: handing the section
  // role cards would flip it to the ok treatment and draw figures for a
  // commander EDHREC has no data on. Both non-ok states leave the note in place.
  if (scored.synergyState !== "ok") return null;

  return scored.roleCards;
}
