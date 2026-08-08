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

// `rationale` has no renderer since #184: the strip's one disclosure quotes the
// canvas's four authored lines (five roles, four lines — Removal and Wipes
// share one), which live in `addPanelCopy.strip.rationaleBodies`. These per-role
// strings are kept rather than deleted because this pass was scoped to leave
// this file's data alone; retiring them is a follow-up, not a silent edit.
export const RECOMMENDED_MIX: Record<
  MixRole,
  {
    label: string;
    target: number;
    advisory: boolean;
    rationale: string;
  }
> = {
  ramp: {
    label: "Ramp",
    target: 10,
    advisory: false,
    rationale: "Decks that cast a 4-mana commander on curve average ~10 ramp sources.",
  },
  draw: {
    label: "Draw",
    target: 10,
    advisory: false,
    rationale: "Card advantage keeps you in the long game; ~10 sources is the EDHREC average.",
  },
  removal: {
    label: "Removal",
    target: 8,
    advisory: false,
    rationale: "Targeted interaction: ~8 pieces handle most single-permanent threats.",
  },
  wipes: {
    label: "Wipes",
    target: 3,
    advisory: false,
    rationale: "Mass removal resets the board. 3 is enough to draw one on average.",
  },
  land: {
    label: "Land",
    target: 37,
    advisory: true,
    rationale:
      "Advisory: most Commander decks run ~37 lands; scale up/down for MDFCs and mana rocks.",
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
  if (args.advisory) return { figureColor: "var(--fg-body)", barColor: "var(--brass)", pct };
  if (args.have >= args.target)
    return { figureColor: "var(--success)", barColor: "var(--success)", pct };
  return { figureColor: "var(--fg-body)", barColor: "var(--brass)", pct };
}
