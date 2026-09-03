import { classifyRoles, ROLE_TARGETS } from "../recs/roles";
import { isBasicLand } from "./grouping";
import { LAND_TARGET } from "./suggest";

export type FillRole = "ramp" | "draw" | "removal" | "wipes" | "land";

export type FillCandidate = {
  oracleId: string; name: string; typeLine: string;
  oracleText: string | null; keywords: string[];
  /** Scryfall cost string, e.g. `{2}{G}{G}`. Read only for its coloured pips,
      which are what the basic-land split is proportioned against. */
  manaCost: string | null;
  owned: boolean;
  /** Total copies owned, summed across printings. 0 for an unowned card. */
  ownedQuantity: number;
  inclusionPct: number | null;
};

export type FillRow = { oracleId: string; quantity: number; role: FillRole };

export type FillPlan = {
  rows: FillRow[];
  /** Total cards, counting stacked basics. */
  filled: number;
  /** Of `filled`, how many came from outside the collection. Lands never do. */
  bought: number;
  /** Roles that could not reach their target, in role order. */
  shortfalls: FillRole[];
};

const NON_LAND_ROLES = ["ramp", "draw", "removal", "wipes"] as const;

/** What a fill reaches for: every role target plus the land target. `planFill`
    stops at each target and never exceeds it, so this is the plan's ceiling and
    the number the commander page can promise before any query has run. Derived
    rather than written down, because a target that moves must move the promise
    with it. */
export const FILL_BASELINE_TOTAL =
  NON_LAND_ROLES.reduce((n, r) => n + ROLE_TARGETS[r], 0) + LAND_TARGET;

/** How many of the 37 land slots non-basics may take before basics get the
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

export function planFill(candidates: FillCandidate[]): FillPlan {
  const ordered = [...candidates].sort(byPreference);
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
  const counts: Record<FillRole, number> = { ramp: 0, draw: 0, removal: 0, wipes: 0, land: 0 };

  for (const candidate of ordered) {
    // Every non-land role is closed, so the rest of the pool can only be
    // classified and discarded — and the pool is the player's whole legal
    // collection, which for a large one is thousands of candidates.
    if (NON_LAND_ROLES.every((r) => counts[r] >= ROLE_TARGETS[r])) break;
    if (spent.has(candidate.oracleId)) continue;
    const roles = classifyRoles(candidate);
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
    const role = NON_LAND_ROLES.find((r) => roles.includes(r) && counts[r] < ROLE_TARGETS[r]);
    if (!role) continue;
    spent.add(candidate.oracleId);
    counts[role]++;
    rows.push({ oracleId: candidate.oracleId, quantity: 1, role });
  }

  // Lands come from the collection alone — never bought, at any point below.
  // Drawn from the deduplicated index rather than from `ordered`, because
  // three sweeps read this list and a duplicated oracle id would otherwise be
  // taken once per sweep and double-counted in the per-colour capacity.
  const lands = [...byOracleId.values()].filter(
    (c) => c.owned && !spent.has(c.oracleId) && classifyRoles(c).includes("land"),
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
    if (counts.land >= Math.min(NONBASIC_LAND_CAP, LAND_TARGET)) break;
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
  if (colors.length > 0 && counts.land < LAND_TARGET) {
    const capacity = new Map(
      colors.map((c) => [c, basicsByColor.get(c)!.reduce((n, b) => n + b.ownedQuantity, 0)]),
    );
    const allocated = splitByWeight(colors, pips, LAND_TARGET - counts.land);
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
    if (counts.land >= LAND_TARGET) break;
    if (spent.has(candidate.oracleId)) continue;
    takeLand(candidate, 1);
  }

  const boughtIds = new Set(candidates.filter((c) => !c.owned).map((c) => c.oracleId));
  return {
    rows,
    filled: rows.reduce((n, r) => n + r.quantity, 0),
    bought: rows.filter((r) => boughtIds.has(r.oracleId)).reduce((n, r) => n + r.quantity, 0),
    shortfalls: [
      ...NON_LAND_ROLES.filter((r) => counts[r] < ROLE_TARGETS[r]),
      ...(counts.land < LAND_TARGET ? (["land"] as const) : []),
    ],
  };
}
