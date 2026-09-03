import { frontFaceOracle, frontFaceTypeLine } from "./faces";
import { classifyRoles, ROLE_TARGETS } from "./roles";

export type PoolCard = {
  oracleId: string; name: string; typeLine: string; oracleText: string | null;
  keywords: string[]; colorIdentity: string[];
  imageUri: string | null;
  manaCost: string | null;
};

export type RoleName = "ramp" | "draw" | "removal" | "wipes";

/** One owned card that fills a role, with its EDHREC inclusion figure.
    Missing data is encoded as null, never as 0 — 0 is a figure EDHREC really
    reports, so collapsing the two would draw a real number for no data. */
export type RoleCard = { oracleId: string; name: string; inclusionPct: number | null };

export type CommanderScore = {
  oracleId: string; name: string;
  colorIdentity: string[];
  imageUri: string | null;
  typeLine: string;
  oracleText: string | null;
  manaCost: string | null;
  colorPoolSize: number;
  edhrecOwnedCount: number | null;
  edhrecTotal: number | null;
  roleCounts: Record<RoleName, number>;
  roleGaps: RoleName[];
  roleCards: Record<RoleName, RoleCard[]>;
  overlapOwned: string[];
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
  const typeLine = frontFaceTypeLine(card.typeLine);
  // Only the front face can make a card eligible to be a commander. Testing the
  // joined string lets a back face qualify a card it shouldn't, which is how
  // Westvale Abbey (a Land) ended up in the candidate pool (#79).
  if (/legendary/i.test(typeLine) && /creature/i.test(typeLine)) return true;
  return /can be your commander/i.test(frontFaceOracle(card.oracleText));
}

export function fitsIdentity(card: PoolCard, identity: Set<string>): boolean {
  return card.colorIdentity.every((c) => identity.has(c));
}

/**
 * The owned cards that could go in this commander's 99: colour-identity legal,
 * and never the commander itself.
 *
 * Exported because `colorPoolSize` is the only thing that survives this list
 * inside `scoreCommander`, and the receipt line needs a second count over the
 * SAME cards — `34 of your cards fit · 12 already in use` is a claim about one
 * pool, twice. Two call sites filtering by hand would drift apart silently, and
 * the reader has no way to tell which of the two numbers is wrong.
 */
export function commanderPool(
  commander: Pick<PoolCard, "oracleId" | "colorIdentity">,
  collection: PoolCard[],
): PoolCard[] {
  const identity = new Set(commander.colorIdentity);
  return collection.filter(
    (c) => c.oracleId !== commander.oracleId && fitsIdentity(c, identity),
  );
}

/** Inclusion descending, absent last, then name — so a chip row is ordered the
    same on a re-render and on a second request. */
export function byInclusionThenName(a: RoleCard, b: RoleCard): number {
  if (a.inclusionPct !== b.inclusionPct) {
    if (a.inclusionPct == null) return 1;
    if (b.inclusionPct == null) return -1;
    return b.inclusionPct - a.inclusionPct;
  }
  return a.name.localeCompare(b.name);
}

export function scoreCommander(args: {
  commander: PoolCard;
  collection: PoolCard[];
  edhrecTopCards: string[] | null;
  // Sparse: EDHREC reports a figure for the cards it knows, so most names miss.
  // The `| undefined` is what makes the guard below type-visible rather than
  // dead-looking code.
  inclusionByName: Record<string, number | undefined> | null;
}): CommanderScore {
  const pool = commanderPool(args.commander, args.collection);

  // `inclusionByName` is keyed lowercase by parseEdhrecPayload, so every read
  // lowercases first. And EDHREC names a double-faced card by its front face
  // while Scryfall names it "Front // Back" — the same mismatch the topCards
  // overlap below already handles.
  const inclusionOf = (name: string): number | null => {
    const map = args.inclusionByName;
    if (!map) return null;
    const lower = name.toLowerCase();
    const hit = map[lower] ?? map[lower.split(" // ")[0]];
    return hit != null && Number.isFinite(hit) ? hit : null;
  };

  const roleCounts = { ramp: 0, draw: 0, removal: 0, wipes: 0 };
  const roleCards: Record<RoleName, RoleCard[]> = { ramp: [], draw: [], removal: [], wipes: [] };
  for (const c of pool) {
    for (const role of classifyRoles(c)) {
      if (role !== "land") {
        roleCounts[role]++;
        roleCards[role].push({ oracleId: c.oracleId, name: c.name, inclusionPct: inclusionOf(c.name) });
      }
    }
  }
  // Only sort when figures exist. Without them, sorting would order the panel
  // alphabetically, which reads as an authored ranking built on nothing.
  // Addendum A1: fall back to pool order.
  //
  // The test is whether a card in *that panel* actually got a figure, not
  // whether a map was passed: parseEdhrecPayload always returns an object, and
  // a payload with topCards but no inclusion numbers yields an empty one.
  // Guarding on the map's presence would sort a panel of all-null figures
  // alphabetically — the exact outcome this guard exists to prevent. Asking the
  // question per panel matters because EDHREC's coverage is uneven: a commander
  // whose ramp cards carry figures and whose wipes carry none would otherwise
  // hand the wipes panel an alphabetical order it did not earn.
  for (const list of Object.values(roleCards)) {
    if (list.some((c) => c.inclusionPct !== null)) list.sort(byInclusionThenName);
  }
  const roleGaps = (Object.keys(ROLE_TARGETS) as (keyof typeof ROLE_TARGETS)[])
    .filter((r) => roleCounts[r] < ROLE_TARGETS[r]);

  let edhrecOwnedCount: number | null = null;
  let edhrecTotal: number | null = null;
  const overlapOwned: string[] = [];

  if (args.edhrecTopCards && args.edhrecTopCards.length > 0) {
    // Index full name AND front face: EDHREC lists DFCs/MDFCs by front face
    // while Scryfall names them "Front // Back".
    const poolNames = new Set<string>();
    for (const c of pool) {
      const lower = c.name.toLowerCase();
      poolNames.add(lower);
      poolNames.add(lower.split(" // ")[0]);
    }

    edhrecTotal = args.edhrecTopCards.length;
    for (const n of args.edhrecTopCards) {
      if (poolNames.has(n.toLowerCase())) {
        overlapOwned.push(n);
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
    typeLine: args.commander.typeLine,
    oracleText: args.commander.oracleText,
    manaCost: args.commander.manaCost,
    colorPoolSize: pool.length,
    edhrecOwnedCount, edhrecTotal,
    roleCounts, roleGaps, roleCards,
    overlapOwned,
    fitPool, fitRoles, fitSynergy, score,
  };
}
