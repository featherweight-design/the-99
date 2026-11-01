// Which About entries a reader can see, and which of those they have not seen yet
// (Hugh, 2026-09-25: each entry is tied to its feature's switch).
//
// ONE RULE, READ EVERYWHERE. The proxy's decision, the sheet, the what's-new index and the
// page's NEW marks all ask `unseenEntries`. Four readers each with their own copy of "is this
// new" is how the sheet announces an entry the page does not mark.

import { analysisTabEnabled } from "../decks/analysis-flag";
import { helpMeChooseEnabled } from "../intake/flag";
import { swapToolsEnabled } from "../swaps/flag";
import { suggestedChangesV2Enabled, tuningEnabled, tuningHubEnabled } from "../tuning/flag";
import { overviewV2Enabled } from "../synopsis/overview-v2";
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
  // Card scanning ended in the collection's add, and added copy on every surface that reports an add: both were on
  // exactly when collection edit was, and it is retired (always on).
  CARD_SCAN_ENABLED: () => true,
  ADDED_COPY_ENABLED: () => true,
  // Retired (always on): Locked, never cut. The name stays as the entries', pages' and rules' historical identity.
  NEVER_CUT_ENABLED: () => true,
  SWAP_TOOLS_ENABLED: swapToolsEnabled,
  HELP_ME_CHOOSE_ENABLED: helpMeChooseEnabled,
  // Retired (always on): Change commander. The name stays as the entry's historical identity.
  CHANGE_COMMANDER_ENABLED: () => true,
  ANALYSIS_TAB_ENABLED: analysisTabEnabled,
  // Retired (always on): How the app reaches its answers. The name stays as the appendix's historical identity.
  HOW_IT_WORKS_ENABLED: () => true,
  TUNING_ENABLED: tuningEnabled,
  SUGGESTED_CHANGES_V2_ENABLED: suggestedChangesV2Enabled,
  // Retired (always on): Stats. The name stays as the entry's and the section's historical identity.
  DECK_STATS_ENABLED: () => true,
  // Retired (always on): collection editing. The name stays as the entries', variants' and sentences' historical identity.
  COLLECTION_EDIT_ENABLED: () => true,
  // Sync is the upload choice's third card. Its switch is retired, and so is its parent's, collection editing: the name
  // stays the variant's and the sentences' historical identity.
  COLLECTION_SYNC_ENABLED: () => true,
  OVERVIEW_V2_ENABLED: overviewV2Enabled,
  // The block lives on the Analysis tab, so the entry needs the tab, as tuning's does: it
  // would otherwise describe a tab that is off.
  DECK_BENCHMARKS_ENABLED: analysisTabEnabled,
  // I got it's switch is retired, and so is its parent's, collection editing: the name stays the entry's, the key's and
  // the label's historical identity.
  SHOPPING_MARK_BOUGHT_ENABLED: () => true,
  // Retired (always on): deck printings. The name stays as the entry's historical identity.
  DECK_PRINTINGS_ENABLED: () => true,
  DECK_TOKENS_ENABLED: () => true,
  // Retired: Mana Balance follows its parent, the Analysis tab, where it mounts. The name stays as its lines' historical identity.
  MANA_BALANCE_ENABLED: analysisTabEnabled,
  // Retired (always on): Shopping for all decks. The name stays as the entries', variants' and sentences' historical identity.
  ALL_DECKS_CART_ENABLED: () => true,
  // Retired (always on): Precons, and the Announced group and banner that lived under it.
  PRECONS_ENABLED: () => true,
  UPCOMING_PRECONS_ENABLED: () => true,
  // Retired (always on): Notes. The name stays as the entry's and the section's historical identity.
  DECK_NOTES_ENABLED: () => true,
  // History, the lines naming it: the hub's own rule, two or more Tuning tools on.
  TUNING_HUB_ENABLED: tuningHubEnabled,
  LINEUP_ENABLED: () => true,
  // Retired: Proposed cuts follows its parent, the Analysis tab, where it mounts. The name stays as its lines' historical identity.
  PROPOSED_CUTS_ENABLED: analysisTabEnabled,
  // Find a deck's read follows its parent, swap tools (its own switch is retired). The name stays as the entry's and lines' historical identity.
  FIND_A_DECK_READ_ENABLED: swapToolsEnabled,
  // Starting without a collection ended on exactly when collection edit was (retired, always on).
  NO_COLLECTION_ENTRY_ENABLED: () => true,
  // Retired (always on): the Social line. Friends, and opponents with it, which needed it; the wishlist stood alone.
  // Each name stays its lines' historical identity.
  SOCIAL_FRIENDS_ENABLED: () => true,
  SOCIAL_GAMES_ENABLED: () => true,
  SOCIAL_WISHLIST_ENABLED: () => true,
  // Retired (always on): the launch-end batch, Rule 0 and invites. Each name stays the entry's historical identity.
  RULE_ZERO_ENABLED: () => true,
  SOCIAL_INVITES_ENABLED: () => true,
  PAYMENTS_ENABLED: paymentsEnabled,
  // Already reads PAYMENTS_ENABLED inside its own function.
  WELCOME_CREDITS_ENABLED: welcomeCreditsEnabled,
  // Retired (always on): the feed. The name stays as the lines' historical identity.
  HOME_FEED_ENABLED: () => true,
  // Retired (always on): the name stays as the lines' historical identity.
  COMMANDERS_PLACE_ENABLED: () => true,
  // Retired (always on): friend decks. The name stays as the lines' historical identity.
  FRIEND_DECKS_ENABLED: () => true,
  // Retired (always on): spare requests, `friend-spares`' variant only. The name stays the variant's and the sentence's
  // historical identity.
  SPARE_REQUESTS_ENABLED: () => true,
  // Combos one piece away (close-out): its own entry, and combo-awareness's card-details key.
  NEAR_COMBOS_ENABLED: () => true,
  // The strategy focus ended on exactly when the Analysis tab is, where its ring mounts.
  STRATEGY_FOCUS_ENABLED: analysisTabEnabled,
  // Push notifications (close-out): its own entry, and `whats-new`'s news key. The
  // switch alone, as its flag reads it: the VAPID check (`pushAvailable`) parses keys with `node:crypto`, and this module
  // is imported by `proxy.ts`.
  PUSH_ENABLED: pushEnabled,
  // Retired (always on): signature card, a CAPTION line only, the friends entry's face sentence. The name stays the
  // line's historical identity.
  SIGNATURE_CARD_ENABLED: () => true,
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
