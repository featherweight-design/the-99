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
import { findADeckReadEnabled, swapToolsEnabled } from "../swaps/flag";
import { manaBalanceEnabled, proposedCutsEnabled, tuningEnabled, tuningHubEnabled } from "../tuning/flag";
import { deckStatsEnabled } from "../decks/stats-flag";
import { deckNotesEnabled } from "../decks/notes-flag";
import { collectionEditEnabled, collectionSyncEnabled } from "../collection/edit-flag";
import {
  socialFriendsEnabled,
} from "../social/flag";
import { overviewV2Enabled } from "../synopsis/overview-v2";
import { shoppingMarkBoughtEnabled } from "../decks/mark-bought-flag";
import { allDecksCartEnabled } from "../decks/all-decks-cart-flag";
import { deckPrintingsEnabled } from "../decks/printings-flag";
import { paymentsEnabled, welcomeCreditsEnabled } from "../payments/flag";
import { type AboutEntry, type AboutLineSwitch, type AboutLineSwitchOne, type AboutSwitch } from "../copy/about";
import { aboutEntries } from "../copy/about-entries";
import { pushEnabled } from "../push/flag";

/**
 * Each switch read through its feature's OWN flag function, never restated here: an About
 * entry that disagreed with its feature about whether the feature is on would describe a
 * surface the reader cannot reach, or hide one they can.
 */
const SWITCHES: Record<AboutSwitch, (env: NodeJS.ProcessEnv) => boolean> = {
  // Retired switches (always on): the name stays only because About's seen-state keys entries and variants by it, so no
  // reader's New marks move. The entry's `switch` field and this map go in one later pass, with that decision.
  CARD_SEARCH_ENABLED: () => true,
  FIRST_RUN_TOUR_ENABLED: () => true,
  HELP_PANEL_ENABLED: () => true,
  // Card scanning ended in the collection's add, so it was on exactly when collection edit is.
  CARD_SCAN_ENABLED: collectionEditEnabled,
  // Added copy was on exactly when collection edit is (every surface that reports an add is that line's).
  ADDED_COPY_ENABLED: collectionEditEnabled,
  NEVER_CUT_ENABLED: neverCutEnabled,
  SWAP_TOOLS_ENABLED: swapToolsEnabled,
  HELP_ME_CHOOSE_ENABLED: helpMeChooseEnabled,
  CHANGE_COMMANDER_ENABLED: changeCommanderEnabled,
  ANALYSIS_TAB_ENABLED: analysisTabEnabled,
  HOW_IT_WORKS_ENABLED: howItWorksEnabled,
  TUNING_ENABLED: tuningEnabled,
  DECK_STATS_ENABLED: deckStatsEnabled,
  COLLECTION_EDIT_ENABLED: collectionEditEnabled,
  // Already reads COLLECTION_EDIT_ENABLED: Sync is the upload choice's third card.
  COLLECTION_SYNC_ENABLED: collectionSyncEnabled,
  OVERVIEW_V2_ENABLED: overviewV2Enabled,
  // The block lives on the Analysis tab, so the entry needs the tab, as tuning's does: it
  // would otherwise describe a tab that is off.
  DECK_BENCHMARKS_ENABLED: analysisTabEnabled,
  // On only with COLLECTION_EDIT_ENABLED as well: the feature's own flag already says so.
  SHOPPING_MARK_BOUGHT_ENABLED: shoppingMarkBoughtEnabled,
  DECK_PRINTINGS_ENABLED: deckPrintingsEnabled,
  DECK_TOKENS_ENABLED: () => true,
  // Already reads ANALYSIS_TAB_ENABLED: the tool lives in the tab's Tuning hub.
  MANA_BALANCE_ENABLED: manaBalanceEnabled,
  ALL_DECKS_CART_ENABLED: allDecksCartEnabled,
  // Retired (always on): Precons, and the Announced group and banner that lived under it.
  PRECONS_ENABLED: () => true,
  UPCOMING_PRECONS_ENABLED: () => true,
  DECK_NOTES_ENABLED: deckNotesEnabled,
  // History, the lines naming it: the hub's own rule, two or more Tuning tools on.
  TUNING_HUB_ENABLED: tuningHubEnabled,
  LINEUP_ENABLED: () => true,
  // Already reads ANALYSIS_TAB_ENABLED: Look deeper lives in the tab's Tuning hub.
  PROPOSED_CUTS_ENABLED: proposedCutsEnabled,
  // Already reads SWAP_TOOLS_ENABLED: the read lives in Find a deck for it.
  FIND_A_DECK_READ_ENABLED: findADeckReadEnabled,
  // Starting without a collection ended on exactly when collection edit is.
  NO_COLLECTION_ENTRY_ENABLED: collectionEditEnabled,
  // The Social line. Opponents' switch is retired: its name stays the lines' historical identity and follows its
  // parent, `SOCIAL_FRIENDS_ENABLED`, which it needed. The wishlist's is retired too (always on): it stood alone.
  SOCIAL_FRIENDS_ENABLED: socialFriendsEnabled,
  SOCIAL_GAMES_ENABLED: socialFriendsEnabled,
  SOCIAL_WISHLIST_ENABLED: () => true,
  // The launch-end batch. Scanning already needs COLLECTION_EDIT_ENABLED inside its own function. Rule 0's and invites'
  // switches are retired: each name stays the entry's historical identity and follows its parent, SOCIAL_FRIENDS_ENABLED.
  RULE_ZERO_ENABLED: socialFriendsEnabled,
  SOCIAL_INVITES_ENABLED: socialFriendsEnabled,
  PAYMENTS_ENABLED: paymentsEnabled,
  // Already reads PAYMENTS_ENABLED inside its own function.
  WELCOME_CREDITS_ENABLED: welcomeCreditsEnabled,
  // Retired (always on): the feed. The name stays as the lines' historical identity.
  HOME_FEED_ENABLED: () => true,
  // Retired (always on): the name stays as the lines' historical identity.
  COMMANDERS_PLACE_ENABLED: () => true,
  // Retired (always on where friends are): the name stays as the lines' historical identity. It was on exactly when
  // SOCIAL_FRIENDS_ENABLED is, which it needed.
  FRIEND_DECKS_ENABLED: socialFriendsEnabled,
  // Spare requests (close-out): `friend-spares`' variant only. Its switch is retired: the name stays the variant's and
  // the sentence's historical identity and follows its parent.
  SPARE_REQUESTS_ENABLED: socialFriendsEnabled,
  // Combos one piece away (close-out): its own entry, and combo-awareness's card-details key.
  NEAR_COMBOS_ENABLED: () => true,
  // The strategy focus ended on exactly when the Analysis tab is, where its ring mounts.
  STRATEGY_FOCUS_ENABLED: analysisTabEnabled,
  // Push notifications (close-out): its own entry, and `whats-new`'s news key. The
  // switch alone, as its flag reads it: the VAPID check (`pushAvailable`) parses keys with `node:crypto`, and this module
  // is imported by `proxy.ts`.
  PUSH_ENABLED: pushEnabled,
  // Signature card (close-out): a CAPTION line only, the friends entry's face sentence. Its switch is retired; the name
  // stays the line's historical identity and follows its parent.
  SIGNATURE_CARD_ENABLED: socialFriendsEnabled,
};

