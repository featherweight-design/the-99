// The ROLE-TARGET reader: the four measured figures off a commander, pair or bucket row, and the
// batched read the ranked lists use (brief 2026-09-28 §5.4). Its own module, deliberately small,
// because the ranked lists sit on Home's and /commanders' cached path: importing the whole profile
// loader for one read pulled its EDHREC pair reader, and that reader's soft fallbacks, onto a path
// `check:list-cache` holds to recorded failures only. `load.ts` reads through `roleTargetsFrom` too,
// so the skeleton and the lists apply one guard and, through `pickRoleTargets`, one chain.
import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { commanderSupport, identityComposition } from "../../db/schema";
import { countCondition, identityCondition } from "../staples/condition";
import { pickRoleTargets } from "./build";
import type { ProfileRoleTargets } from "./types";

/** The role half of a commander, pair or bucket row. */
export type RoleRow = {
  avgRamp: number | null; avgDraw: number | null;
  avgRemoval: number | null; avgWipes: number | null;
  /**
   * How many commanders in this bucket carried role figures. Only `identity_composition`
   * carries it, and it is REQUIRED there: that table's role columns are `NOT NULL DEFAULT 0`,
   * so a bucket derived before the role pass reads back four honest-looking zeroes, and only
   * this count says nobody measured them. The commander and pair rows omit it; their columns
   * are nullable and nullity is the test.
   */
  withRoles?: number;
};

/** A row's `label_*` figures in the shape `roleTargetsFrom` reads, so the labels basis walks the SAME
 *  guard (finite, all-or-nothing) as the classifier's. `withRoles` is left off on purpose: it counts
 *  commanders carrying `avg_*`, and a label bucket's witness is nullity (the column is nullable). */
export function labelRoleRow(
  row: { labelRamp?: number | null; labelDraw?: number | null; labelRemoval?: number | null; labelWipes?: number | null } | null | undefined,
): RoleRow | undefined {
  if (!row) return undefined;
  return {
    avgRamp: row.labelRamp ?? null, avgDraw: row.labelDraw ?? null,
    avgRemoval: row.labelRemoval ?? null, avgWipes: row.labelWipes ?? null,
  };
}

/**
 * The four role figures off a candidate row, or null when the row carries none.
 *
 * ALL-OR-NOTHING like the composition, and for the same reason — a 0 substituted for a null
 * turns "nobody measured this" into "this deck wants no wipes". Read INDEPENDENTLY of the
 * composition: a commander indexed before the role pass carries one and not the other.
 */
export function roleTargetsFrom(
  row: RoleRow | undefined,
) {
  if (!row) return null;
  // The BUCKET rows carry their own denominator and it is the only honest test for them — see
  // `withRoles` above. A commander or pair row omits the field entirely, and nullity is the
  // right test there because its columns are nullable.
  if (row.withRoles !== undefined && row.withRoles <= 0) return null;
  const { avgRamp: ramp, avgDraw: draw, avgRemoval: removal, avgWipes: wipes } = row;
  // FINITE, not merely non-null. A null is what the database returns for "not derived", but a
  // row that reaches here malformed — undefined fields, a NaN out of a bad cast — walks past a
  // null check, and what a non-finite floor costs is not a wrong target: every
  // `counts[role] < floor` comparison against NaN is false, so the role pass finds no role
  // open and places NOTHING. The whole deck falls to the residual, silently.
  const four = [ramp, draw, removal, wipes];
  if (!four.every((v): v is number => typeof v === "number" && Number.isFinite(v))) return null;
  return { ramp: four[0]!, draw: four[1]!, removal: four[2]!, wipes: four[3]! };
}

/**
 * Role targets for MANY single commanders at once, for the ranked lists: the fit score across a
 * whole collection's candidates, where `loadSkeletonForCommanders`' four reads per commander
 * would be thousands. Two reads instead, the commanders' own rows and the buckets they fall to,
 * and then the SAME `roleTargetsFrom` and `pickRoleTargets` the skeleton applies, rung for rung,
 * so a commander ranked here is measured against the figures its deck is built to. No pair rung:
 * a ranked row is one commander.
 */
export async function loadRoleTargetsForCommanders(
  commanders: readonly { oracleId: string; colorIdentity: readonly string[] }[],
): Promise<Map<string, ProfileRoleTargets>> {
  if (commanders.length === 0) return new Map();
  const conditions = new Set<string>();
  for (const c of commanders) {
    conditions.add(identityCondition([...c.colorIdentity]));
    conditions.add(countCondition(c.colorIdentity.length));
  }
  const [own, buckets] = await Promise.all([
    db
      .select({
        oracleId: commanderSupport.commanderOracleId,
        avgRamp: commanderSupport.avgRamp, avgDraw: commanderSupport.avgDraw,
        avgRemoval: commanderSupport.avgRemoval, avgWipes: commanderSupport.avgWipes,
      })
      .from(commanderSupport)
      .where(inArray(commanderSupport.commanderOracleId, commanders.map((c) => c.oracleId))),
    db
      .select({
        condition: identityComposition.condition,
        avgRamp: identityComposition.avgRamp, avgDraw: identityComposition.avgDraw,
        avgRemoval: identityComposition.avgRemoval, avgWipes: identityComposition.avgWipes,
        withRoles: identityComposition.withRoles,
      })
      .from(identityComposition)
      .where(inArray(identityComposition.condition, [...conditions])),
  ]);
  const ownBy = new Map(own.map((r) => [r.oracleId, r]));
  const bucketBy = new Map(buckets.map((r) => [r.condition, r]));
  return new Map(commanders.map((c) => [c.oracleId, pickRoleTargets({
    pair: null,
    commander: roleTargetsFrom(ownBy.get(c.oracleId)),
    identity: roleTargetsFrom(bucketBy.get(identityCondition([...c.colorIdentity]))),
    count: roleTargetsFrom(bucketBy.get(countCondition(c.colorIdentity.length))),
  })]));
}
