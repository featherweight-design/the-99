import type { Availability } from "../decks/availability";
import { frontFaceOracle, frontFaceTypeLine } from "./faces";
import { classifyRoles, ROLE_TARGETS } from "./roles";
import { supportOverlap, type SupportList } from "../edhrec/support-overlap";

export type PoolCard = {
  oracleId: string; name: string; typeLine: string; oracleText: string | null;
  keywords: string[]; colorIdentity: string[];
  imageUri: string | null;
  artCropUri: string | null;
  manaCost: string | null;
};

export type RoleName = "ramp" | "draw" | "removal" | "wipes";

/** One owned card that fills a role, with its EDHREC inclusion figure.
    Missing data is encoded as null, never as 0 — 0 is a figure EDHREC really
    reports, so collapsing the two would draw a real number for no data. */
export type RoleCard = {
  oracleId: string;
  name: string;
  inclusionPct: number | null;
  /** The deck this card already sits in, or null. Scoring leaves it null: the
      ranked list has no card rows to mark, and the mark costs a query. The
      commander page fills it in through `withCommitted`. */
  committedTo: string | null;
  /**
   * This card's claim picture, or null.
   *
   * **Null means NO ROW, never "unowned."** `loadAvailability`'s outer select is
   * driven by its `owned` CTE and basics are excluded from the model entirely, so
   * an unowned card, a basic land and a read that could not reach all arrive here
   * the same way. Nothing may branch on null to mean the player lacks the card —
   * Role Coverage is built from the owned pool and has no unowned row anyway.
   *
   * Scoring leaves it null for the same reason it leaves `committedTo` null: the
   * ranked list draws no card rows and the read costs a query. The commander page
   * fills it in through `withAvailability`.
   */
  availability: Availability | null;
};

export type CommanderScore = {
  oracleId: string; name: string;
  colorIdentity: string[];
  imageUri: string | null;
  artCropUri: string | null;
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
  /** `overlapOwned` as oracle ids, in the same order. Not persisted: only the
      detail page reads it, to say how many of these the player has already
      committed to a deck. */
  overlapOwnedIds: string[];
  fitPool: number;
  fitRoles: number;
  fitSynergy: number | null;
  /** Exactly `fitPool + fitRoles + (fitSynergy ?? 0)`. The legend prints each
      segment over its own weight, so the headline has to be reachable by adding
      the three figures beside it — rounding the total separately from its parts
      put up to 1.5 points between them. */
  score: number;
  /** What `score` is out of: 100 normally, `POOL_WEIGHT + ROLES_WEIGHT` for a
      commander with no synergy read, whose score is not rescaled to fill the gap. */
  measurableTotal: number;
  /** `score` back on the 0–100 scale, for ordering only. Never printed and never
      drawn. Without it, #385's honest denominator would also demote every
      commander EDHREC does not index, which was never the intent: the figure was
      wrong, the rank was not. */
  rankScore: number;
};

/** The three segment weights. Named because the legend prints points over the
    weight, so the same figures reach the screen and must not drift from the
    arithmetic that produced them. */
export const POOL_WEIGHT = 15;
export const ROLES_WEIGHT = 25;
export const SYNERGY_WEIGHT = 60;

/** How many legal cards in the identity fill Pool.
 *
 * Named for the same reason the weights are: the key now prints it. It was a bare
 * literal, and the key described Pool without ever saying it saturates — so a player
 * with a deep collection read a full 15/15 as "my collection covers this commander
 * completely", a claim the segment never made. A threshold quoted in prose has to be
 * the one the arithmetic uses. */
export const POOL_FULL_AT = 200;

/**
 * What a score is out of, given whether it has a synergy component.
 *
 * A function rather than a stored column: the answer is entirely determined by
 * `fitSynergy`, and the two readers that need it — the live compute and the row
 * loaded back out of `commander_scores` — must not be able to disagree.
 */
export function measurableTotalFor(fitSynergy: number | null): number {
  return POOL_WEIGHT + ROLES_WEIGHT + (fitSynergy == null ? 0 : SYNERGY_WEIGHT);
}

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

