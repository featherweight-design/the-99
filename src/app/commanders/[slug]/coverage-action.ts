"use server";

import { requireUserId } from "../../../lib/auth";
import { scoreOneCommander } from "../../../lib/recs/recommend";
import { resolveCommanderSlug } from "../../../lib/discovery/resolve-slug";
import type { RoleCard, RoleName } from "../../../lib/recs/score";
import { loadAvailability } from "../../../lib/decks/availability-query";
import { withAvailability } from "../../../lib/decks/availability";

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

  // RE-STAMP THE CLAIM PICTURE, and only now — after the guard above has decided
  // this payload is going back at all. Run before it, the read fired on every
  // still-degraded retry and threw its result away.
  //
  // `scoreOneCommander` leaves `availability` null on every card, exactly as it
  // leaves `committedTo` null, and the section REPLACES its client-owned state
  // with whatever this returns — so the bare scored cards erase every marker on
  // a SUCCESSFUL retry, flip the key to its free form, and make the Availability
  // sort read every recovered card as free. `router.refresh()` does not undo it.
  //
  // DELIBERATELY NOT CAUGHT, unlike the page's copy of this read. An empty map
  // is a safe fallback on first render, where there is nothing to lose; here it
  // would stamp every card null and destroy exactly the markers this re-stamp
  // exists to preserve. Letting it reject makes the whole retry a no-op —
  // `handleRetry` swallows it, the state stands, the note stays and the button
  // comes back — which is the right outcome: the figures are still there to
  // recover on the next press.
  const roleCardIds = Object.values(scored.roleCards)
    .flat()
    .map((c) => c.oracleId);
  const availability = await loadAvailability(userId, {
    oracleIds: [...new Set(roleCardIds)],
  });

  return Object.fromEntries(
    Object.entries(scored.roleCards).map(([role, cards]) => [
      role,
      withAvailability(cards, availability),
    ]),
  ) as Record<RoleName, RoleCard[]>;
}
