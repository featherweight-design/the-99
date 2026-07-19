// ---------------------------------------------------------------------------
// Recommended mix constants + role-cell state helper
// ---------------------------------------------------------------------------

export type MixRole = "ramp" | "draw" | "removal" | "wipes" | "land";

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
    rationale: "Targeted interaction — ~8 pieces handles most single-permanent threats.",
  },
  wipes: {
    label: "Wipes",
    target: 3,
    advisory: false,
    rationale: "Mass removal resets the board — 3 is enough to draw one on average.",
  },
  land: {
    label: "Lands",
    target: 37,
    advisory: true,
    rationale:
      "Advisory: most Commander decks run ~37 lands; scale up/down for MDFCs and mana rocks.",
  },
};

export const RECOMMENDED_MIX_SOURCE_LINE = "EDHREC averages — a guide, not a gate.";
export const RECOMMENDED_MIX_WORKED_EXAMPLE =
  "Ramp · rec 10 — decks that cast a 4-mana commander on curve average ~10 sources; you're at 8, fine for a slower build.";

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
