import { castFaceText, playableAsLand } from "../cards/facet";
import type { CompositionTargets, ProfileSkeleton } from "../profile/types";
import { classifyRoles, ROLE_TARGETS } from "../recs/roles";
import { preferByTypeGap, tallyTypes, typeDeficits } from "./fill-shape";
import { isBasicLand } from "./grouping";
import { deckBodySize, landTarget } from "./deck-size";

/** `other` is the RESIDUAL — a slot past every floor and the mana base. Declared rather than
 *  reusing a role name, because those rows close nothing and labelling them as ramp or draw
 *  would claim a measurement nobody made. */
export type FillRole = "ramp" | "draw" | "removal" | "wipes" | "land" | "other";

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
   * `planFill` DOES NOT READ THIS YET. It is carried so the pool, the mapping and this shape
   * agree before the land sweeps start counting land-capable cards, which is a separate change.
   *
   * REQUIRED rather than optional, and that is the point of carrying it early: a pool query
   * that forgets to select it is a compile error here and now, rather than a silent
   * `undefined` discovered later by a land count that is quietly always zero.
   */
  layout: string;
  /** Total copies owned, summed across printings. 0 for an unowned card. */
  ownedQuantity: number;
  inclusionPct: number | null;
};

export type FillRow = { oracleId: string; quantity: number; role: FillRole };

/**
 * What the fill could not reach. A ROLE floor or a TYPE target, because the two are different
 * axes and a reader told only "short on ramp" cannot see that the deck is also eight creatures
 * under the decks it is being compared to.
 */
export type FillShortfall =
  | { kind: "role"; role: FillRole }
  | { kind: "type"; type: keyof CompositionTargets };

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
   */
  landCapable: number;
  /** What could not be reached, roles in role order and then types. */
  shortfalls: FillShortfall[];
  /** Whether the floors above came from decklists or from the asserted baseline. The same
   *  per-plan honesty `RoleFit.measured` carries per row. */
  measured: boolean;
};

const NON_LAND_ROLES = ["ramp", "draw", "removal", "wipes"] as const;

/** The floors this fill builds to, MEASURED where the skeleton has them and asserted where it
 *  does not. Rounded for the same reason `landTarget` is: a bucket's mean is a `real`, and a
 *  fractional floor cannot be met by whole cards. */
/** How far the tie-break looks for a better card for the SAME role. The pool is the player's
 *  whole legal collection and this runs once per placed card, so an unbounded scan is
 *  quadratic on a large one. Wide enough to hold real alternatives, small enough to stay
 *  linear in practice. */
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

function roleFloors(skeleton: ProfileSkeleton | null): Record<typeof NON_LAND_ROLES[number], number> {
  const t = skeleton?.roleTargets.targets;
  if (!t) return { ...ROLE_TARGETS };
  return {
    ramp: Math.round(t.ramp), draw: Math.round(t.draw),
    removal: Math.round(t.removal), wipes: Math.round(t.wipes),
  };
}

/** What a fill reaches for: every role target plus the land target. `planFill`
    stops at each target and never exceeds it, so this is the plan's ceiling and
    the number the commander page can promise before any query has run. Derived
    rather than written down, because a target that moves must move the promise
    with it. */
