import { classifyRoles, ROLE_TARGETS } from "./roles";

export type PoolCard = {
  oracleId: string; name: string; typeLine: string; oracleText: string | null;
  keywords: string[]; colorIdentity: string[];
  imageUri: string | null;
};

export type CommanderScore = {
  oracleId: string; name: string;
  colorIdentity: string[];
  imageUri: string | null;
  colorPoolSize: number;
  edhrecOwnedCount: number | null;
  edhrecTotal: number | null;
  roleCounts: Record<"ramp" | "draw" | "removal" | "wipes", number>;
  roleGaps: ("ramp" | "draw" | "removal" | "wipes")[];
  roleCards: Record<"ramp" | "draw" | "removal" | "wipes", string[]>;
  overlapOwned: string[];
  overlapMissing: string[];
  fitPool: number;
  fitRoles: number;
  fitSynergy: number | null;
  score: number;
};

export const COMPLETENESS_THRESHOLDS = { high: 90, mid: 75 } as const;

/**
 * Completeness percentage for the hero-card / commander-card progress bar.
 * Returns null when EDHREC data is missing (degraded mode) or total is 0 —
 * caller renders a fallback note instead of a bar ("synergy data offline"
 * when the EDHREC fetch failed, "completeness unavailable" otherwise).
 */
export function completeness(
  s: Pick<CommanderScore, "edhrecOwnedCount" | "edhrecTotal">,
): number | null {
  if (s.edhrecTotal == null || s.edhrecOwnedCount == null) return null;
  if (s.edhrecTotal <= 0) return null;
  return Math.round((100 * s.edhrecOwnedCount) / s.edhrecTotal);
}

export function isCommanderCandidate(card: Pick<PoolCard, "typeLine" | "oracleText">): boolean {
  if (/legendary/i.test(card.typeLine) && /creature/i.test(card.typeLine)) return true;
  return /can be your commander/i.test(card.oracleText ?? "");
}

function fitsIdentity(card: PoolCard, identity: Set<string>): boolean {
  return card.colorIdentity.every((c) => identity.has(c));
}

export function scoreCommander(args: {
  commander: PoolCard;
  collection: PoolCard[];
  edhrecTopCards: string[] | null;
}): CommanderScore {
  const identity = new Set(args.commander.colorIdentity);
  const pool = args.collection.filter(
    (c) => c.oracleId !== args.commander.oracleId && fitsIdentity(c, identity),
  );

  const roleCounts = { ramp: 0, draw: 0, removal: 0, wipes: 0 };
  const roleCards: Record<"ramp" | "draw" | "removal" | "wipes", string[]> = {
    ramp: [], draw: [], removal: [], wipes: [],
  };
  for (const c of pool) {
    for (const role of classifyRoles(c)) {
      if (role !== "land") {
        roleCounts[role]++;
        roleCards[role].push(c.name);
      }
    }
  }
  const roleGaps = (Object.keys(ROLE_TARGETS) as (keyof typeof ROLE_TARGETS)[])
    .filter((r) => roleCounts[r] < ROLE_TARGETS[r]);

  // Index full name AND front face: EDHREC lists DFCs/MDFCs by front face
  // while Scryfall names them "Front // Back".
  const poolNames = new Set<string>();
  for (const c of pool) {
    const lower = c.name.toLowerCase();
    poolNames.add(lower);
    poolNames.add(lower.split(" // ")[0]);
  }

  let edhrecOwnedCount: number | null = null;
  let edhrecTotal: number | null = null;
  let overlapOwned: string[] = [];
  let overlapMissing: string[] = [];

  if (args.edhrecTopCards) {
    edhrecTotal = args.edhrecTopCards.length;
    for (const n of args.edhrecTopCards) {
      if (poolNames.has(n.toLowerCase())) {
        overlapOwned.push(n);
      } else {
        overlapMissing.push(n);
      }
    }
    edhrecOwnedCount = overlapOwned.length;
  }

  const overlapRatio = edhrecTotal ? (edhrecOwnedCount! / edhrecTotal) : 0;
  const roleCoverage =
    (Object.keys(ROLE_TARGETS) as (keyof typeof ROLE_TARGETS)[])
      .reduce((sum, r) => sum + Math.min(roleCounts[r], ROLE_TARGETS[r]) / ROLE_TARGETS[r], 0) /
    Object.keys(ROLE_TARGETS).length;
  const poolFactor = Math.min(args.collection.length ? pool.length / 200 : 0, 1);

  const fitPool = Math.round(poolFactor * 15 * 10) / 10;
  const fitRoles = Math.round(roleCoverage * 25 * 10) / 10;
  const fitSynergy = edhrecTotal == null ? null : Math.round(overlapRatio * 60 * 10) / 10;
  const score = fitSynergy == null
    ? Math.round(((fitPool + fitRoles) / 40) * 100 * 10) / 10
    : Math.round((fitPool + fitRoles + fitSynergy) * 10) / 10;

  return {
    oracleId: args.commander.oracleId,
    name: args.commander.name,
    colorIdentity: args.commander.colorIdentity,
    imageUri: args.commander.imageUri,
    colorPoolSize: pool.length,
    edhrecOwnedCount, edhrecTotal,
    roleCounts, roleGaps, roleCards,
    overlapOwned, overlapMissing,
    fitPool, fitRoles, fitSynergy, score,
  };
}
