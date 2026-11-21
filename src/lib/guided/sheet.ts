import type { BracketTarget } from "../precons/upgrade/targets";
import { BUDGET_MAX_CENTS, BUDGET_MIN_CENTS, type PoolMode } from "./constants";
import { NO_CARRY, type CarryIn } from "./carry-in";
import type { GuidedPicks } from "./run";

/** The sheet's steps, in order (G1 to G3). */
export const SHEET_STEPS = ["strategy", "bracket", "cards"] as const;
export type SheetStep = (typeof SHEET_STEPS)[number];

/** What the sheet holds while it is open: nothing is pre-picked unless Help me choose carried it in. */
export type SheetPicks = {
  strategyKey: string | null;
  bracket: BracketTarget | null;
  poolMode: PoolMode | null;
  /** The budget as typed, in dollars: a string while it is being typed. */
  budgetText: string;
  kept: string[];
};

export function initialPicks(carry: CarryIn = NO_CARRY): SheetPicks {
  return {
    strategyKey: carry.strategyKey,
    bracket: carry.bracket,
    poolMode: carry.poolMode,
    budgetText: carry.budgetCents === null ? "" : String(carry.budgetCents / 100),
    kept: carry.kept,
  };
}

/** Whole dollars from the typed text, as cents; null when it is not a number the start would accept. */
export function budgetCents(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,5}$/.test(t)) return null;
  const cents = Number(t) * 100;
  return cents >= BUDGET_MIN_CENTS && cents <= BUDGET_MAX_CENTS ? cents : null;
}

/** Whether a step's own pick is made: the press that leaves it is on only then. */
export function stepDone(p: SheetPicks, step: SheetStep): boolean {
  if (step === "strategy") return p.strategyKey !== null;
  if (step === "bracket") return p.bracket !== null;
  return p.poolMode !== null && (p.poolMode !== "budget" || budgetCents(p.budgetText) !== null);
}

/** The picks `createDeck` is handed, or null while any step is open. */
export function toGuidedPicks(p: SheetPicks): GuidedPicks | null {
  if (!SHEET_STEPS.every((s) => stepDone(p, s))) return null;
  return {
    strategyKey: p.strategyKey!,
    bracket: p.bracket!,
    poolMode: p.poolMode!,
    budgetCents: p.poolMode === "budget" ? budgetCents(p.budgetText) : null,
    kept: p.kept,
  };
}

/** What `createDeck`'s guided start reports: "none" is a build that asked for no run. */
export type GuidedStart = "none" | "started" | string;

/**
 * Where `createDeck` sends the player. A guided build whose run did not start (the start refused after the sheet's own credit check
 * passed: a race, a second tab, an unbacked strategy) lands on the deck with `?guided=refused`, which the deck's page reads and draws as
 * the refused line. A refused start is never silent, and never claims credits came back: none was taken.
 */
export const GUIDED_REFUSED_PARAM = "guided";
export const GUIDED_REFUSED_VALUE = "refused";
export function landingAfterCreate(deckId: string, start: GuidedStart): string {
  const base = `/decks/${deckId}`;
  return start === "none" || start === "started" ? base : `${base}?${GUIDED_REFUSED_PARAM}=${GUIDED_REFUSED_VALUE}`;
}
