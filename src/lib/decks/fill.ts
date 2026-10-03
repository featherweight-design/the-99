import { castFaceText, playableAsLand, isLandFace } from "../cards/facet";
import type { CompositionTargets, ProfileSkeleton } from "../profile/types";
import { classifyRoles, ROLE_TARGETS } from "../recs/roles";
import { preferByTypeGap, tallyTypes, typeDeficits } from "./fill-shape";
import { isBasicLand } from "./grouping";
import { deckBodySize, landTarget } from "./deck-size";

/** `other` is the RESIDUAL — a slot past every floor and the mana base. Declared rather than
 *  reusing a role name, because those rows close nothing and labelling them as ramp or draw
 *  would claim a measurement nobody made. */
export type FillRole = "ramp" | "draw" | "removal" | "wipes" | "land" | "other";

/**
 * A card already in the deck.
 *
 * Deliberately NOT a `FillCandidate`. That shape carries `owned`, `ownedQuantity` and
 * `inclusionPct`, every one of which is a fact about whether a card should be CHOSEN — and a
 * card already sleeved is past being chosen. Requiring them would have the caller invent
 * three values nothing reads, which is how a fixture starts asserting its own defaults.
 *
 * `quantity` is here because a stacked basic is nine cards in one row and the counts this
 * seeds are counts of cards.
 */
export type HeldCard = Pick<
  FillCandidate, "typeLine" | "oracleText" | "keywords" | "layout" | "manaCost"
> & { quantity?: number };

export type FillCandidate = {
  oracleId: string; name: string; typeLine: string;
  oracleText: string | null; keywords: string[];
  /** Scryfall cost string, e.g. `{2}{G}{G}`. Read only for its coloured pips,
      which are what the basic-land split is proportioned against. */
  manaCost: string | null;
  owned: boolean;
  /**
   * Scryfall's own layout, e.g. `normal`, `modal_dfc`, `transform`.
   *
   * READ TWICE by `planFill`: `castFaceText` uses it to decide which face is classified, and
   * `playableAsLand` to decide whether the card counts as a land drop. It is carried so the
   * pool, the mapping and this shape
   * agree before the land sweeps start counting land-capable cards, which is a separate change.
   *
   * REQUIRED rather than optional: a pool query that forgets to select it is a compile error
   * here and now, rather than a silent `undefined` discovered later by a land count that is
   * quietly always zero. READ TWICE — `castFaceText` decides which face is classified, and
   * `playableAsLand` decides whether the card counts as a land drop.
   */
  layout: string;
  /** Total copies owned, summed across printings. 0 for an unowned card. */
  ownedQuantity: number;
  inclusionPct: number | null;
};

/**
 * One placed card. `role` is the floor it was filed under; `source: "staple"` marks a card the
 * staples step seeded (H25), whatever its role. A staple with no role (Swiftfoot Boots) is filed
 * `other` and is NOT residual: `isResidual` is the one test for that, so a bulk tick or a create's
 * foundation never mistakes a staple for an undoable suggestion.
 */
export type FillRow = { oracleId: string; quantity: number; role: FillRole; source?: "staple" };

/** Whether a row is the synergy residual: the suggestions a create files as undoable. */
export function isResidual(row: Pick<FillRow, "role" | "source">): boolean {
  return row.role === "other" && row.source !== "staple";
}

/**
 * What the fill could not reach. A ROLE floor or a TYPE target, because the two are different
 * axes and a reader told only "short on ramp" cannot see that the deck is also eight creatures
 * under the decks it is being compared to.
 *
 * `short` IS HOW FAR. Which axes were missed is enough to colour a cell and not enough to
 * write a sentence: the bulk controls' concession note reads `2 creatures short of
 * recommendations`, and a reader told only "short on creatures" cannot tell a deck one card
 * under from one eight cards under. Always positive — an axis that is not short is not in the
 * list at all — and measured against the same figure the filter beside it used, never
 * recomputed from a second expression that could drift from it.
 */
export type FillShortfall =
  | { kind: "role"; role: FillRole; short: number }
  | { kind: "type"; type: keyof CompositionTargets; short: number };


