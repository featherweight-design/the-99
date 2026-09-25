import type { CompositionTargets, ProfileSkeleton } from "../profile/types";

import { landTarget } from "./deck-size";

// ---------------------------------------------------------------------------
// Recommended mix constants + role-cell state helper
// ---------------------------------------------------------------------------

export type MixRole = "ramp" | "draw" | "removal" | "wipes" | "land";

// The order every strip draws the five roles in. It lives beside `recommendedMix`
// because two surfaces now draw the same five cells — the deck page's mix strip
// and the review page's what-changed strip — and a second copy of this array is
// how the two come to disagree about which cell is third.
export const ROLE_ORDER: MixRole[] = ["ramp", "draw", "removal", "wipes", "land"];

// ---------------------------------------------------------------------------
// computeRoleCounts — quantity-weighted tally from server-computed card.role
// ---------------------------------------------------------------------------

/** Minimal card shape accepted by computeRoleCounts (subset of DeckDetailCard). */
export type RoleCountCard = {
  role: "ramp" | "draw" | "removal" | "wipes" | "land" | "other";
  quantity: number;
};

/**
 * Tallies quantity-weighted role counts from the pre-computed `card.role` field.
 * Do NOT re-run classifyRoles here — card.role is derived from real oracleText
 * on the server; re-classifying with null oracleText under-counts text-based roles.
 */
export function computeRoleCounts(
  cards: RoleCountCard[],
): Record<MixRole, number> {
  const counts: Record<MixRole, number> = {
    ramp: 0,
    draw: 0,
    removal: 0,
    wipes: 0,
    land: 0,
  };
  for (const card of cards) {
    if (card.role in counts) {
      counts[card.role as MixRole] += card.quantity;
    }
  }
  return counts;
}

// No per-role `rationale` here since #184. The strip's one disclosure carries
// four authored lines for five roles (Removal and Wipes share one), so a 1:1
// map over this record could not have produced it; the lines live in
// `addPanelCopy.strip.rationaleBodies` with the rest of the surface's copy.
export type MixCell = {
  label: string;
  target: number;
  /** A range rather than a finish line. Lands alone: 35 and 38 are both fine bases, where
   *  eight removal and six removal are not the same deck. */
  advisory: boolean;
};

export type RecommendedMix = {
  cells: Record<MixRole, MixCell>;
  /**
   * The ten TYPE targets, when the skeleton carried a composition.
   *
   * The five cells above are ROLES; these are the other axis. Carried on the same object
   * because a surface reasoning about both — the Add panel orders a shelf by role and then by
   * type gap — would otherwise take two props that can disagree about which deck they describe.
   * Null when nothing was derivable, which is what stops a caller inventing a surplus.
   */
  types: CompositionTargets | null;
  /** Whether these targets came from decklists or from the asserted baseline. The same per-plan
   *  honesty `FillPlan.measured` and `RoleFit.measured` carry, for the same reason: a reader
   *  shown a figure cannot tell one taken over eight hundred decks from a constant. */
  measured: boolean;
  /** The four functional roles came from decklists. A reader naming one role's need (Fits your
   *  decks, audit F9) asks this half alone, since `measured` also demands the land count. Always set
   *  by `recommendedMix`; optional only so a hand-drawn specimen need not state it, and absent reads
   *  as not measured. */
  rolesUsable?: boolean;
  /** The land count came from decklists. Absent reads as not measured, as above. */
  landMeasured?: boolean;
};

const LABELS: Record<MixRole, string> = {
  ramp: "Ramp", draw: "Draw", removal: "Removal", wipes: "Wipes", land: "Land",
};

/** The asserted baseline, kept for the fallback and for nothing else. These were the whole of
 *  the recommendation until the role pass measured its four. */
const FLAT_TARGETS: Record<MixRole, number> = {
  ramp: 10, draw: 10, removal: 8, wipes: 3, land: 37,
};

/** Whole cards, rounded half-up and floored at 0. A bucket's mean is a `real`, and a strip
 *  cannot draw 8.4 of a card — nor a negative one, which no measurement produces but which a
 *  future adjustment subtracting from a target could. */
