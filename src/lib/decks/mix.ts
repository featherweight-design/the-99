// ---------------------------------------------------------------------------
// Recommended mix constants + role-cell state helper
// ---------------------------------------------------------------------------

export type MixRole = "ramp" | "draw" | "removal" | "wipes" | "land";

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

// The canvas draws only "a guide, not a gate"; the source attribution is an
// addition, so it joins on the middot the design already uses for metadata
// rather than on a dash.
export const RECOMMENDED_MIX_SOURCE_LINE = "EDHREC averages · a guide, not a gate";
// A worked example teaching how to read a cell, so every number in it is
// hypothetical. It used to end "you're at 8, fine for a slower build", which is
// a second-person claim about the reader's deck made by a string that never
// looks at one — on an empty deck it announced 8 ramp sources directly beneath
// a RAMP cell reading 0.
export const RECOMMENDED_MIX_WORKED_EXAMPLE =
  "Ramp · rec 10. Decks that cast a 4-mana commander on curve average ~10 sources. A deck sitting at 8 is fine for a slower build.";

export function roleCellState(args: {
  have: number;
  target: number;
  advisory: boolean;
}): { figureColor: string; barColor: string; pct: number } {
  const pct = Math.min(100, Math.round((args.have / args.target) * 100));
  // Design table E4/E5: a short cell's figure is brass and its bar brass-mid.
  // It read as body text with a brass bar, which made the one number the strip
  // exists to draw the eye to the quietest thing in the cell.
  const short = { figureColor: "var(--brass)", barColor: "var(--brass-mid)", pct };
  // An advisory target is a range, so it never earns the met colours — a Land
  // cell at 40 is not finished, it is a judgement call. Only colours are decided
  // here; whether the cell is a control is the cell's own call.
  if (args.advisory) return short;
  if (args.have >= args.target)
    return { figureColor: "var(--success)", barColor: "var(--success)", pct };
  return short;
}