export type PlanFillArgs = {
  hasPartner: boolean;
  /** Null falls back to the asserted `ROLE_TARGETS` and 37/36 lands, and says so in the plan. */
  skeleton: ProfileSkeleton | null;
  /** Ranks the RESIDUAL — the slots past the role floors and the mana base. Absent leaves the
   *  pool's own preference order, which is inclusion, and is the honest default. */
  synergyRank?: Map<string, number>;
  /** Stop after this many rows. The bulk controls fill a named number of slots. */
  slots?: number;
  /** `sleeveable` takes only what the collection can supply. */
  pool?: "all" | "sleeveable";
  /**
   * WHAT THE DECK ALREADY HOLDS, so a partial fill plans against the deck in front of it.
   *
   * Every caller before the bulk control filled an EMPTY deck — `createDeck` starts with
   * nothing and `fillDeck` returns early if a single `deck_cards` row exists — so counts
   * starting at zero was right, and nothing here had to know better. `chooseBulkFill` is the
   * first caller to plan for a deck that already has cards, and with this absent it asked for
   * four slots and got the first four placements of a from-scratch 99: a deck holding twenty
   * ramp sources and no draw was offered four more ramp.
   *
   * Counted exactly as placement counts, or the two disagree at the boundary: a card credits
   * EVERY role it satisfies (§2.5a), and its type line joins the tie-break's tally.
   */
  held?: readonly HeldCard[];
  /**
   * The deck's colour identity, for the basics split.
   *
   * It has to be passed because nothing in the plan can infer it. The candidate pool is already
   * identity-filtered, so its union looks like the identity — except that a colourless card
   * contributes nothing, which is exactly the case that matters here. And the pip census cannot
   * stand in either: a Boros deck whose spells all cost generic mana has no coloured pips and is
   * still a Boros deck, which may not have Wastes.
   *
   * Absent, every basic colour in the pool is eligible, which is the filter this argument adds
   * and nothing more. It does NOT mean such a caller sees the previous behaviour: the split lost
   * its `ownedQuantity < 1` gate and its per-colour capacity cap, and gained the one-per-colour
   * floor, for every caller either way.
   */
  identity?: readonly string[];
  /**
   * The commanders' mana costs, for the pip census ONLY.
   *
   * They are not in `held` and must not be: role floors come from EDHREC support lists that never
   * contain the commander, and `actions.ts` documents that at length. But a `{2}{R}{W}` commander
   * is the most reliable colour signal a deck has, and leaving it out of the CENSUS is what scored
   * HD - Thorin at zero red pips.
   */
  commanderCosts?: readonly (string | null)[];
  /**
   * THE CATALOG'S BASIC LANDS, one per type, offered to the basics step whatever the shelf holds.
   *
   * The candidate pool is the collection (`ownedColorLegalPool` starts at `collection_items`), so a
   * Boros player with no Mountain row offered the split no `R` basic at all and every basic went to
   * Plains, however red the deck. A basic is always owned in this app and never a buy
   * (`draft-state.ts`), so the mana base may take one the player has no row for.
   *
   * A DEDICATED ARGUMENT, not more candidates: these reach ONLY the basics step and the reserve's
   * eligibility test. The role pass, the residual, a `pool: "sleeveable"` narrowing and a caller's
   * allow-list never see them, and they are never counted as bought. A type the pool already
   * holds (an owned row) is taken from the pool instead, so the player's own rows keep their
   * place in the preference order. The identity filter still applies: Wastes only in a colourless
   * deck.
   */
  basics?: readonly FillCandidate[];
  /**
   * A constraint the deck's owner asked for (Help me choose: a budget, a bracket). A card the gate
   * refuses is passed over wherever it would have been placed, exactly as a card that closes no
   * open floor is, and the fill carries on down its own order; `place` is told each card taken, in
   * the order taken, so a running constraint (money left, combos assembled) moves with the fill.
   *
   * Absent, every card is admitted, and every caller before Help me choose is unchanged.
   */
  gate?: FillGate;
  /**
   * THE DECK'S STAPLES, in the order to offer them (`loadFillStaples`: universal first, then the
   * identity condition's). Placed BEFORE the role pass, so each one credits every role it fills
   * (§2.5a) and no floor it closes is spent on something else first.
   *
   * Every rule a placed card obeys applies here too: the slot limit, `pool: "sleeveable"` (owned
   * only), and the gate. At most `FILL_STAPLE_CAP` nonland staples are placed. A LAND staple is not
   * placed by this step at all: it is preferred by the nonbasic land sweep, which owns the land
   * ceiling and the nonbasic cap, and like every land there it must be owned. (An owned staple is
   * the pool's own candidate in `buildFillPlan`, so in practice it is in the pool as well.)
   *
   * A staple may or may not also be a candidate; it is placed once either way. The caller has
   * already removed what the deck holds or may not pick (`excludeOracleIds`, `onlyOracleIds`).
   */
  staples?: readonly FillCandidate[];
};

/** The most nonland staples one fill seeds (Hugh, 2026-10-03), so a two-color condition's ~59
 *  rows cannot turn a fill into a staples deck. */
export const FILL_STAPLE_CAP = 10;

/**
 * How far below the card under the cursor the tie-break may reach, in inclusion points (H25).
 *
 * The tie-break prefers a card closing more open floors, and with nothing to bound it that
 * preference built decks of zero-inclusion dual-role cards: every ramp slot for Omnath, Locus of
 * Creation went to a ramp-and-draw card EDHREC had no figure for, over a Sol Ring at 64.7%. Inside
 * the band the gain and the type gap still decide; outside it the cursor card keeps its slot, and a
 * card with no figure never takes the slot of one with a figure.
 */
export const TIE_BREAK_INCLUSION_BAND = 10;

/** Whether the tie-break may hand `cursor`'s slot to `other` on inclusion grounds. */
function withinInclusionBand(other: FillCandidate, cursor: FillCandidate): boolean {
  if (cursor.inclusionPct == null) return true;
  if (other.inclusionPct == null) return false;
  return other.inclusionPct >= cursor.inclusionPct - TIE_BREAK_INCLUSION_BAND;
}

export type FillGate = {
  admits(candidate: FillCandidate): boolean;
  place(candidate: FillCandidate): void;
};

export type FillPlan = {
  rows: FillRow[];
  /** Total cards, counting stacked basics. */
  filled: number;
  /** Of `filled`, how many came from outside the collection. Lands never do. */
  bought: number;
  /**
   * Lands the deck can actually make a land drop with — `counts.land` PLUS the modal cards
   * whose back face is a land and whose front was not spent on another role.
   *
   * Separate from the land count because they are different facts: a modal card sleeved as
   * draw is still a land drop when the hand needs one, and a mana base measured without it
   * reads short against decklists that counted it.
   *
   * A PLACED modal spell counts here AND is charged against the land ceiling, so the sweeps
   * take one fewer basic for it. That is the §2.5a rule rather than an exception to it: the
   * card spends ONE slot and is counted once in each place that counts it. What it never does
   * is take a `role: "land"` row as well, which would be the double credit.
   */
  landCapable: number;
  /** What could not be reached, roles in role order and then types. */
  shortfalls: FillShortfall[];
  /** Whether the floors above came from decklists or from the asserted baseline. The same
   *  per-plan honesty `RoleFit.measured` carries per row. */
  measured: boolean;
  /**
   * Whether there were TYPE targets to compare against at all.
   *
   * Parallel to `measured` and NOT the same question: the role chain ends at the asserted
   * baseline, so there is always something to be short of, while the composition chain can
   * end at nothing — a commander with no derivable composition has no type targets, and the
   * ten type shortfalls are then empty for the opposite reason to a deck that met all ten.
   *
   * A reader cannot tell those apart from `shortfalls` alone, and the bulk controls' note has
   * to: `matches every recommendation` over no composition would be the strongest possible
   * claim made from no data.
   */
  measuredTypes: boolean;
};

const NON_LAND_ROLES = ["ramp", "draw", "removal", "wipes"] as const;

/**
 * How many CANDIDATES the tie-break may weigh for one slot.
 *
 * It bounds the comparisons, not the walk: the loop still steps over cards that cannot close
 * the role, because deciding that is a map lookup, and only a card it actually weighs spends
 * from the window. That is the cost worth bounding — the pool is the player's whole legal
 * collection and this runs once per placed card.
 */
const TIE_BREAK_WINDOW = 200;

/**
 * The roles a candidate fills, classified off the FRONT FACE.
 *
 * `oracle_text` holds both faces joined, so a land-backed modal card otherwise reads as ramp
 * off its back — and is then spent on the ramp floor AND counted as a land, which §2.5a names
 * as the double credit. Memoised because the role pass classifies the same card repeatedly.
 */
