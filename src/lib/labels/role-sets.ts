import { createHash } from "node:crypto";
import { castFaceText, isLandFace } from "../cards/facet";
import { primaryRole } from "../recs/roles";
import type { Job } from "./types";

/**
 * The four roles a deck is counted and targeted on, read from a card's labels rather than its
 * text (plan `2026-10-10-labels-everywhere.md`). The deck strip's own membership rule (`jobRowsOf`,
 * `rolesOfCard`), restricted to the four, so the index's `label_*` targets and the deck's count read
 * a labelled card alike (role-targets follow-up 1 of #2705, 2026-11-08). The pool readers' fallback for
 * an unlabeled card (`rolesByLabelElseText`, the fill's `rolesWithLabels`) follows in the companion PR
 * (role-targets PR 3); until it lands they still count such a card in every classifier role:
 *
 * - A LAND FACE COUNTS TOWARD NONE OF THE FOUR. Labels call 163 lands ramp (fetch lands, Exotic
 *   Orchard); the deck counts a land as a land, as the Jobs card already does.
 * - A nonland card is EVERY role its label names: any `role` job of kind ramp, draw, removal or
 *   wipes. A land fetched into the hand, a typed discount and an opponent's draw count, as they do
 *   on the strip; the text refinements that once narrowed ramp and draw here (`isRampJob`,
 *   `isDrawJob`) are the benchmarks' weights now, not the role rule.
 * - `counterspell` is its own label role and is NOT removal (Hugh, 2026-10-10: removal destroys or
 *   exiles a card already on the battlefield).
 * - A card with no fresh label is ABSENT from the map. The index build counts it by the classifier's
 *   single role off its front face (`fallbackRole`, read by `labelElsePrimaryRoles` in
 *   `edhrec/role-targets.ts`), as the strip and the profile do (the pool readers follow in role-targets
 *   PR 3), and the fingerprint below hashes it by that role (`?ramp`, or `?` for none).
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
 * A BENCHMARK WEIGHT, not the role rule: mana velocity (`benchmarks/velocity.ts`) asks which ramp
 * jobs put mana ahead of curve. The deck's count and the index's targets take every ramp job
 * (`labelRoleSet`). The rule, as measured (check `labels-accuracy-check-2026-10-10`):
 * a land fetched into the HAND is not mana ahead of curve, and a discount is ramp only when it
 * is on the controller's spells in general, not on one type of them (`restrictedTo`) and not on
 * the card itself or an ability. A text rule is applied only when the text is known, and `land`
 * on a nonland (Ebony Fly, Planar Atlas) is a label error that waits for a relabel.
 */
export function isRampJob(job: Job, oracleText: string | null | undefined): boolean {
  return job.kind === "ramp" && rampRejection(job, oracleText) === null;
}

/** Why `isRampJob` refuses a ramp job, or null when it counts: the ONE place the refinement is
 *  decided, so a ledger's reason is the predicate's own (a land fetch whose text puts no land onto
 *  the battlefield, a discount that is not on the controller's spells in general). */
export type RampRejection = "landNotOut" | "costReduction";

export function rampRejection(job: Extract<Job, { kind: "ramp" }>, oracleText: string | null | undefined): RampRejection | null {
  const kind = job.rampKind;
  switch (kind) {
    case "fetchesLand":
      return oracleText == null || LAND_TO_BATTLEFIELD.test(oracleText) ? null : "landNotOut";
    case "costReduction": {
      if (job.restrictedTo != null) return "costReduction";
      if (oracleText == null) return null;
      const text = oracleText.replace(OWN_COST_SENTENCE, "");
      return DISCOUNTS_YOUR_SPELLS.test(text) && !CHOSEN_LIMIT.test(text) && !NOT_A_DISCOUNT.test(text) ? null : "costReduction";
    }
    case "tapsForMana": case "makesTreasure": case "burstMana": case "extraLandDrop": case "multiplies": case null:
      return null;
    default: {
      // A new ramp kind fails to compile here, so its rule is decided before it ships; at run time
      // an unknown one counts, as every kind but these two always has.
      const unhandled: never = kind;
      void unhandled;
      return null;
    }
  }
}

