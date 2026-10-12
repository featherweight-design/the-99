// Which About entries a reader can see, and which of those they have not seen yet
// (Hugh, 2026-09-25: each entry is tied to its feature's switch).
//
// ONE RULE, READ EVERYWHERE. The proxy's decision, the sheet, the what's-new index and the
// page's NEW marks all ask `unseenEntries`. Four readers each with their own copy of "is this
// new" is how the sheet announces an entry the page does not mark.

import { changeCommanderEnabled } from "../commander-change/flag";
import { analysisTabEnabled } from "../decks/analysis-flag";
import { howItWorksEnabled } from "./how-it-works-flag";
import { neverCutEnabled } from "../decks/never-cut-flag";
import { helpMeChooseEnabled } from "../intake/flag";
import { swapToolsEnabled } from "../swaps/flag";
import { manaBalanceEnabled, tuningEnabled } from "../tuning/flag";
import { deckStatsEnabled } from "../decks/stats-flag";
import { collectionEditEnabled } from "../collection/edit-flag";
import { overviewV2Enabled } from "../synopsis/overview-v2";
import { deckBenchmarksEnabled } from "../decks/benchmarks-flag";
import { shoppingMarkBoughtEnabled } from "../decks/mark-bought-flag";
import { allDecksCartEnabled } from "../decks/all-decks-cart-flag";
import { deckPrintingsEnabled } from "../decks/printings-flag";
import { deckTokensEnabled } from "../decks/tokens-flag";
import { preconsEnabled } from "../precons/flag";
import { aboutEntries, type AboutEntry, type AboutLineSwitch, type AboutSwitch } from "../copy/about";

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
  HOW_IT_WORKS_ENABLED: howItWorksEnabled,
  TUNING_ENABLED: tuningEnabled,
  DECK_STATS_ENABLED: deckStatsEnabled,
  COLLECTION_EDIT_ENABLED: collectionEditEnabled,
  OVERVIEW_V2_ENABLED: overviewV2Enabled,
  // The block lives on the Analysis tab, so the entry needs the tab too, as tuning's does: it
  // would otherwise describe a tab that is off.
  DECK_BENCHMARKS_ENABLED: (env) => deckBenchmarksEnabled(env) && analysisTabEnabled(env),
  // On only with COLLECTION_EDIT_ENABLED as well: the feature's own flag already says so.
  SHOPPING_MARK_BOUGHT_ENABLED: shoppingMarkBoughtEnabled,
  DECK_PRINTINGS_ENABLED: deckPrintingsEnabled,
  DECK_TOKENS_ENABLED: deckTokensEnabled,
  // Already reads ANALYSIS_TAB_ENABLED: the tool lives in the tab's Tuning hub.
  MANA_BALANCE_ENABLED: manaBalanceEnabled,
  ALL_DECKS_CART_ENABLED: allDecksCartEnabled,
  PRECONS_ENABLED: preconsEnabled,
};

/** Whether a line's switch keeps it: `!NAME` keeps it while NAME is off. */
function lineKept(sw: AboutLineSwitch, env: NodeJS.ProcessEnv): boolean {
  return sw.startsWith("!") ? !SWITCHES[sw.slice(1) as AboutSwitch](env) : SWITCHES[sw as AboutSwitch](env);
}

/**
 * A caption or key line gated by its OWN switch, on top of the entry's (2026-10-08): `credits`'
 * bullet naming Suggested changes, and `deck-analysis`'s key about the description it reads.
 * Dropped when that switch is off, even though the entry itself draws. A line removed from the
 * caption takes one adjoining newline with it, so no blank line is left where it stood.
 */
function resolveLine(text: string, line: string): string {
  return text.includes(`\n${line}`) ? text.replace(`\n${line}`, "") : text.replace(line, "");
}

/** Exported for `visible.test.ts` alone, to build an expectation from the same resolution
 *  `visibleEntries` applies, rather than hand-duplicating its string surgery. */
export function resolveEntry(entry: AboutEntry, env: NodeJS.ProcessEnv): AboutEntry {
  if (!entry.captionLineSwitches && !entry.keySwitches) return entry;
  let caption = entry.caption;
  for (const [line, sw] of Object.entries(entry.captionLineSwitches ?? {})) {
    if (sw && !lineKept(sw, env)) caption = resolveLine(caption, line);
  }
  const keys = entry.keySwitches
    ? entry.keys.filter((k) => !(k in (entry.keySwitches ?? {})) || lineKept(entry.keySwitches![k]!, env))
    : entry.keys;
  return { ...entry, caption, keys };
}

/** The entries this deployment draws, in page order. An entry with no switch always draws. */
export function visibleEntries(
  env: NodeJS.ProcessEnv = process.env,
  entries: readonly AboutEntry[] = aboutEntries,
): AboutEntry[] {
  return entries
    .filter((e) => !e.switch || SWITCHES[e.switch](env))
    .map((e) => resolveEntry(e, env));
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
