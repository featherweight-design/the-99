// The picks kept while the player leaves the flow for Credits (precon upgrade, addendum credits G22, READINESS clarification 3).
// Kept per precon file in this tab's session storage, so the next press of the entry (the precon page) or the band (the
// deck page) reopens the flow at Strategy with them. The flow never opens itself. Storage can be missing or throw (private
// mode, blocked site data): every access is guarded, and with nothing kept the flow opens on its intro as shipped.
import { decodePicks, encodePicks, type Picks } from "./flow";
import type { UpgradePanel } from "./run";

const keyOf = (fileName: string) => `the99:precon-upgrade:picks:${fileName}`;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    // not a fallback: storage that cannot be reached keeps nothing, and the flow opens on its intro.
    return null;
  }
}

/** Keeps a complete set of picks for this precon. Incomplete picks keep nothing. */
export function keepPicks(fileName: string, picks: Picks): void {
  if (picks.commander === null || picks.bracket === null || picks.strategy === null) return;
  try {
    storage()?.setItem(keyOf(fileName), encodePicks({ commander: picks.commander, bracket: picks.bracket, strategy: picks.strategy }));
  } catch {
    // not a fallback: a full or blocked store keeps nothing; the return opens on the intro.
  }
}

/** The kept picks, validated against the panel as it is now; null when none are kept or any is no longer offered. */
export function keptPicks(fileName: string, panel: UpgradePanel): Picks | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(keyOf(fileName)) ?? null;
  } catch {
    // not a fallback: an unreadable store holds no picks.
    return null;
  }
  return decodePicks(raw, panel);
}

/** Whether anything is kept for this precon (unvalidated): the hook reads the panel again before the flow draws the press. */
export function hasKeptPicks(fileName: string): boolean {
  try {
    return (storage()?.getItem(keyOf(fileName)) ?? null) !== null;
  } catch {
    // not a fallback: an unreadable store holds no picks.
    return false;
  }
}

/** Forgets the kept picks: a run was confirmed, or the player closed the flow from its intro. */
export function dropPicks(fileName: string): void {
  try {
    storage()?.removeItem(keyOf(fileName));
  } catch {
    // not a fallback: nothing to forget in a store that cannot be reached.
  }
}
