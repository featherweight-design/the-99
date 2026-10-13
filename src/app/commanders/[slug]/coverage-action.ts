"use server";

import { requireUserId } from "../../../lib/auth";
import { scoreOneCommander } from "../../../lib/recs/recommend";
import { resolveCommanderSlug } from "../../../lib/discovery/resolve-slug";
import { loadFreePool } from "../../../lib/recs/free-ranking";
import type { RoleCard, RoleName } from "../../../lib/recs/score";
import { loadAvailability } from "../../../lib/decks/availability-query";
import { withAvailability } from "../../../lib/decks/availability";
import { resolveOwnedPrintings } from "../../../lib/collection/owned-printings";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { envForPageBasis, parseRoleBasis } from "../../../lib/decks/label-counts-flag";

/** A1: one retry for the whole section. Re-resolves EDHREC and hands back only
    the role cards — the four panels read one payload, so there is one action,
    not one per panel. Null means it failed again and the note stays put. */
export async function retryCoverageFigures(
  slug: string,
  /**
   * The mode the page is drawing, carried from the URL the reader is on.
   *
   * WITHOUT IT THE RETRY CHANGES THE POOL. `/commanders/[slug]?avail=free` scores
   * against the free pool — the cards no committed deck is holding — and this
   * action scored against everything owned, because it passed no pool at all. So
   * a successful retry in free mode handed back cards the free list deliberately
   * excludes, and Role Coverage silently became the all-owned panel while the URL
   * still said free.
   *
   * REQUIRED, with no default. A default is what let this break in the first
   * place — the action scored against the collection because nothing made it
   * say otherwise — and `CoverageSectionProps.avail` is required, so a default
   * here would leave the chain required at one link and defaultable at the
   * other. A future `retryCoverageFigures(slug)` should be a type error, not a
   * silent all-owned panel behind a free URL.
   */
  avail: "all" | "free",
  /**
   * The role basis the open page's score was counted by (`CommanderDetailScore.roleBasis`). The
   * retry's role cards replace the panel's beside counts the page already drew, so they must be
   * counted the same way, whatever the switch reads now: re-resolving would hand back the other
   * basis's cards after an app-wide flip (admin PR 6d-2). Parsed to the closed set, since an action's
   * arguments are the client's to send; anything else is refused.
   */
  roleBasis: unknown,
): Promise<Record<RoleName, RoleCard[]> | null> {
  const userId = await requireUserId();
  const basis = parseRoleBasis(roleBasis);
  if (basis === null) return null;
  // The reader's resolved switches with the role basis set to the page's. Null is a labels page that
  // outlived the environment's kill switch: nothing comes back, the note stays and the page's own
  // next read draws the classifier's figures, never this retry.
  const env = envForPageBasis(await requestSwitchEnv(userId), basis);
  if (env === null) return null;

  // The same resolver the page uses, so the retry reaches the commander the
  // page rendered. Resolving through the store alone would no-op on every
  // discovery page, which is exactly where a degraded EDHREC is retried.
  const found = await resolveCommanderSlug(userId, slug, env);
  if (!found) return null;

  // The same pool the page scored with — and it is NOT free to ask for.
  //
  // `loadFreePool` is `cache()`d, but `cache()` is per-REQUEST and a Server
  // Action runs in its own POST: nothing the page's render memoised is reachable
  // from here. So a free-mode retry pays a full `loadAvailability` rollup over
  // the whole collection for the pool, on top of the narrowed one below for the
  // re-stamp. An earlier version of this comment claimed it was a map read; it
  // is not, and the difference is the most expensive query on this path.
  //
  // Accepted rather than optimised: a retry is rare and user-initiated — it
  // exists for a degraded EDHREC — and the alternative is handing back cards
  // scored against a pool the reader did not ask for, which is the defect this
  // fixes.
  //
  // A FAILED POOL READ ABANDONS THE RETRY. It does not fall through to the
  // collection, which is what an earlier revision did by passing `?? undefined`:
  // `scoreOneCommander` reads undefined as "score against everything owned", so a
  // transient read failure handed back the all-owned panel while the mounted
  // section still had `avail === "free"`. The section REPLACES its client-owned
  // `roleCards` with whatever comes back and `router.refresh()` preserves client
  // state, so those cards then stayed on screen under a free URL — the very
  // defect this action's `avail` parameter exists to prevent, reached through the
  // outage path instead of the missing-parameter one.
  //
  // The page may fall back that way on FIRST RENDER, where there is nothing to
  // lose and the mode is settled in the same pass. A retry is not that: the
  // reader is already looking at free mode, and a no-op leaves the note in place
  // with the button ready for another press. Same ruling, and for the same
  // reason, as the availability re-stamp below.
  let pool: NonNullable<Awaited<ReturnType<typeof loadFreePool>>> | undefined;
  if (avail === "free") {
    const free = await loadFreePool(userId);
    if (!free) return null;
    pool = free;
  }

  const scored = await scoreOneCommander(userId, found.oracleId, slug, pool, env);
  if (!scored) return null;
  // Counted by another basis than the page's: the label read failed just now. Its cards would sit
  // beside the page's label counts, so nothing comes back, as for a still-degraded retry.
  if (scored.roleBasis !== basis) return null;

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
  //
  // The ART is re-stamped for the same reason: the page gives every role card the art of the copy
  // the reader owns, and the bare scored cards carry none, so a successful retry would blank the
  // neighbor plates until a read-ahead filled them. Fail-soft, unlike the claim read: a missing
  // picture is what the plates drew before, and no reason to throw recovered figures away.
  const ids = [...new Set(roleCardIds)];
  const [availability, ownedArt] = await Promise.all([
    loadAvailability(userId, { oracleIds: ids, env }),
    resolveOwnedPrintings(userId, ids),
  ]);

  return Object.fromEntries(
    Object.entries(scored.roleCards).map(([role, cards]) => [
      role,
      withAvailability(cards, availability).map((c) => ({
        ...c,
        imageUri: ownedArt.get(c.oracleId)?.imageUri ?? null,
        printedName: ownedArt.get(c.oracleId)?.printedName ?? null,
      })),
    ]),
  ) as Record<RoleName, RoleCard[]>;
}
