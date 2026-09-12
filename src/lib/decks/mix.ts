// ---------------------------------------------------------------------------
// Recommended mix constants + role-cell state helper
// ---------------------------------------------------------------------------

export type MixRole = "ramp" | "draw" | "removal" | "wipes" | "land";

// The order every strip draws the five roles in. It lives beside RECOMMENDED_MIX
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
export const RECOMMENDED_MIX: Record<
  MixRole,
  {
    label: string;
    target: number;
    advisory: boolean;
  }
> = {
  ramp: {
    label: "Ramp",
    target: 10,
    advisory: false,
  },
  draw: {
    label: "Draw",
    target: 10,
    advisory: false,
  },
  removal: {
    label: "Removal",
    target: 8,
    advisory: false,
  },
  wipes: {
    label: "Wipes",
    target: 3,
    advisory: false,
  },
  land: {
    label: "Land",
    target: 37,
    advisory: true,
  },
};

// Where the numbers come from, and nothing else. The line used to carry "· a
// guide, not a gate" as well, which restated what "recommended" and "rec ~37"
// already say and cost the one piece of information the header actually holds
// its place for.
export const RECOMMENDED_MIX_SOURCE_LINE = "EDHREC averages";

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
  const pct = Math.min(100, Math.round((args.have / args.target) * 100));
  if (args.have >= args.target)
    return { figureColor: "var(--success)", barColor: "var(--success)", pct };
  // Design table E4/E5: a short cell's figure is accent and its bar accent-mid.
  // It read as body text with an accent bar, which made the one number the strip
  // exists to draw the eye to the quietest thing in the cell.
  return { figureColor: "var(--accent)", barColor: "var(--accent-mid)", pct };
}
