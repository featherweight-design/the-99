import { createHash } from "node:crypto";
import { isLandFace } from "../cards/facet";
import type { Job } from "./types";

/**
 * The four roles a deck is counted and targeted on, read from a card's labels rather than its
 * text (plan `2026-10-10-labels-everywhere.md`). One rule for the deck's count and for the index's
 * targets, so the two can never disagree about what a card is:
 *
 * - A LAND FACE COUNTS TOWARD NONE OF THE FOUR. Labels call 163 lands ramp (fetch lands, Exotic
 *   Orchard); the deck counts a land as a land, as the Jobs card already does.
 * - `counterspell` is its own label role and is NOT removal.
 * - A card with no fresh label is ABSENT from the map, and counts toward no role. That is the
 *   Jobs card's rule, and it is what a deck's own count does with the same card.
 */
export const LABEL_TARGET_ROLES = ["ramp", "draw", "removal", "wipes"] as const;
export type LabelTargetRole = (typeof LABEL_TARGET_ROLES)[number];

export function labelRoleSet(jobs: readonly Job[], typeLine: string): LabelTargetRole[] {
  if (isLandFace(typeLine)) return [];
  return LABEL_TARGET_ROLES.filter((role) => jobs.some((j) => j.space === "role" && j.kind === role));
}

/**
 * A digest of the roles a derivation USED, over the cards it read: each card's role set, or `?` for
 * a card with no fresh label. It hashes the OUTPUT rather than each label's `input_hash`, because a
 * `list:` relabel can replace a row's jobs under the same model, prompt version and card text, which
 * leaves the input hash where it was while the roles move.
 *
 * Sorted, so the same facts give the same digest whatever order they were read in.
 */
export function roleSetFingerprint(
  oracleIds: Iterable<string>,
  sets: ReadonlyMap<string, readonly LabelTargetRole[]>,
): string {
  const lines = [...new Set(oracleIds)].sort().map((id) => {
    const roles = sets.get(id);
    return `${id}=${roles ? [...roles].sort().join("+") : "?"}`;
  });
  return createHash("md5").update(lines.join("\n")).digest("hex");
}