export function fillBaselineTotal(hasPartner: boolean): number {
  return NON_LAND_ROLES.reduce((n, r) => n + ROLE_TARGETS[r], 0) + landTarget(hasPartner);
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

export function planFill(candidates: FillCandidate[], args: PlanFillArgs): FillPlan {
  const { hasPartner, skeleton, synergyRank, slots, pool = "all" } = args;
  const floors = roleFloors(skeleton);
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
  const spent = new Set<string>();
  const rows: FillRow[] = [];
  const counts: Record<FillRole, number> = {
    ramp: 0, draw: 0, removal: 0, wipes: 0, land: 0, other: 0,
  };

  // THE TYPE TIE-BREAK's inputs, recomputed as cards are placed. Role floors and type targets
  // are different axes that collide through the cards satisfying both: in a large collection
  // ten ramp is ten mana rocks, while the median commander wants eleven artifacts in the WHOLE
  // deck. The ramp slot alone can spend the entire artifact budget, and an overshoot is
  // permanent — a later pass can add a missing creature, nothing removes a surplus artifact.
  const placed: { typeLine: string; quantity: number }[] = [];
  const typeTargets = skeleton?.composition?.targets ?? null;
  let scanned = TIE_BREAK_WINDOW;

  for (const candidate of ordered) {
    // Every non-land role is closed, so the rest of the pool can only be
    // classified and discarded — and the pool is the player's whole legal
    // collection, which for a large one is thousands of candidates.
    if (NON_LAND_ROLES.every((r) => counts[r] >= floors[r])) break;
    if (rows.length >= limit) break;
    if (spent.has(candidate.oracleId)) continue;
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
    if (roles.includes("land")) continue;
    const open = NON_LAND_ROLES.filter((r) => roles.includes(r) && counts[r] < floors[r]);
    if (open.length === 0) continue;

    // THE BEST REMAINING CARD FOR THIS ROLE, not merely the next one that fits. The pool is
    // already in preference order, so this looks ahead only among the cards that could close
    // the SAME first open role and prefers the one closing the larger type gap.
    const deficits = typeDeficits(typeTargets, tallyTypes(placed));
    const role = open[0];
    let chosen = candidate;
    if (deficits.size > 0) {
      for (const other of ordered) {
        if (other === candidate || spent.has(other.oracleId)) continue;
        const otherRoles = rolesOfCandidate(other);
        if (otherRoles.includes("land") || !otherRoles.includes(role)) continue;
        if (preferByTypeGap(other, chosen, deficits) < 0) chosen = other;
        // BOUNDED. The pool is the player's whole legal collection and this runs once per
        // placed card; scanning it whole would be quadratic on a large one. The window is
        // generous enough to hold real alternatives and small enough to stay linear.
        if (--scanned <= 0) break;
      }
      scanned = TIE_BREAK_WINDOW;
    }

    spent.add(chosen.oracleId);
    // EVERY ROLE IT SATISFIES, one slot spent. Spec §2.5a: the targets describe decks with a
    // card counted under each role it fills, so crediting one role would make this fill place
    // two cards where the decklists behind the target counted one.
    for (const r of NON_LAND_ROLES) if (rolesOfCandidate(chosen).includes(r)) counts[r]++;
    placed.push({ typeLine: chosen.typeLine, quantity: 1 });
    // The row's role is the first one it CLOSED, which is what a reader is shown.
    rows.push({ oracleId: chosen.oracleId, quantity: 1, role });
  }

  // Lands come from the collection alone — never bought, at any point below.
  // Drawn from the deduplicated index rather than from `ordered`, because
  // three sweeps read this list and a duplicated oracle id would otherwise be
  // taken once per sweep and double-counted in the per-colour capacity.
  const lands = [...byOracleId.values()].filter(
    (c) => c.owned && !spent.has(c.oracleId) && rolesOfCandidate(c).includes("land"),
  );
  const takeLand = (candidate: FillCandidate, quantity: number): void => {
    spent.add(candidate.oracleId);
    counts.land += quantity;
    rows.push({ oracleId: candidate.oracleId, quantity, role: "land" });
  };

  // Utility lands first, one copy each and capped, so the mana base is not
  // 37 copies of one basic — the shape this fill used to produce whenever a
  // player owned a playset of anything.
  for (const candidate of lands) {
    if (counts.land >= Math.min(NONBASIC_LAND_CAP, landCeiling)) break;
    if (isBasicLand(candidate.typeLine)) continue;
    takeLand(candidate, 1);
  }

  // Basics take the rest, split across the colours the chosen spells actually
  // cost. A basic still stacks only to the copies owned — a deck must not
  // claim eleven Forests off four — so a colour whose basics run out hands its
  // slots back to the colours that can still fill them.
  const pips = new Map<string, number>();
  for (const row of rows) {
    if (row.role === "land") continue;
    addPips(pips, byOracleId.get(row.oracleId)?.manaCost ?? null);
  }
  const basicsByColor = new Map<string, FillCandidate[]>();
  for (const candidate of lands) {
    if (spent.has(candidate.oracleId) || !isBasicLand(candidate.typeLine)) continue;
    const color = basicLandColor(candidate.name);
    if (!color || candidate.ownedQuantity < 1) continue;
    basicsByColor.set(color, [...(basicsByColor.get(color) ?? []), candidate]);
  }
  const colors = [...basicsByColor.keys()].sort();
  if (colors.length > 0 && counts.land < landCeiling) {
    const capacity = new Map(
      colors.map((c) => [c, basicsByColor.get(c)!.reduce((n, b) => n + b.ownedQuantity, 0)]),
    );
    const allocated = splitByWeight(colors, pips, landCeiling - counts.land);
    // A colour capped below its share leaves slots on the table; they go to
    // whichever colours still have copies, heaviest first.
    let spare = 0;
    for (const color of colors) {
      const capped = Math.min(allocated.get(color)!, capacity.get(color)!);
      spare += allocated.get(color)! - capped;
      allocated.set(color, capped);
    }
    const byWeight = [...colors].sort(
      (a, b) => (pips.get(b) ?? 0) - (pips.get(a) ?? 0) || a.localeCompare(b),
    );
    while (spare > 0) {
      const color = byWeight.find((c) => allocated.get(c)! < capacity.get(c)!);
      if (!color) break;
      allocated.set(color, allocated.get(color)! + 1);
      spare--;
    }
    for (const color of colors) {
      let room = allocated.get(color)!;
      for (const candidate of basicsByColor.get(color)!) {
        if (room <= 0) break;
        const quantity = Math.min(candidate.ownedQuantity, room);
        room -= quantity;
        takeLand(candidate, quantity);
      }
    }
  }

  // The collection had too few basics to finish the base, so the cap lifts and
  // the remaining utility lands take what is left.
  for (const candidate of lands) {
    if (counts.land >= landCeiling) break;
    if (spent.has(candidate.oracleId)) continue;
    takeLand(candidate, 1);
  }

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
  for (const candidate of residualOrder) {
    if (rows.reduce((n, r) => n + r.quantity, 0) >= limit) break;
    if (spent.has(candidate.oracleId)) continue;
    if (rolesOfCandidate(candidate).includes("land")) continue;
    spent.add(candidate.oracleId);
    placed.push({ typeLine: candidate.typeLine, quantity: 1 });
    rows.push({ oracleId: candidate.oracleId, quantity: 1, role: "other" });
  }

  // A modal card whose back is a land is a land DROP even when its front was sleeved as draw —
  // but only when the front was NOT spent on another role, or the same card would take a role
  // slot and a land slot, which is the double credit §2.5a forbids.
  const landCapable = counts.land + rows.filter((r) => {
    if (r.role === "land") return false;
    const c = byOracleId.get(r.oracleId);
    return c ? playableAsLand(c.typeLine, c.layout) : false;
  }).length;

  const haveTypes = tallyTypes(placed);
  const boughtIds = new Set(candidates.filter((c) => !c.owned).map((c) => c.oracleId));
  return {
    rows,
    filled: rows.reduce((n, r) => n + r.quantity, 0),
    bought: rows.filter((r) => boughtIds.has(r.oracleId)).reduce((n, r) => n + r.quantity, 0),
    landCapable,
    measured: skeleton?.roleTargets.of !== undefined && skeleton.roleTargets.of !== "flat",
    shortfalls: [
      ...NON_LAND_ROLES.filter((r) => counts[r] < floors[r])
        .map((role) => ({ kind: "role" as const, role })),
      ...(counts.land < landCeiling ? [{ kind: "role" as const, role: "land" as const }] : []),
      // TYPES TOO. A deck can meet every role floor and still sit eight creatures under the
      // decklists it is measured against, and a reader told only about roles cannot see it.
      ...(typeTargets
        ? (Object.keys(typeTargets) as (keyof CompositionTargets)[])
            .filter((type) => haveTypes[type] < typeTargets[type])
            .map((type) => ({ kind: "type" as const, type }))
        : []),
    ],
  };
}
