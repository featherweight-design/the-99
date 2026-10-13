import { cache } from "react";
import { readLabelRoleSets } from "../labels/read";
import { roleSetFingerprint } from "../labels/role-sets";
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
 *   label falls back to the classifier for that card (`rolesByLabelElseText`), so the unlabeled
 *   few percent of a collection are still counted until the weekly label job reaches them.
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
  /**
   * What the sets were read AS, for a writer that persists the list counted by them: the ids asked
   * for and `roleSetFingerprint` of the sets that came back. `persistScores` re-reads the same ids
   * under its lock and drops the write when the fingerprint moved, so a label publish committing
   * between this read and the write cannot leave scores counted by the old labels. Only on the
   * labels basis.
   */
  labelCheck?: LabelCheck;
};

export type LabelCheck = { oracleIds: string[]; fingerprint: string };

export const CLASSIFIER_POOL_BASIS: PoolRoleBasis = { basis: "classifier", roleSets: undefined, fellBack: false };
const FELL_BACK: PoolRoleBasis = { ...CLASSIFIER_POOL_BASIS, fellBack: true };

/**
 * `enabled` is the READER's `LABEL_ROLE_COUNTS_ENABLED` (`labelRoleCountsEnabled(env)` of the env the
 * request resolved), never read here: the switch takes an app-wide override, so the environment alone
 * can disagree with what the rest of the request decided (admin PR 6d-2).
 */
export async function loadPoolRoleBasis(
  cards: readonly { oracleId: string }[],
  enabled: boolean,
  read: typeof readLabelRoleSets = readLabelRoleSets,
): Promise<PoolRoleBasis> {
  if (!enabled) return CLASSIFIER_POOL_BASIS;
  try {
    const oracleIds = [...new Set(cards.map((c) => c.oracleId))];
    const roleSets = await read(oracleIds);
    return {
      basis: "labels", roleSets, fellBack: false,
      labelCheck: { oracleIds, fingerprint: roleSetFingerprint(oracleIds, roleSets as never) },
    };
  } catch (err) {
    recordSoftFailure();
    console.warn("loadPoolRoleBasis: no labels — the ranked list counts by the classifier", err);
    return FELL_BACK;
  }
}

/**
 * One label read per REQUEST (labels-everywhere follow-up, orchestrator 2026-10-13). A commander page asks
 * for the ranked list, the free ranking and the detail score, each of which read the labels on its own, so a
 * read that failed for one and not for another served a classifier ranking beside label figures on one page.
 * The three share the first read's PROMISE, success or fallback, so they agree with each other.
 *
 * Keyed on the user, the reader's resolved basis switch and how many distinct cards were asked about: every
 * caller passes the user's whole collection, so the count is the cheap stand-in for the set (a collection
 * that changed between two reads of one render is not a case this has to survive). React's `cache` gives
 * each render its own map and, outside a render (a script, a server action, `after()`), none: each call then
 * reads for itself, exactly as before. Callers with a different pool (`suggestions-read`'s available cards)
 * keep calling `loadPoolRoleBasis`.
 */
const sharedBasisMemo = cache(() => new Map<string, Promise<PoolRoleBasis>>());

export function loadSharedPoolRoleBasis(
  userId: string,
  cards: readonly { oracleId: string }[],
  enabled: boolean,
  read?: typeof readLabelRoleSets,
  memo: Map<string, Promise<PoolRoleBasis>> = sharedBasisMemo(),
): Promise<PoolRoleBasis> {
  const key = `${userId}|${enabled ? "labels" : "classifier"}|${new Set(cards.map((c) => c.oracleId)).size}`;
  let started = memo.get(key);
  if (!started) {
    started = loadPoolRoleBasis(cards, enabled, read);
    memo.set(key, started);
  }
  return started;
}
