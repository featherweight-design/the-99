import { labelRoleCountsEnabled } from "../decks/label-counts-flag";
import { readLabelRoleSets } from "../labels/read";
import type { RoleBasis } from "../profile/build";
import { recordSoftFailure } from "../cache/soft-failure";
import type { RoleName } from "./score";

/**
 * How a ranked list counts a collection's roles, and the targets it is measured against
 * (labels-everywhere plan). Both move together or not at all: counting by label against the
 * classifier's bars flatters every commander, and the reverse docks them.
 *
 * - Switch off: the classifier for every card and the `avg_*` targets, exactly as before. No read.
 * - Switch on: each card's fresh-label role set, and the `label_*` targets. A card with no fresh
 *   label counts toward no role (the rule the label targets were derived under), so the unlabeled
 *   few percent of a collection under-count until the weekly label job reaches them.
 * - Switch on and the label read FAILS: the classifier on BOTH sides, recorded as a soft failure
 *   (this sits on Home's cached path, which `check:list-cache` holds to recorded failures only),
 *   and marked `fellBack` so the caller serves the list without persisting it.
 */
export type PoolRoleBasis = {
  basis: RoleBasis;
  roleSets: ReadonlyMap<string, readonly RoleName[]> | undefined;
  /**
   * True when the switch is ON and the label read failed, so this answer is the classifier's by
   * accident rather than by configuration. A list computed under it must be SERVED but never
   * PERSISTED: `commander_scores` records no basis, so a stored fallback would go on serving
   * classifier counts with the switch on until something unrelated cleared it.
   */
  fellBack: boolean;
};

export const CLASSIFIER_POOL_BASIS: PoolRoleBasis = { basis: "classifier", roleSets: undefined, fellBack: false };
const FELL_BACK: PoolRoleBasis = { ...CLASSIFIER_POOL_BASIS, fellBack: true };

export async function loadPoolRoleBasis(
  cards: readonly { oracleId: string }[],
  enabled: boolean = labelRoleCountsEnabled(),
  read: typeof readLabelRoleSets = readLabelRoleSets,
): Promise<PoolRoleBasis> {
  if (!enabled) return CLASSIFIER_POOL_BASIS;
  try {
    return { basis: "labels", roleSets: await read(cards.map((c) => c.oracleId)), fellBack: false };
  } catch (err) {
    recordSoftFailure();
    console.warn("loadPoolRoleBasis: no labels — the ranked list counts by the classifier", err);
    return FELL_BACK;
  }
}
