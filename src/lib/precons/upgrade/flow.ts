/**
 * The Upgrade this precon flow's rules, apart from its drawing (handoff `design_handoff_the99_precon_upgrade`, STATES). The player
 * picks the commander, the bracket and the strategy, in that order; nothing is preselected, and a pick clears only what depends on it.
 */
import type { OfferedCommander, OfferedStrategy, PanelRun, UpgradePanel } from "./run";
import { BRACKET_TARGETS, runKey, type BracketTarget } from "./targets";

export type FlowStep = "intro" | "commander" | "bracket" | "strategy";
/** The steps the tracker draws: a one-option step is skipped (a Commander step with one card, a Bracket step with one rung). */
export type PickStep = "commander" | "bracket" | "strategy";

export type Picks = { commander: string | null; bracket: BracketTarget | null; strategy: string | null };
export const NO_PICKS: Picks = { commander: null, bracket: null, strategy: null };

/** The brackets offered: the box's own and every one above it, never one below (an upgrade adds cards; the backend refuses the rest). */
export function bracketOffers(boxBracket: number | null): BracketTarget[] {
  if (boxBracket === null) return [];
  return BRACKET_TARGETS.filter((b) => b >= boxBracket);
}

/** What the tracker walks, in order. One option is no choice: its step is skipped and the pick is made for the player. */
export function pickSteps(panel: UpgradePanel): PickStep[] {
  const steps: PickStep[] = [];
  if (panel.commanders.length > 1) steps.push("commander");
  if (bracketOffers(panel.boxBracket).length > 1) steps.push("bracket");
  steps.push("strategy");
  return steps;
}

/** Picks a skipped step made on the player's behalf: the only commander, the only bracket (the box's own, at 4). */
export function impliedPicks(panel: UpgradePanel): Picks {
  const offers = bracketOffers(panel.boxBracket);
  return {
    commander: panel.commanders.length === 1 ? panel.commanders[0].key : null,
    bracket: offers.length === 1 ? offers[0] : null,
    strategy: null,
  };
}

/** A pick, clearing only what depends on it: a new commander clears the strategy and keeps the bracket; a new bracket clears the strategy. */
export function choose(picks: Picks, step: PickStep, value: string | BracketTarget): Picks {
  if (step === "commander") return picks.commander === value ? picks : { ...picks, commander: value as string, strategy: null };
  if (step === "bracket") return picks.bracket === value ? picks : { ...picks, bracket: value as BracketTarget, strategy: null };
  return { ...picks, strategy: value as string };
}

export function strategiesFor(panel: UpgradePanel, commander: string | null): OfferedStrategy[] {
  return panel.commanders.find((c) => c.key === commander)?.strategies ?? [];
}

export function commanderOf(panel: UpgradePanel, key: string | null): OfferedCommander | null {
  return panel.commanders.find((c) => c.key === key) ?? null;
}

/** Every pick made: the confirm's press may start. */
export function complete(picks: Picks): picks is { commander: string; bracket: BracketTarget; strategy: string } {
  return picks.commander !== null && picks.bracket !== null && picks.strategy !== null;
}

/** The kept run of exactly these picks, which the confirm offers again for free (S3). */
export function sameRun(runs: readonly PanelRun[], picks: Picks): PanelRun | null {
  if (!complete(picks)) return null;
  const key = runKey(picks.commander, picks.bracket, picks.strategy);
  return runs.find((r) => r.status === "done" && r.strategyKey === key) ?? null;
}

/** The three picks as the signed-out return carries them (`?upgrade=<commander>.<bracket>.<strategy>`, S4), and back. */
export function encodePicks(p: { commander: string; bracket: number; strategy: string }): string {
  // `encodeURIComponent` leaves "." alone, and "." is the delimiter: escape it so a key holding one stays one part.
  return [p.commander, String(p.bracket), p.strategy].map((v) => encodeURIComponent(v).replace(/\./g, "%2E")).join(".");
}

export function decodePicks(raw: string | null, panel: UpgradePanel): Picks | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  let commander: string, strategy: string;
  try {
    [commander, strategy] = [decodeURIComponent(parts[0]), decodeURIComponent(parts[2])];
  } catch {
    // not a fallback: a malformed return link is no picks, and nothing here is stored.
    return null;
  }
  const bracket = Number(parts[1]);
  const lead = commanderOf(panel, commander);
  if (!lead || !isOffered(panel, bracket) || !lead.strategies.some((s) => s.key === strategy)) return null;
  return { commander, bracket, strategy };
}

function isOffered(panel: UpgradePanel, bracket: number): bracket is BracketTarget {
  return (bracketOffers(panel.boxBracket) as number[]).includes(bracket);
}

/** Whether the page draws the press at all (E3): the box's bracket was read, and some commander has a strategy the deck backs. */
export function upgradeOffered(panel: UpgradePanel | null): panel is UpgradePanel {
  return panel !== null && bracketOffers(panel.boxBracket).length > 0 && panel.commanders.some((c) => c.strategies.length > 0);
}
