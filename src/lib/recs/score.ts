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
  /**
   * The figure the list is ordered by, and now exactly `score`.
   *
   * It used to rescale a no-synergy score from its 40-point maximum back to 100, so that
   * #385's honest denominator would not demote a commander for a gap in OUR data. The
   * effect on screen was the opposite of the intent: since pool + roles + synergy weigh
   * 15 + 25 + 60, that rescale applies to untracked commanders and to nobody else, and it
   * multiplies them by 2.5 — so a commander EDHREC has never heard of took rank 1 on the
   * strength of a perfect 40/40, above every commander we actually know something about.
   * Ruled 2026-09-16.
   *
   * The field stays rather than being folded into `score`: it is a persisted column that
   * `loadScores` orders by in SQL, and the two readers must agree on the name.
   */
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

/** What Fit is computed FROM. Four figures, and nothing that has to be read. */
export type FitInputs = {
  /** Cards in the collection legal under this commander's identity, the
      commander's own card excluded — `commanderPool`'s length. */
  poolSize: number;
  roleCounts: Record<RoleName, number>;
  /** Support cards the reader owns AND can legally play. An unrestricted count
      is a different figure and makes the two surfaces disagree — see
      `IDENTITY_RESTRICTION` in `discovery/candidates.ts`. */
  ownedSupport: number;
  /** The support list's size. Null OR non-positive means no synergy reading. */
  edhrecTotal: number | null;
  /**
   * What each role is measured against: this commander's MEASURED targets where the index has
   * them, `ROLE_TARGETS` where it does not — always `pickRoleTargets`' answer
   * (`profile/build.ts`), so the score grades a commander against the figures its deck is
   * built to (brief 2026-09-28 §5.4). Required rather than defaulted: a caller that forgot it
   * would score against the flat constants in silence, which is the defect this field ends.
   */
  roleTargets: Record<RoleName, number>;
};

/**
 * A measured target is a MEAN, and a fractional target cannot be met by whole cards, so it is
 * rounded the way the fill rounds its floors (`roleFloors` in `decks/fill.ts`); a commander whose
 * decks average 8.4 ramp is met at 8, as the fill builds it. A target that rounds to 0 asks for
 * nothing and is met by construction, where dividing by it would make the whole score NaN.
 */
export function wholeTarget(target: number): number {
  return Math.round(target);
}

function roleShare(have: number, target: number): number {
  const t = wholeTarget(target);
  return t <= 0 ? 1 : Math.min(have, t) / t;
}

export type Fit = {
  fitPool: number;
  fitRoles: number;
  fitSynergy: number | null;
  score: number;
  measurableTotal: number;
  rankScore: number;
};

/**
 * Fit, from four figures.
 *
 * EXTRACTED SO THERE IS ONE IMPLEMENTATION, not two agreeing ones. Ruling D
 * says the row, the lane and Commander Details print one number; the row can
 * compute it without reading anything, and a second spelling of these five
 * roundings in `discovery/list.ts` would be free to drift from this one a
 * constant at a time. `scoreCommander` calls it too, so there is no "the real
 * one" and "the row's one".
 *
 * A NON-POSITIVE `edhrecTotal` IS NO READING, not a zero ratio, which is what
 * `scoreCommander`'s `total != null && total > 0` guard has always said. The
 * distinction is invisible in `score` — both give `fitSynergy` no points — and
 * decides `measurableTotal`, so a commander with an empty support list is
 * scored out of 40 rather than being told it managed 0 of 60.
 *
 * The ratio is DELIBERATELY UNCLAMPED, for parity rather than for taste.
 * `edhrec_total` and the child-row count disagree by 1 on 2 of 3,342
 * commanders, so a reader owning every support card can read a hair over 60 —
 * and `scoreCommander` has the same exposure through the same data, because its
 * overlap is bounded by the child rows while its denominator is the stored
 * column. Clamping here alone would make the two surfaces differ on exactly
 * the rows this shared function exists to keep identical.
 */
