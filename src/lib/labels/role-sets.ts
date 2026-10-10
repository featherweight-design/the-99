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
 * - `counterspell` is its own label role and is NOT removal (Hugh, 2026-10-10: removal destroys or
 *   exiles a card already on the battlefield).
 * - A draw job whose `affects` is `opponents` is not the deck's draw (Thought-Knot Seer), unless the
 *   text lets the controller be the target.
 * - A card with no fresh label is ABSENT from the map, and counts toward no role. That is the
 *   Jobs card's rule, and it is what a deck's own count does with the same card.
 */
export const LABEL_TARGET_ROLES = ["ramp", "draw", "removal", "wipes"] as const;
export type LabelTargetRole = (typeof LABEL_TARGET_ROLES)[number];

/** Puts a land onto the battlefield, as opposed to into the hand (Expedition Map, Sylvan Scrying). */
const LAND_TO_BATTLEFIELD = /\b(?:search|lands?|forest|plains|island|swamp|mountain)\b[^.\n]*\bonto the battlefield/i;
/** A discount on the spells the controller casts, as opposed to one on the card itself or on an
 *  ability (Metalwork Colossus, Bruenor, Zirda). */
const DISCOUNTS_YOUR_SPELLS = /\bspells?\b[^.\n]{0,40}\b(?:you cast|cost)\b[^.\n]*\bless\b/i;
/** Not a discount for the controller: a tax, an opponent's spells, or an alternative cost (Fist of Suns). */
const NOT_A_DISCOUNT = /\b(?:opponents?|rather than pay)\b/i;
/** A limit the label stores as `restrictedTo: null` because the type is chosen or imprinted at play (Cloud Key, Semblance Anvil). */
const CHOSEN_LIMIT = /\b(?:chosen|exiled card|imprint)\b/i;

/** The card's own discount sentence ("This spell costs {1} less for each spell you cast this turn."). */
const OWN_COST_SENTENCE = /^(?:this|~)\b[^\n]*\bcosts?\b[^\n]*$/gim;

/**
 * Whether a ramp job is ramp for the deck's count (check `labels-accuracy-check-2026-10-10`):
 * a land fetched into the HAND is not mana ahead of curve, and a discount is ramp only when it
 * is on the controller's spells in general, not on one type of them (`restrictedTo`) and not on
 * the card itself or an ability. A text rule is applied only when the text is known, and `land`
 * on a nonland (Ebony Fly, Planar Atlas) is a label error that waits for a relabel.
 */
function isRampJob(job: Job, oracleText: string | null | undefined): boolean {
  if (job.kind !== "ramp") return false;
  if (job.rampKind === "fetchesLand") return oracleText == null || LAND_TO_BATTLEFIELD.test(oracleText);
  if (job.rampKind === "costReduction") {
    if (job.restrictedTo != null) return false;
    if (oracleText == null) return true;
    const text = oracleText.replace(OWN_COST_SENTENCE, "");
    return DISCOUNTS_YOUR_SPELLS.test(text) && !CHOSEN_LIMIT.test(text) && !NOT_A_DISCOUNT.test(text);
  }
  return true;
}

/** "Target player draws" may be aimed at the controller, and the label calls it `opponents`
 *  (Deep Analysis, Pact of the Serpent), where Thought-Knot Seer's opponent draws and nobody else can. */
const TARGET_PLAYER_DRAWS = /\btarget player draws\b/i;

/** A draw job counts for the deck's draw only when it can draw for the controller. */
function isDrawJob(job: Job, oracleText: string | null | undefined): boolean {
  if (job.kind !== "draw") return false;
  return job.affects !== "opponents" || (oracleText != null && TARGET_PLAYER_DRAWS.test(oracleText));
}

export function labelRoleSet(jobs: readonly Job[], typeLine: string, oracleText?: string | null): LabelTargetRole[] {
  if (isLandFace(typeLine)) return [];
  const role = jobs.filter((j) => j.space === "role");
  const has: Record<LabelTargetRole, boolean> = {
    ramp: role.some((j) => isRampJob(j, oracleText)),
    draw: role.some((j) => isDrawJob(j, oracleText)),
    removal: role.some((j) => j.kind === "removal"),
    wipes: role.some((j) => j.kind === "wipes"),
  };
  return LABEL_TARGET_ROLES.filter((r) => has[r]);
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
