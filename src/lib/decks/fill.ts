import { classifyRoles, ROLE_TARGETS } from "../recs/roles";
import { isBasicLand } from "./grouping";
import { LAND_TARGET } from "./suggest";

export type FillRole = "ramp" | "draw" | "removal" | "wipes" | "land";

export type FillCandidate = {
  oracleId: string; name: string; typeLine: string;
  oracleText: string | null; keywords: string[];
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

export function planFill(candidates: FillCandidate[]): FillPlan {
  const ordered = [...candidates].sort(byPreference);
  const spent = new Set<string>();
  const rows: FillRow[] = [];
  const counts: Record<FillRole, number> = { ramp: 0, draw: 0, removal: 0, wipes: 0, land: 0 };

  for (const candidate of ordered) {
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

  // Lands come from the collection alone (never bought), and a basic stacks to
  // the copies actually owned rather than to the shortfall — a deck must not
  // claim eleven Forests off four.
  for (const candidate of ordered) {
    if (counts.land >= LAND_TARGET) break;
    if (spent.has(candidate.oracleId) || !candidate.owned) continue;
    if (!classifyRoles(candidate).includes("land")) continue;
    const room = LAND_TARGET - counts.land;
    const quantity = isBasicLand(candidate.typeLine)
      ? Math.min(Math.max(candidate.ownedQuantity, 1), room)
      : 1;
    spent.add(candidate.oracleId);
    counts.land += quantity;
    rows.push({ oracleId: candidate.oracleId, quantity, role: "land" });
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
