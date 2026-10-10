import { GAME_CHANGER_LIMIT, MASS_LAND_DENIAL_LIMIT, EXTRA_TURN_LIMIT_BRACKET_1 } from "../bracket/rules";
import type { MixRole } from "../decks/mix";
import type { Bracket } from "../profile/types";
import type { BracketFlag, CutFacts } from "./cuts";
import type { CutCite } from "./cuts-schema";

/**
 * What the Proposed cuts panel shows as "What we counted", and the chips a named cut quotes from
 * it. Pure and client-safe. The rows are the model's input shown as it is: nothing is ordered by
 * how cuttable a card is, and no card is named.
 *
 * The CHIPS are built from the cite the validator checked (the evidence pack's figures), not from
 * the visible rows (design errata 3, decision 6): an EDHREC chip carries a per-card percentage and
 * a `you said` chip a quotation, and neither is a count row.
 */

export const ROLE_LABEL: Record<MixRole, string> = {
  ramp: "Ramp", draw: "Card draw", removal: "Removal", wipes: "Board wipes", land: "Lands",
};
const FLAG_LABEL: Record<BracketFlag, string> = {
  gameChanger: "Game Changers", massLandDenial: "Mass land denial", extraTurn: "Extra turns", combo: "Combo pieces",
};

/** Under this inclusion percent a card counts as rarely played in the commander's decks. */
export const RARE_INCLUSION_PCT = 10;

export type CountRow = {
  /** Stable key: `role:ramp`, `curve:6`, `bracket:gameChanger`, `edhrec`. */
  key: string;
  source: "role" | "curve" | "bracket" | "edhrec";
  label: string;
  /** The mono figure. Null on the dashed thin-data row. */
  figure: number | null;
  /** The comparison beside it (`rec 10 · 4 over`). */
  note: string;
  /** Drawn dashed: the EDHREC list was too thin or absent to count against. */
  thin?: boolean;
};

/** What the chips need beyond the cite itself. Computed beside the rows from the same facts. */
export type ChipContext = {
  medianPct: number | null;
  /** The cards carrying each flag the declared bracket bears on. */
  flagCounts: Partial<Record<BracketFlag, number>>;
  declared: Bracket | null;
};

export type CutCounts = { rows: CountRow[]; chips: ChipContext };

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
};

/** How many of a flag the declared bracket allows, from the rules' own constants. */
export function flagAllowance(flag: BracketFlag, declared: Bracket): number {
  if (declared === 4 || declared === 5) return Number.POSITIVE_INFINITY;
  if (flag === "gameChanger") return GAME_CHANGER_LIMIT[declared];
  if (flag === "massLandDenial") return MASS_LAND_DENIAL_LIMIT;
  if (flag === "extraTurn") return declared === 1 ? EXTRA_TURN_LIMIT_BRACKET_1 : Number.POSITIVE_INFINITY;
  return 0;
}

export function cutCounts(facts: CutFacts, declared: Bracket | null, commander: string): CutCounts {
  const rows: CountRow[] = [];
  const thin = facts.missing.includes("inclusion");

  for (const r of facts.roles) {
    if (r.have <= r.target) continue;
    rows.push({
      key: `role:${r.role}`, source: "role", label: ROLE_LABEL[r.role], figure: r.have,
      note: `rec ${r.target} · ${r.have - r.target} over`,
    });
  }

  if (facts.curve && facts.curve.length > 0) {
    // The fullest slot: the most cards at one mana value, the lowest value on a tie.
    const fullest = facts.curve.reduce((best, b) => (b.have > best.have ? b : best), facts.curve[0]);
    const cost = (cmc: number) => (cmc >= 7 ? "Cost 7 or more" : `Cost ${cmc}`);
    if (fullest.have > 0) {
      rows.push({ key: `curve:${fullest.cmc}`, source: "curve", label: cost(fullest.cmc), figure: fullest.have, note: "the fullest slot" });
    }
    const top = facts.curve.find((b) => b.cmc >= 7);
    if (top && top.have > 0 && fullest.cmc !== top.cmc) {
      rows.push({ key: "curve:7", source: "curve", label: cost(7), figure: top.have, note: `of ${facts.total}` });
    }
  }

  const flagCounts: Partial<Record<BracketFlag, number>> = {};
  // Only against a DECLARED bracket: with none, no flag is a fact about this deck.
  if (declared !== null) {
    for (const b of facts.brackets) {
      const allows = flagAllowance(b.flag, declared);
      if (b.cards.length <= allows) continue;
      flagCounts[b.flag] = b.cards.length;
      rows.push({
        key: `bracket:${b.flag}`, source: "bracket", label: FLAG_LABEL[b.flag], figure: b.cards.length,
        note: `bracket ${declared} allows ${allows === 0 ? "none" : allows}`,
      });
    }
  }

  const pcts = facts.cards.flatMap((c) => (c.inclusion?.kind === "pct" ? [c.inclusion.pct] : []));
  const med = median(pcts);
  if (thin) {
    rows.push({ key: "edhrec", source: "edhrec", label: "EDHREC", figure: null, note: "no list for this commander, so nothing is counted against it", thin: true });
  } else if (pcts.length > 0 && med !== null) {
    rows.push({
      key: "edhrec", source: "edhrec", label: `In under ${RARE_INCLUSION_PCT}% of ${commander} decks`,
      figure: pcts.filter((p) => p < RARE_INCLUSION_PCT).length, note: `your median card ${med}%`,
    });
  }
  return { rows, chips: { medianPct: med, flagCounts, declared } };
}

export type Chip = { key: string; kind: "ROLE" | "EDHREC" | "CURVE" | "BRACKET" | "YOU SAID"; text: string };

/** The part of a reason inside the first pair of quotation marks, as the validator requires it to be written. */
export function quotedPart(reason: string): string | null {
  const m = /[“"]([^”"]+)[”"]/.exec(reason);
  return m ? m[1] : null;
}

/**
 * One chip per cite, quoting the figure the validator checked. A flag chip needs the deck-level
 * count and the declared bracket; without either it falls back to the flag's name alone.
 */
export function cutChips(cites: readonly CutCite[], reason: string, ctx: ChipContext): Chip[] {
  return cites.map((c, i): Chip => {
    const key = `${c.kind}:${i}`;
    switch (c.kind) {
      case "inclusion":
        return { key, kind: "EDHREC", text: `${c.pct}%${ctx.medianPct === null ? "" : ` · median ${ctx.medianPct}%`}` };
      case "offList":
        return { key, kind: "EDHREC", text: "not on the list" };
      case "role":
        return { key, kind: "ROLE", text: `${c.role === "draw" ? "draw" : c.role} ${c.have} · rec ${c.target}` };
      case "curve":
        return { key, kind: "CURVE", text: `${c.have} ${c.cmc >= 7 ? "cost 7 or more" : `cost ${c.cmc}`}` };
      case "flag": {
        const n = ctx.flagCounts[c.flag];
        const tail = n !== undefined && ctx.declared !== null
          ? ` ${n} · bracket ${ctx.declared} allows ${flagAllowance(c.flag, ctx.declared) === 0 ? "none" : flagAllowance(c.flag, ctx.declared)}`
          : "";
        return { key, kind: "BRACKET", text: `${FLAG_LABEL[c.flag]}${tail}` };
      }
      case "intent": {
        const q = quotedPart(reason);
        return { key, kind: "YOU SAID", text: q ? `“${q}”` : "your description" };
      }
    }
  });
}