/*
 * `edhrecOverlap` lived here and is gone.
 *
 * It matched EDHREC's card NAMES against the pool, indexing both the full name
 * and the front face because EDHREC lists a DFC by its front while Scryfall
 * names it "Front // Back". Ruling D replaced it with `supportOverlap`, an id
 * intersection over the stored index — the names were already resolved to oracle
 * ids when the index was built, so none of that matching is needed on the read
 * path. Deleted rather than kept: it had no caller and no test left, and a
 * second way to resolve a card to an id is exactly what drifted from the first.
 */

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
  /**
   * The STORED support list, from `commander_support` — never the live EDHREC
   * payload. Ruling D: every Fit reads one source, because the two disagreed on
   * 20 of 95 commanders when `probe:fit-parity` measured them, and a row
   * disagreeing with its own detail page is the defect the commander row exists
   * to remove.
   *
   * Absent (`null`) means no synergy reading, and leaves `fitSynergy` null
   * rather than zeroing it — see `measurableTotalFor`.
   */
  support: SupportList | null;
  // Sparse: EDHREC reports a figure for the cards it knows, so most names miss.
  // The `| undefined` is what makes the guard below type-visible rather than
  // dead-looking code.
  //
  // STILL LIVE, deliberately. This feeds the role chips' inclusion percentages,
  // not the score, and nothing compares it across surfaces — so it keeps the
  // fresher reading while the figure that IS compared reads the index.
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
        roleCards[role].push({
          oracleId: c.oracleId,
          name: c.name,
          inclusionPct: inclusionOf(c.name),
          committedTo: null,
          availability: null,
        });
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
  const overlapOwnedIds: string[] = [];

  // A total of 0 is treated as NO READING, not as a measured zero — which is
  // what the live payload's empty `topCards` meant and is preserved verbatim.
  // Ruling D moves the SOURCE of this figure, and deciding that an empty list
  // now scores 0 of 60 would be a second change riding along on it. The case is
  // unreachable in any event: all 3,342 indexed commanders carry a positive
  // `edhrec_total`.
  if (args.support && args.support.total != null && args.support.total > 0) {
    const overlap = supportOverlap(args.support, pool);
    edhrecTotal = args.support.total;
    overlapOwned.push(...overlap.names);
    overlapOwnedIds.push(...overlap.oracleIds);
    edhrecOwnedCount = overlapOwned.length;
  }

  const overlapRatio = edhrecTotal ? edhrecOwnedCount! / edhrecTotal : 0;
  const roleCoverage =
    (Object.keys(ROLE_TARGETS) as (keyof typeof ROLE_TARGETS)[])
      .reduce((sum, r) => sum + Math.min(roleCounts[r], ROLE_TARGETS[r]) / ROLE_TARGETS[r], 0) /
    Object.keys(ROLE_TARGETS).length;
  const poolFactor = Math.min(args.collection.length ? pool.length / POOL_FULL_AT : 0, 1);

  // Integers, not tenths. The hero's legend prints "Pool 12/15 · Roles 20/25 ·
  // Synergy 42/60" and the headline has to be 74 — auditable by addition. A tenth
  // in each segment is invisible in the legend and visible in the sum.
  const fitPool = Math.round(poolFactor * POOL_WEIGHT);
  const fitRoles = Math.round(roleCoverage * ROLES_WEIGHT);
  const fitSynergy = edhrecTotal == null ? null : Math.round(overlapRatio * SYNERGY_WEIGHT);
  // One denominator for every commander. Rescaling pool+roles from their 40-point
  // maximum back up to 100 whenever synergy data was unavailable let a commander
  // with no synergy read print 100/100 — the highest figure the UI can show,
  // awarded to the commander we know least about (#333). It also contradicted the
  // note the card already prints beside that number: "fit comes from pool and
  // roles alone". Unscaled, such a commander tops out at 40, which is what pool
  // and roles alone are worth.
  //
  // "Unavailable", not "untracked": this branch is every reason `edhrecTotal` came
  // back null, a live EDHREC outage included. `synergyState` is what tells those
  // apart, and it does so for the card's note and its Retry button rather than for
  // the arithmetic — a score is no more certain for the gap being temporary.
  // `fitSynergy` stays null either way: the component is absent, not 0.
  const measurableTotal = measurableTotalFor(fitSynergy);
  const score = fitPool + fitRoles + (fitSynergy ?? 0);
  // The rescale #333 removed, kept for ordering alone. Printing it was the bug —
  // it claimed a certainty the read never had. Ordering by it is what the list
  // always did, and a commander does not become a worse suggestion because
  // EDHREC has no page for it.
  const rankScore = Math.round((100 * score) / measurableTotal);

  return {
    oracleId: args.commander.oracleId,
    name: args.commander.name,
    colorIdentity: args.commander.colorIdentity,
    imageUri: args.commander.imageUri,
    artCropUri: args.commander.artCropUri,
    typeLine: args.commander.typeLine,
    oracleText: args.commander.oracleText,
    manaCost: args.commander.manaCost,
    colorPoolSize: pool.length,
    edhrecOwnedCount, edhrecTotal,
    roleCounts, roleGaps, roleCards,
    overlapOwned, overlapOwnedIds,
    fitPool, fitRoles, fitSynergy, score, measurableTotal, rankScore,
  };
}
