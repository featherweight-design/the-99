import { castFaceText } from "../cards/facet";
import { classifyRoles, type Role } from "../recs/roles";

/**
 * The four functional role targets, derived per commander.
 *
 * Lives in `src/lib/edhrec/` rather than under `scripts/`, because `seed-index.ts` is its
 * consumer and `src/` importing from `scripts/` is the dependency pointing the wrong way.
 */

export type RoleDerivationRow = {
  commanderOracleId: string;
  oracleId: string;
  /** EDHREC's own percentage, 0.3 to 100 — or NULL where the index stored none.
   *
   *  Nullable rather than coerced to 0, because the two are not the same fact and the
   *  difference decides whether a commander is published at all. `toSupportRows` deliberately
   *  persists a card with no inclusion, and a commander whose whole list is like that has no
   *  measurement to report — coercing to 0 made it indistinguishable from one measuring a
   *  genuine zero, which then published four zeroes AND counted toward the coverage floor. */
  inclusion: number | null;
  typeLine: string;
  oracleText: string | null;
  keywords: string[];
  /** Scryfall's layout. Decides whether the back face is castable text — see `castFaceText`. */
  layout: string;
};

export type RoleTargetRow = { ramp: number; draw: number; removal: number; wipes: number };

const ROLES = ["ramp", "draw", "removal", "wipes"] as const;
type RoleKey = (typeof ROLES)[number];

/**
 * The expected number of cards filling each role in a deck for this commander.
 *
 * A PROBABILITY SUM, not a count: a card listed at 50% inclusion contributes 0.5 to every role
 * it satisfies, because that is how many copies of it the average deck holds.
 *
 * A card counts toward EVERY role it satisfies. That is what decks contain — an instant that
 * destroys and draws is one card doing both jobs — and it is why `planFill` counts a placed
 * card the same way while still spending its slot once. Feeding a double-counted description
 * into a single-spend floor would make the fill place two cards where the description counted
 * one.
 *
 * THE FRONT FACE ONLY, through `castFaceText`. `cards.oracle_text` holds both faces joined
 * `"front\n//\nback"`, and `isLandFace` reads the front — so for a land-backed MDFC
 * `classifyRoles` would otherwise read the land back's `{T}: Add {R}` and call the card RAMP.
 * 82 commander-legal cards are shaped that way, and the inflation is measurable: mean ramp 8.5
 * on whole text against 7.8 on the front face.
 *
 * @param onClassify Called once per DISTINCT card actually classified. Exists so a test can
 *   assert the memoisation rather than infer it from two sums that a cacheless version returns
 *   identically.
 */
export function classifyCards(
  rows: readonly Pick<RoleDerivationRow, "oracleId" | "typeLine" | "oracleText" | "layout" | "keywords">[],
  onClassify?: (oracleId: string) => void,
): Map<string, Role[]> {
  const out = new Map<string, Role[]>();
  for (const row of rows) {
    if (out.has(row.oracleId)) continue;
    out.set(row.oracleId, classifyRoles({
      typeLine: row.typeLine,
      // THE FRONT FACE. `oracle_text` holds both, so a land-backed MDFC otherwise reads as ramp.
      oracleText: castFaceText(row.oracleText, row.layout),
      keywords: row.keywords,
    }));
    onClassify?.(row.oracleId);
  }
  return out;
}

/**
 * @param opts.rolesOf Each card's roles from somewhere other than its text: the LABEL pass hands
 *   in `readLabelRoleSets`, and a card absent from it counts toward no role. Omitted, the cards are
 *   classified from their text, which is how `avg_*` are derived.
 */
export function deriveRoleTargets(
  rows: readonly RoleDerivationRow[],
  opts: {
    onClassify?: (oracleId: string) => void;
    rolesOf?: ReadonlyMap<string, readonly string[]>;
  } = {},
): Map<string, RoleTargetRow> {
  // Classified ONCE per distinct card. `classifyRoles` is pure, so two rows naming the same card
  // cannot disagree — and the pair-wise form is 892,185 regex passes on staging against ~31,830
  // distinct commander-legal cards here.
  const rolesOf: ReadonlyMap<string, readonly string[]> = opts.rolesOf ?? classifyCards(rows, opts.onClassify);
  const out = new Map<string, RoleTargetRow>();

  // A commander that contributed at least one row whose inclusion the index actually STORED.
  // The entry below is created before the inclusion check on purpose — a genuine zero has to be
  // reportable — so this is what separates "measured 0" from "nothing to measure".
  const measured = new Set<string>();

  for (const row of rows) {
    const roles = rolesOf.get(row.oracleId) ?? [];

    let target = out.get(row.commanderOracleId);
    if (!target) {
      // Zero rather than absent. 390 commanders measure a genuine 0 for wipes, and a figure
      // that cannot tell "none" from "not derived" is one nobody can read.
      target = { ramp: 0, draw: 0, removal: 0, wipes: 0 };
      out.set(row.commanderOracleId, target);
    }

    // A STORED NUMBER IS DATA, even a zero — only `null` is absence. EDHREC reporting 0% is a
    // measurement of "never included" and the commander's zeroes are then honest; a null is the
    // index having stored nothing, and four zeroes derived from nothing are not a measurement.
    // NaN sides with absence: it is corruption, not a reading.
    if (row.inclusion !== null && Number.isFinite(row.inclusion)) {
      measured.add(row.commanderOracleId);
    }
    if (row.inclusion === null || !Number.isFinite(row.inclusion) || row.inclusion <= 0) continue;
    const p = row.inclusion / 100;
    for (const role of ROLES) if (roles.includes(role)) target[role as RoleKey] += p;
  }

  // Dropped rather than published as zeroes. An absent commander is cleared by the publish and
  // counts AGAINST the coverage floor, which is the honest reading: nothing was derived for it.
  for (const id of out.keys()) if (!measured.has(id)) out.delete(id);

  return out;
}

/** Below this share of the indexed commanders, a derivation has not reached enough of the
 *  index to publish. Measured rather than guessed is not available here — it is a refusal
 *  threshold, not a figure about decks — so it is stated, and stated once. */
export const ROLE_TARGET_FLOOR = 0.9;

/**
 * Whether a derivation reached enough of the index to publish.
 *
 * Extracted from the writer so it can be tested: the writer is database-bound, and a refusal
 * that only runs against a real Postgres is a refusal nobody checks. A partial set is
 * indistinguishable from a complete one to every reader, which is why this refuses rather than
 * writing what it has.
 */
export function roleTargetsPublishable(derived: number, okCommanders: number): boolean {
  // An index with no `ok` commanders publishes whatever it derived, including nothing. That is
  // an empty database rather than a broken run, and refusing there would fail every first run.
  if (okCommanders <= 0) return true;
  return derived >= okCommanders * ROLE_TARGET_FLOOR;
}