const roleCache = new WeakMap<FillCandidate, ReturnType<typeof classifyRoles>>();
function rolesOfCandidate(c: FillCandidate) {
  const hit = roleCache.get(c);
  if (hit) return hit;
  const roles = classifyRoles({ ...c, oracleText: castFaceText(c.oracleText, c.layout) });
  roleCache.set(c, roles);
  return roles;
}

/** The floors this fill builds to, MEASURED where the skeleton has them and asserted where it
 *  does not. Rounded for the same reason `landTarget` is: a bucket's mean is a `real`, and a
 *  fractional floor cannot be met by whole cards. */
function roleFloors(skeleton: ProfileSkeleton | null): {
  floors: Record<typeof NON_LAND_ROLES[number], number>;
  /** Whether those floors came from the skeleton. Reported rather than inferred from
   *  `roleTargets.of`: a skeleton can NAME a measured rung and still carry figures this
   *  function rejects, and a plan built to the asserted constants while claiming `measured`
   *  is the provenance lie the flag exists to prevent. */
  measured: boolean;
} {
  const t = skeleton?.roleTargets.targets;
  if (!t) return { floors: { ...ROLE_TARGETS }, measured: false };
  // The last line of defence, symmetric with `landTarget`'s. A NaN floor is not a wrong
  // number — it is no floor at all, and the role pass places nothing.
  if (!Object.values(t).every((v) => typeof v === "number" && Number.isFinite(v))) {
    return { floors: { ...ROLE_TARGETS }, measured: false };
  }
  return {
    floors: {
      ramp: Math.round(t.ramp), draw: Math.round(t.draw),
      removal: Math.round(t.removal), wipes: Math.round(t.wipes),
    },
    measured: skeleton!.roleTargets.of !== "flat",
  };
}

/** How many of the land slots non-basics may take before basics get the
    rest. A deck of nothing but basics is hamstrung, but so is one with no
    basics at all: many non-basics fix colours only by reaching for a basic, or
    tap for colourless, so a base without a basic core casts less than its land
    count suggests — and a large collection can offer far more non-basics than
    a mana base should run. The remaining slots stay reachable by them — the
    second sweep below takes them when the collection has too few basics to
    fill the base. */
const NONBASIC_LAND_CAP = 12;

/**
 * The same ceiling, MEASURED where the composition carries it.
 *
 * `identity_composition.avg_nonbasic` is exactly this figure taken over real decklists, and
 * leaving the constant in place while every other target became measured is the asserted-number
 * failure this sub-project exists to end — a mono-colour commander measuring roughly seven
 * nonbasics would still take twelve utility lands before a basic, so the fill would not be
 * building the composition it claims to build.
 *
 * Rounded and floored at 0, and never above the land ceiling itself: `avg_nonbasic` sits WITHIN
 * `avg_land`, so a bucket whose two figures disagree cannot be allowed to hand the utility
 * sweep more slots than the base has.
 */
function nonbasicCap(skeleton: ProfileSkeleton | null, landCeiling: number): number {
  const measured = skeleton?.composition?.targets.nonbasic;
  if (typeof measured !== "number" || !Number.isFinite(measured)) return NONBASIC_LAND_CAP;
  return Math.min(landCeiling, Math.max(0, Math.round(measured)));
}

const BASIC_LAND_COLORS: Record<string, string> = {
  plains: "W", island: "U", swamp: "B", mountain: "R", forest: "G", wastes: "C",
};

/** The colour a basic taps for, or null if the name is not one of the six.
    Keyed off the name rather than the oracle text because a Snow-Covered
    printing, a full-art printing and the ordinary one all share a name stem
    and must land in the same colour bucket. */
function basicLandColor(name: string): string | null {
  const stem = name.toLowerCase().replace(/^snow-covered\s+/, "").trim();
  return BASIC_LAND_COLORS[stem] ?? null;
}

/** The keys of `BASIC_LAND_COLORS`, which is the point: a pip only earns a
    basic if some basic taps for it. `C` is here because `{C}` is a true
    colourless requirement that only Wastes answers — generic costs are written
    `{2}` and match nothing below. No other mana symbol contains these letters,
    so a plain substring test is exact. */
const MANA_PIPS = ["W", "U", "B", "R", "G", "C"] as const;

/** Mana pips in a cost string, one per symbol per colour. A hybrid symbol
    counts for both its halves, which is the right weight for a mana base: the
    card can be cast off either colour, so either colour is worth having. */
function addPips(into: Map<string, number>, manaCost: string | null): void {
  if (!manaCost) return;
  for (const symbol of manaCost.match(/\{[^}]*\}/g) ?? []) {
    for (const color of MANA_PIPS) {
      if (symbol.includes(color)) into.set(color, (into.get(color) ?? 0) + 1);
    }
  }
}

/** Splits `slots` across `colors` in proportion to `weights`, by largest
    remainder so the parts sum to exactly `slots`. Colours the deck casts
    nothing off get no basics; a deck with no coloured pips at all splits
    evenly, which is the only sensible reading of a colourless cost sheet. */
function splitByWeight(colors: string[], weights: Map<string, number>, slots: number): Map<string, number> {
  const total = colors.reduce((n, c) => n + (weights.get(c) ?? 0), 0);
  const share = (c: string) => (total > 0 ? ((weights.get(c) ?? 0) / total) * slots : slots / colors.length);
  const out = new Map(colors.map((c) => [c, Math.floor(share(c))]));
  let remaining = slots - [...out.values()].reduce((n, v) => n + v, 0);
  const byRemainder = [...colors].sort((a, b) => (share(b) % 1) - (share(a) % 1) || a.localeCompare(b));
  for (const color of byRemainder) {
    if (remaining <= 0) break;
    out.set(color, out.get(color)! + 1);
    remaining--;
  }
  return out;
}

/** Owned first, then inclusion descending, absent last, then name. Owned wins
    outright: a bought card is only ever here because the collection ran out,
    which is the promise Shopping makes about every row it prints. */
function byPreference(a: FillCandidate, b: FillCandidate): number {
  if (a.owned !== b.owned) return a.owned ? -1 : 1;
  if (a.inclusionPct !== b.inclusionPct) {
    if (a.inclusionPct == null) return 1;
    if (b.inclusionPct == null) return -1;
    return b.inclusionPct - a.inclusionPct;
  }
  return a.name.localeCompare(b.name);
}

