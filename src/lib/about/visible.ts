// Which About entries a reader can see, and which of those they have not seen yet
// (Hugh, 2026-09-25: each entry is tied to its feature's switch).
//
// ONE RULE, READ EVERYWHERE. The proxy's decision, the sheet, the what's-new index and the
// page's NEW marks all ask `unseenEntries`. Four readers each with their own copy of "is this
// new" is how the sheet announces an entry the page does not mark.

import { changeCommanderEnabled } from "../commander-change/flag";
import { analysisTabEnabled } from "../decks/analysis-flag";
import { neverCutEnabled } from "../decks/never-cut-flag";
import { helpMeChooseEnabled } from "../intake/flag";
import { swapToolsEnabled } from "../swaps/flag";
import { aboutEntries, type AboutEntry, type AboutSwitch } from "../copy/about";

/**
 * Each switch read through its feature's OWN flag function, never restated here: an About
 * entry that disagreed with its feature about whether the feature is on would describe a
 * surface the reader cannot reach, or hide one they can.
 */
const SWITCHES: Record<AboutSwitch, (env: NodeJS.ProcessEnv) => boolean> = {
  NEVER_CUT_ENABLED: neverCutEnabled,
  SWAP_TOOLS_ENABLED: swapToolsEnabled,
  HELP_ME_CHOOSE_ENABLED: helpMeChooseEnabled,
  CHANGE_COMMANDER_ENABLED: changeCommanderEnabled,
  ANALYSIS_TAB_ENABLED: analysisTabEnabled,
};

/** The entries this deployment draws, in page order. An entry with no switch always draws. */
export function visibleEntries(
  env: NodeJS.ProcessEnv = process.env,
  entries: readonly AboutEntry[] = aboutEntries,
): AboutEntry[] {
  return entries.filter((e) => !e.switch || SWITCHES[e.switch](env));
}

/**
 * What a reader has seen: the legacy version floor, and the switched entries they have met
 * by id. `{ version: 0, ids: [] }` is a brand-new account.
 */
export type SeenState = { version: number; ids: readonly string[] };

export const NEVER_SEEN: SeenState = { version: 0, ids: [] };

/**
 * An entry with no switch is seen by the version floor, exactly as before. An entry WITH a
 * switch is seen by its id alone. Its `since` cannot say whether a reader met it, because
 * switches flip in any order: turn B on and read it, then turn A on, and A is still new.
 */
export function isSeen(entry: AboutEntry, seen: SeenState): boolean {
  if (entry.switch) return seen.ids.includes(entry.id);
  return entry.since <= seen.version;
}

/** A brand-new account, introduced to the page rather than shown a count (§N3). */
export function isFirstRun(seen: SeenState): boolean {
  return seen.version === 0 && seen.ids.length === 0;
}

/**
 * The visible entries this reader has not seen, in page order. Nothing is new to a
 * first-run reader, because everything is: the page says so in one line instead (§N3).
 */
export function unseenEntries(visible: readonly AboutEntry[], seen: SeenState): AboutEntry[] {
  if (isFirstRun(seen)) return [];
  return visible.filter((e) => !isSeen(e, seen));
}

/** The switched entries this deployment draws, which a visit records as seen. */
export function switchedIds(visible: readonly AboutEntry[]): string[] {
  return visible.filter((e) => e.switch).map((e) => e.id);
}
