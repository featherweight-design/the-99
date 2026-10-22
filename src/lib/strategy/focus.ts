/**
 * A deck's focus: the one strategy a player picks on Analysis for Suggested changes to aim at (handoff
 * `design/design_handoff_the99_strategy_focus/`). Any strategy the scores can name can be the focus, scored on this deck
 * or not, so the check is against the vocabulary rather than the deck's top five.
 */
import { THEMES } from "../labels/types";
import { FIXED_AXES } from "./axes";
import { CREATURE_TYPES } from "./creature-types.generated";
import type { StrategyKey } from "./score";

const NAMED: ReadonlySet<string> = new Set<string>([...THEMES, ...FIXED_AXES, ...CREATURE_TYPES.map((t) => `typal:${t}`)]);

/** The key as a strategy, or null for anything the vocabulary does not name (a crafted action argument, a retired key). */
export function parseStrategyKey(value: unknown): StrategyKey | null {
  return typeof value === "string" && NAMED.has(value) ? (value as StrategyKey) : null;
}