/** Gap report 4. The selection is placed first and the 68-card fill runs
    against what is left, so a card the player picked is not also placed for a
    role and the deck does not land at 98.

    Generic over the row shape because it is applied twice — once to the owned
    pool and once to the unowned staples — and those two have different types.

    The consequence is deliberate and worth stating: the fill's role counts can
    come out different from the zero-selection case, because a selected ramp
    card closes a ramp gap the fill would have closed with something else. The
    provenance line reads the counts off the placed rows, so it follows. */
export function dedupeSelectionFromPool<T extends { oracleId: string }>(
  pool: T[],
  selectedOracleIds: Iterable<string>,
): T[] {
  const picked =
    selectedOracleIds instanceof Set ? selectedOracleIds : new Set(selectedOracleIds);
  if (picked.size === 0) return pool;
  return pool.filter((c) => !picked.has(c.oracleId));
}

/**
 * What a create or a retry writes: the rows it was given, in order, until the body is full. A stack
 * that overruns the cap is TRUNCATED, not dropped, since skipping it would leave the deck short with
 * room still on the table (two slots left and a stack of four Forests next would spend neither).
 * Quantities are summed, not rows counted, because `planFill` stacks basics.
 *
 * One rule for both paths. `buildFillPlan` already sizes the plan to the slots a selection or a
 * build-around card leaves, so on those paths the cap normally takes nothing; it stays as the
 * rule the body obeys, for any caller that sizes the plan otherwise.
 */
export function capToBody<T extends { quantity: number }>(rows: readonly T[], bodySize: number): T[] {
  const capped: T[] = [];
  let built = 0;
  for (const row of rows) {
    const quantity = Math.min(row.quantity, bodySize - built);
    if (quantity <= 0) break;
    capped.push({ ...row, quantity });
    built += quantity;
  }
  return capped;
}

