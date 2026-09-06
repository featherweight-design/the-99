// The fixed vocabulary a game's marks are drawn from. Keys and order only —
// the label and the two glosses live in src/lib/copy/game-log.ts, so an axis
// has exactly one home for its display strings.
//
// The deck_game_axes.axis column is deliberately NOT constrained to this list
// by a check(). Retiring an axis would otherwise orphan every historical row
// that used it; validation happens in the action, where a rejection is a
// message rather than a 500.

export type GameAxisKey =
  | "speed"
  | "card_flow"
  | "mana"
  | "interaction"
  | "board"
  | "resilience"
  | "engine"
  | "closing";

export type AxisPolarity = "worked" | "hurt";

export const GAME_AXIS_KEYS: readonly GameAxisKey[] = [
  "speed",
  "card_flow",
  "mana",
  "interaction",
  "board",
  "resilience",
  "engine",
  "closing",
] as const;

const KEY_SET: ReadonlySet<string> = new Set(GAME_AXIS_KEYS);

export function isGameAxisKey(value: string): value is GameAxisKey {
  return KEY_SET.has(value);
}
