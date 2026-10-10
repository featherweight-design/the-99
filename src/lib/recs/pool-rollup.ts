import { availabilityState, type Availability } from "../decks/availability";
import type { ReceiptCounts } from "../commanders/in-use";
import { classifyRoles } from "./roles";
import type { PoolCard, RoleName } from "./score";

const BITS: Record<string, number> = { W: 1, U: 2, B: 4, R: 8, G: 16 };

/** 5-bit WUBRG mask. `card & ~commander` is `fitsIdentity` in one instruction. */
export function identityMask(colors: string[]): number {
  let mask = 0;
  for (const c of colors) mask |= BITS[c.toUpperCase()] ?? 0;
  return mask;
}

type Bucket = {
  size: number;
  roleCounts: Record<RoleName, number>;
  counts: ReceiptCounts;
};

export type PoolRollup = {
  /** Indexed by 5-bit identity mask, length 32. */
  buckets: Bucket[];
  /** One-card bucket per collection card, for subtracting the commander itself. */
  byOracleId: Map<string, Bucket>;
};

const emptyBucket = (): Bucket => ({
  size: 0,
  roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
  counts: { inUse: 0, wantedByDraft: 0 },
});

function add(into: Bucket, from: Bucket, sign: 1 | -1) {
  into.size += sign * from.size;
  for (const r of Object.keys(into.roleCounts) as RoleName[]) {
    into.roleCounts[r] += sign * from.roleCounts[r];
  }
  into.counts.inUse += sign * from.counts.inUse;
  into.counts.wantedByDraft += sign * from.counts.wantedByDraft;
}

/**
 * Classifies each collection card once and files it under its identity mask.
 * A commander's pool is the union of the buckets whose mask is a subset of its
 * own, so a per-commander answer costs 32 adds instead of a walk over the whole
 * collection — the difference between ~107k operations and ~9.4M at 3,334 rows.
 */
export function buildPoolRollup(
  collection: PoolCard[],
  availability: Map<string, Availability>,
  /**
   * Fresh-label role sets by oracle id, when the roles are counted by LABEL
   * (`LABEL_ROLE_COUNTS_ENABLED`, labels-everywhere plan). A card absent from the map has no fresh
   * label and counts toward no role, the rule `scoreCommander` applies to the same pool; absent
   * altogether is the classifier for every card, exactly as before. The two must agree, or a
   * commander's Discover row and its detail page would print different role counts.
   */
  roleSets?: ReadonlyMap<string, readonly RoleName[]>,
): PoolRollup {
  const buckets = Array.from({ length: 32 }, emptyBucket);
  const byOracleId = new Map<string, Bucket>();

  for (const c of collection) {
    const one = emptyBucket();
    one.size = 1;
    for (const role of roleSets ? roleSets.get(c.oracleId) ?? [] : classifyRoles(c)) {
      if (role !== "land") one.roleCounts[role]++;
    }
    const a = availability.get(c.oracleId);
    if (a) {
      const state = availabilityState(a);
      if (state === "hard" || state === "over") one.counts.inUse++;
      else if (state === "soft") one.counts.wantedByDraft++;
    }
    add(buckets[identityMask(c.colorIdentity)], one, 1);
    byOracleId.set(c.oracleId, one);
  }

  return { buckets, byOracleId };
}

export type CommanderRollup = {
  colorPoolSize: number;
  roleCounts: Record<RoleName, number>;
  counts: ReceiptCounts;
};

export function rollupFor(
  rollup: PoolRollup,
  commander: { oracleId: string; colorIdentity: string[] },
): CommanderRollup {
  const identity = identityMask(commander.colorIdentity);
  const total = emptyBucket();
  for (let mask = 0; mask < 32; mask++) {
    if ((mask & ~identity) === 0) add(total, rollup.buckets[mask], 1);
  }
  // `commanderPool` excludes the commander itself, and a commander the player
  // owns is in the collection — so it is in a bucket and has to come back out.
  // The subtraction needs no subset guard: the commander's bucket is keyed by
  // the commander's own identity, which is trivially a subset of itself, so it
  // is always one of the ≤32 just summed.
  const self = rollup.byOracleId.get(commander.oracleId);
  if (self) add(total, self, -1);

  return {
    colorPoolSize: total.size,
    roleCounts: total.roleCounts,
    counts: total.counts,
  };
}