/** "Target player draws" may be aimed at the controller, and the label calls it `opponents`
 *  (Deep Analysis, Pact of the Serpent), where Thought-Knot Seer's opponent draws and nobody else can. */
const TARGET_PLAYER_DRAWS = /\btarget player draws\b/i;

/** A BENCHMARK WEIGHT, not the role rule: card flow (`benchmarks/flow.ts`) counts a draw job only
 *  when it can draw for the controller. The deck's count and the index's targets take every draw job. */
export function isDrawJob(job: Job, oracleText: string | null | undefined): boolean {
  return job.kind === "draw" && drawRejection(job, oracleText) === null;
}

/** Why `isDrawJob` refuses a draw job, or null when it counts: only an opponent's draw is refused. */
export type DrawRejection = "otherPlayerDraws";

export function drawRejection(job: Extract<Job, { kind: "draw" }>, oracleText: string | null | undefined): DrawRejection | null {
  return job.affects !== "opponents" || (oracleText != null && TARGET_PLAYER_DRAWS.test(oracleText)) ? null : "otherPlayerDraws";
}

/** A fresh label's roles among the four: none for a land face, otherwise every role job the label
 *  names of the four kinds. The strip's own match (`jobRowsOf`: a row is a job of the row's space and
 *  kind, and each of the four is a `role` row keyed by its kind), computed for the four alone. */
export function labelRoleSet(jobs: readonly Job[], typeLine: string): LabelTargetRole[] {
  if (isLandFace(typeLine)) return [];
  return LABEL_TARGET_ROLES.filter((r) => jobs.some((j) => j.space === "role" && j.kind === r));
}

/** What a card with NO fresh label counts toward among the four: the classifier's single role
 *  (`primaryRole`) off its FRONT face (`castFaceText`), as the profile's `rolesFor` reads it, or null
 *  for a land or a card the classifier gives no role. The label targets count it this way, so the
 *  fingerprint hashes it this way. */
export function fallbackRole(card: { typeLine: string; oracleText: string | null; layout: string; keywords: readonly string[] }): LabelTargetRole | null {
  const role = primaryRole({ typeLine: card.typeLine, oracleText: castFaceText(card.oracleText, card.layout), keywords: [...card.keywords] });
  return (LABEL_TARGET_ROLES as readonly string[]).includes(role) ? (role as LabelTargetRole) : null;
}

/**
 * A digest of the roles a derivation USED, over the cards it read: each labelled card's role set, and
 * for a card with no fresh label `?` followed by the role the targets counted it toward
 * (`fallback`, from `fallbackRole`: `?ramp`, or `?` for none). So a card-text change that moves an
 * unlabeled card's role moves the digest, as it moves the `label_*` it counts toward, and an
 * unlabeled card still never reads as a labelled one. It hashes the OUTPUT rather than each label's `input_hash`, because a
 * `list:` relabel can replace a row's jobs under the same model, prompt version and card text, which
 * leaves the input hash where it was while the roles move.
 *
 * Over the FOUR roles only (`labelRoleSet`'s output), never the strip's six rows: a relabel that
 * moves only `protection` or `finisher` changes no target, and must not refuse an index copy.
 *
 * Sorted, so the same facts give the same digest whatever order they were read in.
 */
export function roleSetFingerprint(
  oracleIds: Iterable<string>,
  sets: ReadonlyMap<string, readonly LabelTargetRole[]>,
  fallback: ReadonlyMap<string, LabelTargetRole | null>,
): string {
  const lines = [...new Set(oracleIds)].sort().map((id) => {
    const roles = sets.get(id);
    return `${id}=${roles ? [...roles].sort().join("+") : `?${fallback.get(id) ?? ""}`}`;
  });
  return createHash("md5").update(lines.join("\n")).digest("hex");
}