export function computeFit(i: FitInputs): Fit {
  const total = i.edhrecTotal != null && i.edhrecTotal > 0 ? i.edhrecTotal : null;
  const overlapRatio = total ? i.ownedSupport / total : 0;
  const roleCoverage =
    (Object.keys(ROLE_TARGETS) as RoleName[])
      .reduce((sum, r) => sum + roleShare(i.roleCounts[r], i.roleTargets[r]), 0) /
    Object.keys(ROLE_TARGETS).length;
  const poolFactor = Math.min(i.poolSize / POOL_FULL_AT, 1);

  // Integers, not tenths. The hero's legend prints "Pool 12/15 · Roles 20/25 ·
  // Synergy 42/60" and the headline has to be 74 — auditable by addition. A tenth
  // in each segment is invisible in the legend and visible in the sum.
  const fitPool = Math.round(poolFactor * POOL_WEIGHT);
  const fitRoles = Math.round(roleCoverage * ROLES_WEIGHT);
  const fitSynergy = total == null ? null : Math.round(overlapRatio * SYNERGY_WEIGHT);
  const measurableTotal = measurableTotalFor(fitSynergy);
  const score = fitPool + fitRoles + (fitSynergy ?? 0);
  // ORDERED BY THE SAME FIGURE THAT IS PRINTED (#702, and it landed on main while
  // this extraction was in review). #385 took the rescale off the printed score
  // and left it on the rank, arguing a commander is no worse a suggestion for
  // EDHREC having no page for it. What that missed: the weights are 15 + 25 + 60,
  // so the rescale touches UNTRACKED commanders alone and multiplies them by 2.5
  // — and one nobody has written a page about took rank 1 with a perfect 40/40
  // beside a note reading "fit comes from pool and roles alone".
  //
  // Unrescaled, such a commander tops out at 40, which is what pool and roles
  // alone are worth. It can still beat a tracked commander scoring below 40; what
  // it can no longer do is beat one that scores above it on a measurement we
  // actually have.
  //
  // THE RULE HAD TO MOVE IN HERE RATHER THAN STAY AT THE CALL SITE. Resolving the
  // rebase the other way — keeping this function's own `Math.round((100 * score)
  // / measurableTotal)` — would have reverted #702 silently, and given the
  // discovery row the defect it had just fixed.
  const rankScore = score;

  return { fitPool, fitRoles, fitSynergy, score, measurableTotal, rankScore };
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

/**
 * Whether a card is the MELDED half of a meld pair: the one that only exists once two
 * other cards are exiled together, and which no player can start the game with.
 *
 * Scryfall marks all three cards of a meld set `layout: "meld"` — the two halves AND the
 * result — so the layout alone would drop real commanders: Bruna, the Fading Light and
 * Gisela, the Broken Blade are both meld halves and both lead decks. What separates the
 * result is that it is never CAST. It has no mana cost, and every half that is a spell
 * has one. The only halves with no cost are lands (Hanweir Battlements, Argoth, Sanctum
 * of Nature), which the land clause excludes. That makes this exact by construction
 * across every meld card in the catalog, not a heuristic: it picks out Brisela, Hanweir,
 * Mishra Lost to Phyrexia, Titania Gaea Incarnate, Ragnarok, Urza Planeswalker and
 * Chittering Host, and nothing else.
 *
 * Scryfall's own record of this is the `meld_result` component in `all_parts`, which the
 * ingest does not store. Should it ever start to, that is the better signal (#712).
 */
export function isMeldResult(card: { layout: string | null; manaCost: string | null; typeLine: string }): boolean {
  return card.layout === "meld" && !card.manaCost && !/\bland\b/i.test(frontFaceTypeLine(card.typeLine));
}

export function isCommanderCandidate(card: Pick<PoolCard, "typeLine" | "oracleText" | "manaCost"> & { layout: string | null }): boolean {
  // A melded card cannot lead a deck: it is not a card you can begin the game with, and
  // EDHREC has no page for one. Its type line reads "Legendary Creature" all the same, and
  // `commander_legal` describes deck legality rather than the right to lead one, so neither
  // check below would stop it (#712).
  if (isMeldResult(card)) return false;
  const typeLine = frontFaceTypeLine(card.typeLine);
  // Only the front face can make a card eligible to be a commander. Testing the
  // joined string lets a back face qualify a card it shouldn't, which is how
  // Westvale Abbey (a Land) ended up in the candidate pool (#79).
  if (/legendary/i.test(typeLine)) {
    if (/creature/i.test(typeLine)) return true;
    // Rule 903.3a as amended for Edge of Eternities: a legendary Vehicle or
    // Spacecraft may lead a deck. None of them says so in its text — Hearthhull,
    // the Worldseed is a "Legendary Artifact — Spacecraft" whose only hint is
    // Station's reminder that it becomes a creature at 8+ — so the subtype is
    // the whole signal, and a card that never turns into a creature at all
    // (Weatherlight, Heart of Kiran) is just as eligible.
    if (/\b(?:vehicle|spacecraft)\b/i.test(typeLine)) return true;
  }
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
  /** `pickRoleTargets`' answer for this commander. See `FitInputs.roleTargets`. */
  roleTargets: Record<RoleName, number>;
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
  // while Scryfall names it "Front // Back", so both spellings are tried.
  //
  // This is the LAST name matching in the scoring path. The overlap below used
  // to need the same handling and no longer does — it intersects oracle ids from
  // the stored index, which resolved every name when it was built. This map is
  // still keyed by name because it is still read from the live payload.
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
  const roleGaps = (Object.keys(ROLE_TARGETS) as RoleName[])
    .filter((r) => roleCounts[r] < wholeTarget(args.roleTargets[r]));

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

  // One denominator for every commander. Rescaling pool+roles from their 40-point
  // maximum back up to 100 whenever synergy data was unavailable let a commander
  // with no synergy read print 100/100 — the highest figure the UI can show,
  // awarded to the commander we know least about (#333). It also contradicted the
  // note the card already prints beside that number: "fit comes from pool and
  // roles alone". Unscaled, such a commander tops out at 40, which is what pool
  // and roles alone are worth.
  //
  // "Unavailable", not "untracked": that branch is every reason `edhrecTotal` came
  // back null, a live EDHREC outage included. `synergyState` is what tells those
  // apart, and it does so for the card's note and its Retry button rather than for
  // the arithmetic — a score is no more certain for the gap being temporary.
  // `fitSynergy` stays null either way: the component is absent, not 0.
  //
  // The arithmetic itself is `computeFit`, shared with the discovery row so the
  // two surfaces cannot drift. `pool.length` is the pool size it wants: an empty
  // collection makes an empty pool, so the `collection.length ? … : 0` guard this
  // replaced was a second spelling of `0 / 200`.
  const fit = computeFit({
    poolSize: pool.length,
    roleCounts,
    ownedSupport: edhrecOwnedCount ?? 0,
    edhrecTotal,
    roleTargets: args.roleTargets,
  });
  const { fitPool, fitRoles, fitSynergy, score, measurableTotal, rankScore } = fit;

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