export function planFill(candidates: FillCandidate[], args: PlanFillArgs): FillPlan {
  const {
    hasPartner, skeleton, synergyRank, slots, pool = "all", held, gate, identity, commanderCosts,
    basics, staples,
  } = args;
  const admits = (c: FillCandidate) => gate?.admits(c) ?? true;
  const { floors, measured } = roleFloors(skeleton);
  const landCeiling = landTarget(hasPartner, skeleton);
  const bodySize = deckBodySize(hasPartner);
  const limit = slots ?? bodySize;
  const usable = pool === "sleeveable" ? candidates.filter((c) => c.owned) : candidates;
  const ordered = [...usable].sort(byPreference);
  // One entry per oracle id, the most-preferred one, because `ordered` is
  // already sorted and the first write wins. Both a row's cost lookup and the
  // land sweeps read through this, so a duplicated id resolves to the same
  // card everywhere and can never be taken twice.
  const byOracleId = new Map<string, FillCandidate>();
  for (const candidate of ordered) {
    if (!byOracleId.has(candidate.oracleId)) byOracleId.set(candidate.oracleId, candidate);
  }
  // A staple the pool does not carry (an unowned catalog row) still needs its cost read for the
  // pip census and its modal back read for the land drops, both of which go through this map.
  for (const staple of staples ?? []) {
    if (!byOracleId.has(staple.oracleId)) byOracleId.set(staple.oracleId, staple);
  }
  const spent = new Set<string>();
  /** CARDS, not rows — a stacked basic is nine cards in one row, and a limit counted in rows
   *  would let a `slots: 5` build arrive with forty. One definition, read by every pass. */
  const filledSoFar = () => rows.reduce((n, r) => n + r.quantity, 0);
  const rows: FillRow[] = [];
  const counts: Record<FillRole, number> = {
    ramp: 0, draw: 0, removal: 0, wipes: 0, land: 0, other: 0,
  };
  // Seeded from the deck's own cards before a single candidate is considered, so `counts[r] <
  // floors[r]` below asks "is this role still short IN THIS DECK" rather than "in a deck that
  // does not exist". A held card is credited to every role it satisfies, the same rule the
  // placement loop applies at :377.
  for (const card of held ?? []) {
    const roles = classifyRoles({
      ...card, oracleText: castFaceText(card.oracleText, card.layout),
    });
    for (const role of roles) counts[role] += card.quantity ?? 1;
  }

  // THE TYPE TIE-BREAK's inputs, recomputed as cards are placed. Role floors and type targets
  // are different axes that collide through the cards satisfying both: in a large collection
  // ten ramp is ten mana rocks, while the median commander wants eleven artifacts in the WHOLE
  // deck. The ramp slot alone can spend the entire artifact budget, and an overshoot is
  // permanent — a later pass can add a missing creature, nothing removes a surplus artifact.
  const placed: { typeLine: string; quantity: number }[] = (held ?? []).map((c) => ({
    typeLine: c.typeLine, quantity: c.quantity ?? 1,
  }));
  const typeTargets = skeleton?.composition?.targets ?? null;
  let scanned = TIE_BREAK_WINDOW;

  // THE STAPLES STEP (H25), before any floor is weighed. Placed exactly as the role pass places a
  // card: spent, told to the gate, credited to every role it fills, its type tallied. Its row is
  // filed under its first role, or `other`, and carries `source: "staple"` either way.
  const stapleLandIds = new Set<string>();
  let staplesPlaced = 0;
  for (const staple of staples ?? []) {
    if (staplesPlaced >= FILL_STAPLE_CAP || filledSoFar() >= limit) break;
    if (spent.has(staple.oracleId)) continue;
    if (pool === "sleeveable" && !staple.owned) continue;
    const roles = rolesOfCandidate(staple);
    if (roles.includes("land")) { stapleLandIds.add(staple.oracleId); continue; }
    if (!admits(staple)) continue;
    spent.add(staple.oracleId);
    gate?.place(staple);
    for (const r of NON_LAND_ROLES) if (roles.includes(r)) counts[r]++;
    placed.push({ typeLine: staple.typeLine, quantity: 1 });
    rows.push({
      oracleId: staple.oracleId, quantity: 1,
      role: NON_LAND_ROLES.find((r) => roles.includes(r)) ?? "other", source: "staple",
    });
    staplesPlaced += 1;
  }

  // AN INDEX, NOT A `for…of`, and the difference is a whole role going unfilled. The tie-break
  // can spend a DIFFERENT card than the one under the cursor, and a `for…of` then advances past
  // the candidate anyway — so with ten ramp cards, a floor of ten and a tie-break that prefers
  // five of them, the pass places five, reports a ramp shortfall, and leaves the other five
  // unspent for the residual to sleeve as `other`. The cursor advances only when the card under
  // it was actually taken.
  //
  // It still terminates: every iteration either advances the cursor or spends a card, and both
  // are bounded by the pool.
  let i = 0;
  while (i < ordered.length) {
    const candidate = ordered[i]!;
    // Every non-land role is closed, so the rest of the pool can only be
    // classified and discarded — and the pool is the player's whole legal
    // collection, which for a large one is thousands of candidates.
    if (NON_LAND_ROLES.every((r) => counts[r] >= floors[r])) break;
    if (filledSoFar() >= limit) break;
    if (spent.has(candidate.oracleId)) { i += 1; continue; }
    if (!admits(candidate)) { i += 1; continue; }
    const roles = rolesOfCandidate(candidate);
    // Spent on the first role it can close, in ramp→draw→removal→wipes order —
    // the coverage-panel order. This deliberately diverges from suggestDeck's
    // classifyRoles push order (land, ramp, draw, wipes, removal): a card that
    // classifies as both wipes and removal is spent on removal here, wipes there.
    // The fill has no obligation to reproduce suggestDeck's ordering — ruling:
    // the panel order wins, because a user reading the filled deck against the
    // coverage panels should see the same sequence in both.
    // A land is never spent on a non-land role. classifyRoles excludes lands
    // from `ramp` alone, so a land that draws or wipes would otherwise be taken
    // here — bought, if the player does not own it, against the promise the
    // land pass makes below — and then skipped as spent, leaving the mana base
    // short by exactly the cards that should have filled it.
    if (roles.includes("land")) { i += 1; continue; }
    const open = NON_LAND_ROLES.filter((r) => roles.includes(r) && counts[r] < floors[r]);
    if (open.length === 0) { i += 1; continue; }

    // THE BEST REMAINING CARD FOR THIS ROLE, not merely the next one that fits. The pool is
    // already in preference order, so this looks ahead only among the cards that could close
    // the SAME first open role and prefers the one closing the larger type gap.
    const deficits = typeDeficits(typeTargets, tallyTypes(placed));
    const firstOpen = open[0];
    /** How many still-open floors this card would close in its one slot. §2.5a: the targets
     *  describe decks with a card counted under each role it fills, so a card closing two of
     *  them is not a tie with one that closes one — it is a strictly better use of the slot,
     *  and it outranks the type gap for that reason. Without this the tie-break could hand the
     *  slot to a single-role card on type grounds and then spend a SECOND slot on the floor the
     *  dual-role card would have closed for free. */
    const closes = (x: FillCandidate) => {
      const r = rolesOfCandidate(x);
      return NON_LAND_ROLES.filter((n) => r.includes(n) && counts[n] < floors[n]).length;
    };
    let chosen = candidate;
    if (deficits.size > 0) {
      for (const other of ordered) {
        if (other === candidate || spent.has(other.oracleId) || !admits(other)) continue;
        const otherRoles = rolesOfCandidate(other);
        if (otherRoles.includes("land") || !otherRoles.includes(firstOpen)) continue;
        // WITHIN THE OWNERSHIP TIER. `byPreference` makes owned the first and absolute
        // preference, so crossing it here lets the tie-break BUY a staple over a card the
        // player already has — a type gap is a reason to prefer one card to another, never a
        // reason to spend money. The owned card would have been left unused.
        if (other.owned !== candidate.owned) continue;
        // AND WITHIN THE INCLUSION BAND, for the same reason one tier further down: closing a
        // second floor is a reason to prefer one well-played card to another, never a reason to
        // take a card nobody plays over one most decks do.
        if (!withinInclusionBand(other, candidate)) continue;
        const gain = closes(other) - closes(chosen);
        if (gain < 0) { if (--scanned <= 0) break; continue; }
        if (gain > 0) { chosen = other; if (--scanned <= 0) break; continue; }
        if (preferByTypeGap(other, chosen, deficits) < 0) chosen = other;
        // BOUNDED. The pool is the player's whole legal collection and this runs once per
        // placed card; scanning it whole would be quadratic on a large one. The window is
        // generous enough to hold real alternatives and small enough to stay linear.
        if (--scanned <= 0) break;
      }
      scanned = TIE_BREAK_WINDOW;
    }

    // THE ROW'S ROLE IS THE FIRST FLOOR *THIS CARD* CLOSES, recomputed for `chosen` rather than
    // inherited from the candidate under the cursor. They differ whenever the tie-break swaps:
    // a chosen card that closes ramp as well as draw was being filed under draw, because `draw`
    // was the first open role of a different card.
    const chosenRoles = rolesOfCandidate(chosen);
    const role = NON_LAND_ROLES.find((r) => chosenRoles.includes(r) && counts[r] < floors[r])
      ?? firstOpen;

    spent.add(chosen.oracleId);
    gate?.place(chosen);
    // EVERY ROLE IT SATISFIES, one slot spent. Spec §2.5a: the targets describe decks with a
    // card counted under each role it fills, so crediting one role would make this fill place
    // two cards where the decklists behind the target counted one.
    for (const r of NON_LAND_ROLES) if (chosenRoles.includes(r)) counts[r]++;
    placed.push({ typeLine: chosen.typeLine, quantity: 1 });
    rows.push({ oracleId: chosen.oracleId, quantity: 1, role });
    if (chosen === candidate) i += 1;
  }

  // MODAL LAND DROPS COUNT AGAINST THE BASE BEFORE THE SWEEPS RUN. A card sleeved as draw whose
  // back is a land is a land drop, so a target of 36 met by 36 basics PLUS one modal card is 37
  // drops — one more than the decklists behind the target ran. The sweeps take the remainder,
  // and the card still keeps its non-land role, which is the §2.5a rule rather than an
  // exception to it: it spends ONE slot and is counted once in each place that counts.
  // HELD CARDS COUNT TOO. A land-backed MDFC already in the deck is already a land drop, so
  // a plan blind to it takes the whole ceiling again and hands the deck one land too many
  // while reporting a shortfall it does not have.
  const heldModalDrops = (held ?? []).reduce(
    (n, c) => n + (playableAsLand(c.typeLine, c.layout) ? (c.quantity ?? 1) : 0), 0,
  );
  const modalDrops = heldModalDrops + rows.filter((r) => {
    if (r.role === "land") return false;
    const c = byOracleId.get(r.oracleId);
    return c ? playableAsLand(c.typeLine, c.layout) : false;
  }).length;
  const landCeilingAfterModals = Math.max(0, landCeiling - modalDrops);

  // Lands come from the collection alone — never bought, at any point below.
  // Drawn from the deduplicated index rather than from `ordered`, because
  // three sweeps read this list and a duplicated oracle id would otherwise be
  // taken once per sweep and double-counted in the per-colour capacity.
  // A LAND STAPLE FIRST (H25), then the pool's own order. Stable, so everything else keeps the
  // preference order it had.
  const lands = [...byOracleId.values()].filter(
    (c) => c.owned && !spent.has(c.oracleId) && rolesOfCandidate(c).includes("land"),
  ).sort((a, b) => Number(stapleLandIds.has(b.oracleId)) - Number(stapleLandIds.has(a.oracleId)));
  /** Every basic the basics step may take: the pool's own, then each catalog basic the pool does
   *  not already hold (`basics`). Only the basics step and the reserve read this. */
  const basicSource = [
    ...lands.filter((c) => isBasicLand(c.typeLine)),
    ...(basics ?? []).filter((c) => !byOracleId.has(c.oracleId) && isBasicLand(c.typeLine)),
  ];
  /** Returns what it actually took. THE LIMIT BINDS HERE TOO: `slots` means "fill this many
   *  cards", and a sweep that ignored it made `slots: 5` return 42 — the three land passes
   *  between the role pass and the residual were the only ones not reading it. */
  const takeLand = (candidate: FillCandidate, quantity: number): number => {
    const room = Math.max(0, limit - filledSoFar());
    const take = Math.min(quantity, room);
    if (take <= 0 || !admits(candidate)) return 0;
    spent.add(candidate.oracleId);
    gate?.place(candidate);
    counts.land += take;
    rows.push({ oracleId: candidate.oracleId, quantity: take, role: "land" });
    return take;
  };

  // Utility lands first, one copy each and capped, so the mana base is not
  // 37 copies of one basic — the shape this fill used to produce whenever a
  // player owned a playset of anything.
  for (const candidate of lands) {
    if (counts.land >= Math.min(nonbasicCap(skeleton, landCeiling), landCeilingAfterModals)) break;
    if (filledSoFar() >= limit) break;
    if (isBasicLand(candidate.typeLine)) continue;
    takeLand(candidate, 1);
  }

  // THE BASICS ARE CHOSEN LAST, after every spell, because the split is weighted by the pips of
  // the FINISHED deck. They used to run here, before the residual — so the census saw the role
  // rows and nothing else: not the commanders (deliberately absent from `held`) and not the
  // residual (pushed later). On a fresh Boros deck that is ~29 cards, ramp mostly colourless
  // artifacts, and HD - Thorin scored ZERO red pips.
  //
  // The slots are RESERVED here so the residual cannot eat them, and filled below.
  const wantsColor = (color: string): boolean => {
    if (identity === undefined) return true;
    if (color === "C") return identity.length === 0;
    return identity.includes(color);
  };
  // BOUNDED BY WHAT THE LAND STEPS BELOW COULD ACTUALLY TAKE, and by the slots the caller asked
  // for. Reserving the whole mana base unconditionally starved a `slots: 1` top-off: the residual
  // broke on a negative budget and the plan returned nothing at all.
  //
  // WHAT THEY CAN TAKE is unbounded when an eligible basic exists (a basic is never capped at the
  // copies owned), and otherwise it is the unspent lands the fallback sweep may still take, one copy
  // each, that the gate admits. Keying the reserve on basic PRESENCE alone reserved nothing for a pool of spells and
  // nonbasic lands with no basic: the residual ate every slot past the utility cap and the deck
  // finished on 12 lands with 28 legal ones unplayed.
  const anyEligibleBasic = basicSource.some((c) => {
    if (!admits(c)) return false;
    const color = basicLandColor(c.name);
    return color !== null && wantsColor(color);
  });
  const sweepCapacity = anyEligibleBasic
    ? Infinity
    : lands.filter((c) => {
      // What the gate refuses, `takeLand` refuses, and a slot reserved for it is lost: nothing
      // after the sweep refills what the reserve kept from the residual.
      if (spent.has(c.oracleId) || !admits(c)) return false;
      const color = isBasicLand(c.typeLine) ? basicLandColor(c.name) : null;
      return color === null || wantsColor(color);
    }).length;
  const basicsReserve = Math.max(0, Math.min(
    landCeilingAfterModals - counts.land, limit - filledSoFar(), sweepCapacity,
  ));
  /** Where the land rows must end and the residual begin, for the truncation rule below. */
  const residualStart = rows.length;

  // THE RESIDUAL, AFTER THE LAND SWEEPS. `createDeck` truncates the tail, so a residual placed
  // with the non-land roles would see the MANA BASE cut on any build carrying a `?select=`
  // picks list — the deck would arrive with its spells and no way to cast them.
  //
  // Ranked on synergy where the caller supplied a ranking, and otherwise left in the pool's own
  // preference order, which is inclusion. Role `"other"`: these slots close no floor, and
  // labelling them as one would claim a measurement nobody made.
  const residualOrder = synergyRank
    ? [...ordered].sort(
        (a, b) => (synergyRank.get(b.oracleId) ?? 0) - (synergyRank.get(a.oracleId) ?? 0),
      )
    : ordered;
  // The residual runs AFTER the sweeps, so its own modal cards are land drops the base has
  // already been built without. Tracked here for the same reason the role pass's are charged
  // to the ceiling: a target of 36 met by 36 basics plus a residual modal card is 37 drops.
  let residualDrops = 0;
  for (const candidate of residualOrder) {
    // MINUS THE RESERVE, or the residual spends the mana base's slots on spells.
    if (filledSoFar() >= limit - basicsReserve) break;
    if (spent.has(candidate.oracleId)) continue;
    if (rolesOfCandidate(candidate).includes("land")) continue;
    // A land-capable card is passed over once the base is full. It is not lost — the role pass
    // above had first refusal on it and took it if a floor was open — and the slot goes to a
    // card that is only a spell, which is what a deck with its mana base already down wants.
    // PLUS THE RESERVE, and the reserve YIELDS. `counts.land` no longer holds the basics — they
    // are taken after this loop — so without the reserve here the guard under-counts the base and
    // admits modal cards past the ceiling (measured: `landCapable` 70 against a ceiling of 36).
    //
    // THE RESERVE IS COUNTED, AND THE TEST IS `>=`. This restructure moved WHEN the basics' colours
    // are decided, never HOW MANY basics there are: the land composition has to come out exactly as
    // it does before it. The reserve is what the basics will take, so counting it here is standing
    // in for the rows this guard used to read out of `counts.land` — and the residual then admits
    // exactly the land drops it admitted when the basics were already placed, which on a 40-modal
    // pool is none.
    //
    // Both other readings are silent, and both were measured. Dropping the reserve bounds the
    // drops against an empty base, so the residual takes every land slot: 0 basics and 37 drops
    // where `origin/main` composes 27 and 10. Keeping the reserve but decrementing it per drop
    // under `>` lets the two cancel exactly, so the guard can never fire at all and `landCapable`
    // reaches 65 against a ceiling of 37.
    //
    // A DROP IS THEREFORE ONLY EVER ADMITTED WHEN THE RESERVE IS ALREADY ZERO. The reserve is
    // `min(landCeilingAfterModals - counts.land, limit - filledSoFar())`: at the first the sum
    // below already equals the ceiling, and at the second the `limit` break above has fired. So
    // the only pool that reaches here is one holding no basic this deck can cast — which is the
    // case `landCeilingAfterDrops` exists for, since the fallback sweep takes any unspent land.
    if (playableAsLand(candidate.typeLine, candidate.layout)
      && counts.land + basicsReserve + modalDrops + residualDrops >= landCeiling) continue;
    if (!admits(candidate)) continue;
    if (playableAsLand(candidate.typeLine, candidate.layout)) residualDrops += 1;
    spent.add(candidate.oracleId);
    gate?.place(candidate);
    placed.push({ typeLine: candidate.typeLine, quantity: 1 });
    rows.push({ oracleId: candidate.oracleId, quantity: 1, role: "other" });
  }

  // Basics take the rest, split across the colours the FINISHED deck actually costs. A basic is
  // NOT capped at the copies owned: the app treats a basic as always owned and never a buy, so
  // the mana base asks for what the deck needs and the shopping list bills none of it.
  const pips = new Map<string, number>();
  // THE COMMANDERS FIRST, census only. Absent from `held` by design (role floors come from
  // support lists that never contain the commander) and the single most colour-defining cards in
  // the deck — leaving them out is half of why Thorin scored no red.
  for (const cost of commanderCosts ?? []) addPips(pips, cost);
  for (const card of held ?? []) {
    if (isLandFace(card.typeLine)) continue;
    for (let i = 0; i < (card.quantity ?? 1); i += 1) addPips(pips, card.manaCost);
  }
  // EVERY spell row, roles AND residual. The residual is a third of a fresh deck and it used to
  // be invisible here, because this block ran before it.
  for (const row of rows) {
    if (row.role === "land") continue;
    addPips(pips, byOracleId.get(row.oracleId)?.manaCost ?? null);
  }
  /**
   * WHICH BASICS MAY BE TAKEN, and it is decided by the deck's IDENTITY rather than by what the
   * shelf holds. Three rules, each of which was a defect the other way round.
   *
   * WASTES ONLY IN A COLOURLESS DECK (Hugh, 2026-09-28). The root cause is that Wastes' colour
   * identity is EMPTY, and `[].every(…)` is `true` — so it passes every identity filter in the
   * app by construction, including `ownedColorLegalPool`'s. Nothing upstream can exclude it and
   * nothing upstream should: Wastes is legal in any deck, and the suggestion and quick-add
   * surfaces are right to offer it. It is only the MANA BASE that must not choose it for a
   * coloured deck, so the exclusion belongs here and nowhere else.
   *
   * A BASIC'S ELIGIBILITY DOES NOT DEPEND ON HOW MANY COPIES ARE TO HAND. The app already treats
   * a basic as always owned and never a buy — `draft-state.ts` forces `owned` for a basic, and the
   * shopping figures never bill one. Gating on `ownedQuantity` here contradicted that: a colour
   * with no copies on the shelf vanished from the census, and its slots were handed to whatever
   * colour did have copies.
   *
   * It is the QUANTITY that is dropped, not the `owned` flag. Reading every candidate regardless
   * of `owned` was the first attempt and it REGRESSED the modal-land case: it added a land colour,
   * the base then filled to its ceiling, and the residual refused a land-backed modal card that
   * had been earning its slot as a spell — `probe:fill`'s sections 3 and 4, which is how it was
   * caught. An unowned basic is not in the pool to begin with (the staples list carries none), so
   * `lands`' own `owned` filter costs this nothing. A basic type the player owns no row of arrives
   * through `basics` instead (`basicSource`), and only here.
   *
   * ONLY COLOURS IN THE IDENTITY. A basic for a colour the deck cannot cast is never right, and
   * the pool's own filter admits one whenever the identity is wider than the deck's costs.
   */
  /**
   * The land ceiling as the BASICS see it. The residual above may have sleeved land-backed modal
   * cards, and each one is a land drop the basics no longer have to supply. `landCeilingAfterModals`
   * counts only the drops known before the residual ran, so allocating against it would add those
   * cards on top of a full basic count rather than in place of part of it.
   */
  const landCeilingAfterDrops = Math.max(0, landCeilingAfterModals - residualDrops);

  const basicsByColor = new Map<string, FillCandidate[]>();
  for (const candidate of basicSource) {
    if (spent.has(candidate.oracleId)) continue;
    const color = basicLandColor(candidate.name);
    if (!color || !wantsColor(color)) continue;
    basicsByColor.set(color, [...(basicsByColor.get(color) ?? []), candidate]);
  }
  const colors = [...basicsByColor.keys()].sort();
  if (colors.length > 0 && counts.land < landCeilingAfterDrops) {
    /**
     * EVERY IDENTITY COLOUR GETS AT LEAST ONE, where there is room for one (Hugh, 2026-09-28).
     * A colour whose pips round to a zero share still has to be castable, and a mana base that
     * omits a colour the deck plays is worse than one that under-weights it.
     */
    const slotsForBasics = landCeilingAfterDrops - counts.land;
    const allocated = splitByWeight(colors, pips, slotsForBasics);
    //
    // WHY POOL ORDER MUST NOT DECIDE THIS. With ONE starved colour the rule is invisible: drop it,
    // the base comes out a slot short, and the fallback sweep below takes the next unspent land —
    // which happens to be that colour's basic. Same answer by luck.
    //
    // With TWO starved colours it stops being luck. Two printings of the first sit ahead of the
    // second in the pool, the base is two short, and the fallback takes both of the FIRST colour —
    // so the second never gets a source. Assigning one slot per starved colour here, before any
    // take, is what makes the outcome a rule rather than an artefact of candidate order.
    const zero = colors.filter((c) => allocated.get(c)! === 0);
    for (const color of zero) {
      // Taken from the largest allocation, so the floor costs the colour that can spare it.
      const donor = [...colors].sort((a, b) => allocated.get(b)! - allocated.get(a)!)[0];
      if (donor === undefined || allocated.get(donor)! <= 1) break;
      allocated.set(donor, allocated.get(donor)! - 1);
      allocated.set(color, 1);
    }
    // NO CAPACITY CAP, so no spare to redistribute. The loop that used to hand a capped colour's
    // leftovers to "whichever colours still have copies, heaviest first" is GONE with it — it
    // checked capacity and pip order only, never the identity and never whether the receiving
    // colour's weight was zero, which is how a Boros deck's eighteen Plains spilled six Wastes.
    for (const color of colors) {
      let room = allocated.get(color)!;
      const types = basicsByColor.get(color)!;
      // SPREAD ACROSS THE BASIC TYPES THE PLAYER OWNS, and let the MOST PREFERRED absorb the rest.
      //
      // These are distinct ORACLE IDS — `Plains` and `Snow-Covered Plains`, not two printings of
      // one card; `ownedQuantity` is already summed across printings. `byPreference` orders them
      // owned-first then inclusion then name, so index 0 is the one the player would rather play.
      //
      // Giving the surplus to the LAST element was the first version, and it is the least
      // preferred: a player owning 10 Plains and 2 Snow-Covered Plains needing 37 white sources
      // got 27 Snow-Covered and 10 Plains. The surplus belongs on the preferred type.
      const othersCapacity = types.slice(1)
        .reduce((n, cand) => n + Math.max(0, cand.ownedQuantity), 0);
      for (let i = 0; i < types.length; i += 1) {
        if (room <= 0 || filledSoFar() >= limit) break;
        const want = i === 0
          ? Math.min(room, Math.max(types[0].ownedQuantity, room - othersCapacity))
          : Math.min(types[i].ownedQuantity, room);
        if (want <= 0) continue;
        room -= takeLand(types[i], want);
      }
    }
  }

  // The collection had too few basics to finish the base, so the cap lifts and
  // the remaining utility lands take what is left.
  //
  // THE IDENTITY RULE BINDS HERE TOO, and this is where the Boros deck's Wastes would otherwise
  // come back. This sweep takes whatever land is next unspent, checking only the ceiling — so a
  // base left short by the split could still finish itself on Wastes or on a basic for a colour
  // the deck cannot cast. Guarding only the split left the same defect alive in a second loop,
  // which a mutation of the floor rule is what surfaced: the floor looked untested because THIS
  // sweep was quietly supplying the missing basic.
  for (const candidate of lands) {
    if (counts.land >= landCeilingAfterDrops) break;
    if (filledSoFar() >= limit) break;
    if (spent.has(candidate.oracleId)) continue;
    const basicColor = isBasicLand(candidate.typeLine) ? basicLandColor(candidate.name) : null;
    if (basicColor !== null && !wantsColor(basicColor)) continue;
    takeLand(candidate, 1);
  }

  // LAND ROWS BEFORE THE RESIDUAL. `createDeck` truncates the tail, so a mana base sitting after
  // the residual would be the part cut on any build carrying a `?select=` picks list — the deck
  // would arrive with its spells and no way to cast them. The basics are DECIDED last and ORDERED
  // first, which is what lets the census see the whole deck without changing what truncation eats.
  if (rows.length > residualStart) {
    const landsAfter = rows.splice(residualStart).reduce<{ land: FillRow[]; rest: FillRow[] }>(
      (acc, r) => { (r.role === "land" ? acc.land : acc.rest).push(r); return acc; },
      { land: [], rest: [] },
    );
    rows.push(...landsAfter.land, ...landsAfter.rest);
  }

  // A modal card whose back is a land is a land DROP even when its front was sleeved as draw —
  // but only when the front was NOT spent on another role, or the same card would take a role
  // slot and a land slot, which is the double credit §2.5a forbids.
  // Recomputed over the FINAL rows rather than reusing `modalDrops`: the residual runs after
  // that count is taken and can sleeve modal cards of its own, and those are land drops too.
  const landCapable = counts.land + heldModalDrops + rows.filter((r) => {
    if (r.role === "land") return false;
    const c = byOracleId.get(r.oracleId);
    return c ? playableAsLand(c.typeLine, c.layout) : false;
  }).length;

  const haveTypes = tallyTypes(placed);
  const boughtIds = new Set(
    [...candidates, ...(staples ?? [])].filter((c) => !c.owned).map((c) => c.oracleId),
  );
  return {
    rows,
    filled: rows.reduce((n, r) => n + r.quantity, 0),
    bought: rows.filter((r) => boughtIds.has(r.oracleId)).reduce((n, r) => n + r.quantity, 0),
    landCapable,
    measured,
    measuredTypes: typeTargets !== null,
    shortfalls: [
      ...NON_LAND_ROLES.filter((r) => counts[r] < floors[r])
        .map((role) => ({ kind: "role" as const, role, short: floors[role] - counts[role] })),
      // Against the ceiling the sweeps actually built to, which the modal drops already
      // reduced — otherwise a base that is complete in PLAY reports itself short by exactly
      // the cards that completed it.
      // `landCapable` rather than `counts.land + modalDrops`: the residual runs after that
      // count is taken and can sleeve modal cards of its own, so a base the residual completed
      // still reported itself short by exactly the cards that completed it.
      ...(landCapable < landCeiling
        ? [{ kind: "role" as const, role: "land" as const, short: landCeiling - landCapable }]
        : []),
      // TYPES TOO. A deck can meet every role floor and still sit eight creatures under the
      // decklists it is measured against, and a reader told only about roles cannot see it.
      // THE THREE LAND AXES ARE EXCLUDED, because `placed` only ever holds the non-land rows —
      // the role pass and the residual both skip lands, so `land`, `basic` and `nonbasic` read
      // 0 whatever the mana base did, and a deck that met its land target exactly still
      // reported all three short. The land shortfall is the `role: "land"` row above, which is
      // measured against the count the sweeps actually took.
      ...(typeTargets
        ? (Object.keys(typeTargets) as (keyof CompositionTargets)[])
            .filter((type) => type !== "land" && type !== "basic" && type !== "nonbasic")
            .filter((type) => haveTypes[type] < typeTargets[type])
            .map((type) => ({
              kind: "type" as const,
              type,
              short: typeTargets[type] - haveTypes[type],
            }))
        : []),
    ],
  };
}
