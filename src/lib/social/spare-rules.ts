/**
 * Settings' Spares rules (menu and Home plan PR 3, handoff G3): the threshold and the keep-back, as pure functions
 * with no database import, so the settings page's stepper, its action and the friend read all apply the same
 * bounds and the same filter. `spares.ts` is the ONE place a friend's card is decided offered or not.
 */

/** `max(0, owned − hard − soft)`: copies none of the owner's decks, committed or draft, is asking for. */
export function spareCount(a: { owned: number; hard: number; soft: number }): number {
  return Math.max(0, a.owned - a.hard - a.soft);
}

/** The stepper's range (Settings board: 1 to 9). 1 is every spare, the behavior before the setting existed. */
export const SPARE_MIN_LOW = 1;
export const SPARE_MIN_HIGH = 9;
export const SPARE_MIN_DEFAULT = 1;

/** A threshold the stepper can hold, or null: an integer from 1 to 9, nothing else (no string, no float). */
export function cleanSpareMin(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= SPARE_MIN_LOW && v <= SPARE_MIN_HIGH ? v : null;
}

/** A stored threshold as the filter reads it: anything out of range (a row from before the column) is the default. */
export function spareMinOf(v: unknown): number {
  return cleanSpareMin(v) ?? SPARE_MIN_DEFAULT;
}

/**
 * Whether a card is offered: its owner has at least `min` spare copies and has not kept it back. A card with no
 * spare copy is never offered, whatever the threshold.
 */
export function isOffered(spare: number, min: number, kept: boolean): boolean {
  return !kept && spare > 0 && spare >= min;
}
