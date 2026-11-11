// What the About pages need from a reader's switches and seen state: `lineKept` (the one reading of a switch gating a
// label, rule or sentence), `SeenState` and `isFirstRun`. The entry catalog this once resolved is retired.

import { suggestedChangesV2Enabled } from "../tuning/flag";
import { paymentsEnabled, welcomeCreditsEnabled } from "../payments/flag";
import { type AboutLineSwitch, type AboutLineSwitchOne, type AboutSwitch } from "../copy/about";
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
  // Retired (always on): the swap tools. The name stays as the entries', pages' and sentences' historical identity.
  SWAP_TOOLS_ENABLED: () => true,
  // Retired (always on): Help me choose. The name stays as the entry's, lines' and sentences' historical identity.
  HELP_ME_CHOOSE_ENABLED: () => true,
  // Retired (always on): Change commander. The name stays as the entry's historical identity.
  CHANGE_COMMANDER_ENABLED: () => true,
  // Retired (always on): the Analysis tab. The name stays as the entries', pages' and sentences' historical identity.
  ANALYSIS_TAB_ENABLED: () => true,
  // Retired (always on): How the app reaches its answers. The name stays as the appendix's historical identity.
  HOW_IT_WORKS_ENABLED: () => true,
  // Retired: Suggested changes followed its parent, the Analysis tab, which is retired too (always on). The name stays as
  // its entry's and lines' historical identity.
  TUNING_ENABLED: () => true,
  SUGGESTED_CHANGES_V2_ENABLED: suggestedChangesV2Enabled,
  // Retired (always on): Stats. The name stays as the entry's and the section's historical identity.
  DECK_STATS_ENABLED: () => true,
  // Retired (always on): collection editing. The name stays as the entries', variants' and sentences' historical identity.
  COLLECTION_EDIT_ENABLED: () => true,
  // Sync is the upload choice's third card. Its switch is retired, and so is its parent's, collection editing: the name
  // stays the variant's and the sentences' historical identity.
  COLLECTION_SYNC_ENABLED: () => true,
  // The block lives on the Analysis tab, so the entry followed the tab, which is retired (always on).
  DECK_BENCHMARKS_ENABLED: () => true,
  // I got it's switch is retired, and so is its parent's, collection editing: the name stays the entry's, the key's and
  // the label's historical identity.
  SHOPPING_MARK_BOUGHT_ENABLED: () => true,
  // Retired (always on): deck printings. The name stays as the entry's historical identity.
  DECK_PRINTINGS_ENABLED: () => true,
  DECK_TOKENS_ENABLED: () => true,
  // Retired: Mana Balance followed its parent, the Analysis tab, which is retired too (always on). The name stays as its
  // lines' historical identity.
  MANA_BALANCE_ENABLED: () => true,
  // Retired (always on): Shopping for all decks. The name stays as the entries', variants' and sentences' historical identity.
  ALL_DECKS_CART_ENABLED: () => true,
  // Retired (always on): Precons, and the Announced group and banner that lived under it.
  PRECONS_ENABLED: () => true,
  UPCOMING_PRECONS_ENABLED: () => true,
  // Retired (always on): Notes. The name stays as the entry's and the section's historical identity.
  DECK_NOTES_ENABLED: () => true,
  // History, the lines naming it: the hub draws wherever the Analysis tab does, and the tab is retired (always on).
  TUNING_HUB_ENABLED: () => true,
  LINEUP_ENABLED: () => true,
  // Retired: Proposed cuts followed its parent, the Analysis tab, which is retired too (always on). The name stays as its
  // lines' historical identity.
  PROPOSED_CUTS_ENABLED: () => true,
  // Retired (always on): Find a deck's read followed its parent, swap tools, which is retired too. The name stays as the entry's and lines' historical identity.
  FIND_A_DECK_READ_ENABLED: () => true,
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
  // The strategy focus ended on exactly when the Analysis tab is, where its ring mounts; the tab is retired (always on).
  STRATEGY_FOCUS_ENABLED: () => true,
  // Push notifications (close-out): its own entry, and `whats-new`'s news key. The
  // switch alone, as its flag reads it: the VAPID check (`pushAvailable`) parses keys with `node:crypto`, and this module
  // is imported by `proxy.ts`.
  PUSH_ENABLED: pushEnabled,
  // Retired (always on): signature card, a CAPTION line only, the friends entry's face sentence. The name stays the
  // line's historical identity.
  SIGNATURE_CARD_ENABLED: () => true,
};

/** Whether a line's switch keeps it: `!NAME` keeps it while NAME is off; a list keeps it only while every one holds.
 *  Exported for the About pages (`pages-visible.ts`), which gate labels, rules and sentences the same way. */
export function lineKept(sw: AboutLineSwitch, env: NodeJS.ProcessEnv): boolean {
  if (Array.isArray(sw)) return (sw as readonly AboutLineSwitchOne[]).every((one) => lineKept(one, env));
  const one = sw as AboutLineSwitchOne;
  return one.startsWith("!") ? !SWITCHES[one.slice(1) as AboutSwitch](env) : SWITCHES[one as AboutSwitch](env);
}

/**
 * What a reader has seen: the legacy version floor, and the switched entries they have met
 * by id. `{ version: 0, ids: [] }` is a brand-new account.
 */
export type SeenState = { version: number; ids: readonly string[] };

export const NEVER_SEEN: SeenState = { version: 0, ids: [] };

/** A brand-new account, introduced to the page rather than shown a count (§N3). */
export function isFirstRun(seen: SeenState): boolean {
  return seen.version === 0 && seen.ids.length === 0;
}