const wholeCards = (n: number) => Math.max(0, Math.round(n));

/**
 * What the deck is being compared to, for this commander.
 *
 * MEASURED where the skeleton carries the figures and asserted where it does not, with
 * `measured` saying which — the same contract `fitSkeleton` and `planFill` use. The four
 * functional roles and the land count resolve INDEPENDENTLY, because their chains do: a
 * commander indexed before the role pass carries a composition and no role figures, and
 * folding them would drag a perfectly good land target to the flat one.
 *
 * A MEASURED ZERO STAYS ZERO. 390 commanders measure exactly 0 wipes on front-face text, and a
 * fallback that treated 0 as "no answer" would replace the one figure the index is most certain
 * about with an asserted 3.
 */
export function recommendedMix(
  skeleton: ProfileSkeleton | null,
  hasPartner: boolean,
): RecommendedMix {
  const roles = skeleton?.roleTargets;
  const rolesUsable = roles !== undefined
    && roles.of !== "flat"
    && Object.values(roles.targets).every((v) => typeof v === "number" && Number.isFinite(v));

  const land = landTarget(hasPartner, skeleton);
  const landMeasured = skeleton?.composition != null
    && Number.isFinite(skeleton.composition.targets.land);

  const target = (role: MixRole): number => {
    if (role === "land") return wholeCards(land);
    if (!rolesUsable) return FLAT_TARGETS[role];
    return wholeCards(roles!.targets[role]);
  };

  return {
    cells: Object.fromEntries(
      ROLE_ORDER.map((role) => [
        role,
        { label: LABELS[role], target: target(role), advisory: role === "land" },
      ]),
    ) as Record<MixRole, MixCell>,
    types: skeleton?.composition?.targets ?? null,
    // BOTH halves, or the line overclaims. A deck whose land count is measured and whose roles
    // are not is not being compared to EDHREC averages on four of its five cells.
    measured: rolesUsable && landMeasured,
    rolesUsable,
    landMeasured,
  };
}

/**
 * Where the numbers come from, and nothing else.
 *
 * The line used to carry "· a guide, not a gate" as well, which restated what "recommended" and
 * "rec ~37" already say and cost the one piece of information the header holds its place for.
 *
 * It names EDHREC only when the figures actually came from there. Saying "EDHREC averages" over
 * four asserted constants is the provenance failure this whole sub-project exists to end, and
 * it would be this surface saying it in the most prominent place the app has for it.
 */
export function mixSourceLine(mix: RecommendedMix): string {
  return mix.measured ? "EDHREC averages" : "A common starting point";
}

// Colour and control now answer to the same number. An advisory role used to be
// held back from the met colours on the grounds that ~37 lands is a range rather
// than a finish line — but design table E-N1/E-N2 keys the cell's whole state on
// `have >= target` and knows nothing of advisory, so a Land at 40 was drawing a
// accent figure inside a cell that had already given up its caption and its
// action. The `~` in `rec ~37` is where the range still speaks.
export function roleCellState(args: {
  have: number;
  target: number;
}): { figureColor: string; barColor: string; pct: number } {
  // A MEASURED TARGET CAN BE ZERO, and 0/0 is NaN — which reaches the cell as
  // `width: NaN%`, an invalid declaration the browser drops, leaving the fill at
  // auto width: a full bar arrived at by accident rather than by arithmetic. Not
  // an edge case either; 390 commanders measure zero wipes. A zero target is met
  // by definition, so it is 100 deliberately, which is also what the `have >=
  // target` branch below already concludes about the colours.
  const pct =
    args.target <= 0 ? 100 : Math.min(100, Math.round((args.have / args.target) * 100));
  if (args.have >= args.target)
    return { figureColor: "var(--success)", barColor: "var(--success)", pct };
  // Design table E4/E5: a short cell's figure is accent and its bar accent-mid.
  // It read as body text with an accent bar, which made the one number the strip
  // exists to draw the eye to the quietest thing in the cell.
  return { figureColor: "var(--accent)", barColor: "var(--accent-mid)", pct };
}