/**
 * The entry a reader is drawn for an id: the entry itself, or the one drawn in its place (`replaces`). A link or a reader
 * that names an entry by id (`#credits`, the credits text) asks here, so it follows the form the reader actually has.
 */
export function drawnEntry(id: string, visible: readonly AboutEntry[]): AboutEntry | undefined {
  return visible.find((e) => e.id === id) ?? visible.find((e) => e.replaces === id);
}

/** The credits entry this reader is drawn: `buying-credits` with payments on, else the shipped `credits`. */
export const creditsEntryOf = (visible: readonly AboutEntry[]) => drawnEntry("credits", visible);

/** Whether a line's switch keeps it: `!NAME` keeps it while NAME is off; a list keeps it only while every one holds.
 *  Exported for the About pages (`pages-visible.ts`), which gate labels, rules and sentences the same way. */
export function lineKept(sw: AboutLineSwitch, env: NodeJS.ProcessEnv): boolean {
  if (Array.isArray(sw)) return (sw as readonly AboutLineSwitchOne[]).every((one) => lineKept(one, env));
  const one = sw as AboutLineSwitchOne;
  return one.startsWith("!") ? !SWITCHES[one.slice(1) as AboutSwitch](env) : SWITCHES[one as AboutSwitch](env);
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
export function resolveEntry(base: AboutEntry, env: NodeJS.ProcessEnv): AboutEntry {
  // The variant first, so the line switches below read the form the reader is shown.
  const v = base.variant;
  const entry = v && SWITCHES[v.switch](env)
    ? { ...base, title: v.title, caption: v.caption, keys: v.keys, variantOn: v.switch }
    : base;
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

/**
 * The entries this deployment draws, in page order. An entry with no switch always draws, unless an entry drawn in its
 * place (`replaces`) draws.
 */
export function visibleEntries(
  env: NodeJS.ProcessEnv,
  entries: readonly AboutEntry[] = aboutEntries,
): AboutEntry[] {
  const drawn = entries.filter((e) => !e.switch || SWITCHES[e.switch](env));
  const replaced = new Set(drawn.flatMap((e) => (e.replaces ? [e.replaces] : [])));
  return drawn.filter((e) => !replaced.has(e.id)).map((e) => resolveEntry(e, env));
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
  if (entry.variantOn) return seen.ids.includes(variantId(entry.id, entry.variantOn));
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

/** The id an entry drawn in its variant is seen by: its own, with the switch that chose the form. */
export const variantId = (id: string, sw: AboutSwitch) => `${id}@${sw}`;

/**
 * The identity of the FORM an entry is drawn in: its variant id when drawn in its variant, else its own id. What a
 * banner claims and a visit acknowledges in the browser, so a claim or an acknowledgement of one form never answers
 * the other: a banner drawn before a switch chose the variant names the base form, and the reader has not read the
 * variant.
 */
export const displayedId = (e: AboutEntry) => (e.variantOn ? variantId(e.id, e.variantOn) : e.id);

/**
 * The switched entries this deployment draws, and the variants it draws them in, which a visit
 * records as seen. An entry in its variant records its own id too, so the base form is not new
 * again if that switch is later turned off.
 */
export function switchedIds(visible: readonly AboutEntry[]): string[] {
  return visible.flatMap((e) => [
    ...(e.switch ? [e.id] : []),
    ...(e.variantOn ? [variantId(e.id, e.variantOn)] : []),
  ]);
}
