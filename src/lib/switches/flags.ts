import { howItWorksEnabled } from "../about/how-it-works-flag";
import { announcementsEnabled } from "../announcements/flag";
import { listCacheEnabled } from "../cache/list-cache-flag";
import { collectionEditEnabled, collectionSyncEnabled } from "../collection/edit-flag";
import { changeCommanderEnabled } from "../commander-change/flag";
import { commandersPlaceEnabled } from "../commanders/place-flag";
import { allDecksCartEnabled } from "../decks/all-decks-cart-flag";
import { analysisTabEnabled } from "../decks/analysis-flag";
import { labelRoleCountsEnabled } from "../decks/label-counts-flag";
import { shoppingMarkBoughtEnabled } from "../decks/mark-bought-flag";
import { neverCutEnabled } from "../decks/never-cut-flag";
import { deckNotesEnabled } from "../decks/notes-flag";
import { deckPrintingsEnabled } from "../decks/printings-flag";
import { deckStatsEnabled } from "../decks/stats-flag";
import { homeFeedEnabled } from "../feed/flag";
import { pushEnabled } from "../push/flag";
import { helpMeChooseEnabled } from "../intake/flag";
import { bracketReachEnabled } from "../intake/bracket-reach-flag";
import { labelSurfacesEnabled, standInLabelsEnabled } from "../labels/read";
import type { ModelFeature } from "../model/allowance-rule";
import { noticesEnabled } from "../notices/flag";
import { publicPagesEnabled } from "../public/flag";
import { navStallLogEnabled } from "../nav-stall/flag";
import { paymentsEnabled, welcomeCreditsEnabled } from "../payments/flag";
import { rateLimitEnabled } from "../rate/flag";
import { scanLabEnabled } from "../scan-lab/flag";
import { friendDecksEnabled, ruleZeroEnabled, signatureCardEnabled, socialFriendsEnabled, socialGamesEnabled, socialInvitesEnabled, spareRequestsEnabled } from "../social/flag";
import { findADeckReadEnabled, swapToolsEnabled } from "../swaps/flag";
import { overviewV2Enabled } from "../synopsis/overview-v2";
import { manaBalanceEnabled, proposedCutsEnabled, suggestedChangesV2Enabled, tuningEnabled } from "../tuning/flag";
import { wishlistEnabled } from "../wishlist/flag";
import type { SwitchName } from "./registry";

/**
 * Every switch's own flag function (admin PR 8). A switch is ON for a reader when this returns true
 * over that reader's resolved env, so a child whose parent is off counts as off, exactly as the app
 * decides it. Server-side by its imports.
 */
export const SWITCH_FLAGS: Readonly<Record<SwitchName, (env: NodeJS.ProcessEnv) => boolean>> = {
  ALL_DECKS_CART_ENABLED: allDecksCartEnabled,
  ANALYSIS_TAB_ENABLED: analysisTabEnabled,
  ANNOUNCEMENTS_ENABLED: announcementsEnabled,
  BRACKET_REACH_ENABLED: bracketReachEnabled,
  CHANGE_COMMANDER_ENABLED: changeCommanderEnabled,
  COLLECTION_EDIT_ENABLED: collectionEditEnabled,
  COLLECTION_SYNC_ENABLED: collectionSyncEnabled,
  COMMANDERS_PLACE_ENABLED: commandersPlaceEnabled,
  DECK_NOTES_ENABLED: deckNotesEnabled,
  DECK_PRINTINGS_ENABLED: deckPrintingsEnabled,
  DECK_STATS_ENABLED: deckStatsEnabled,
  FIND_A_DECK_READ_ENABLED: findADeckReadEnabled,
  HELP_ME_CHOOSE_ENABLED: helpMeChooseEnabled,
  FRIEND_DECKS_ENABLED: friendDecksEnabled,
  HOME_FEED_ENABLED: homeFeedEnabled,
  HOW_IT_WORKS_ENABLED: howItWorksEnabled,
  LABEL_ROLE_COUNTS_ENABLED: labelRoleCountsEnabled,
  LABEL_SURFACES_ENABLED: labelSurfacesEnabled,
  LIST_CACHE_ENABLED: listCacheEnabled,
  MANA_BALANCE_ENABLED: manaBalanceEnabled,
  NAV_STALL_LOG_ENABLED: navStallLogEnabled,
  NEVER_CUT_ENABLED: neverCutEnabled,
  NOTICES_ENABLED: noticesEnabled,
  OVERVIEW_V2_ENABLED: overviewV2Enabled,
  PAYMENTS_ENABLED: paymentsEnabled,
  PROPOSED_CUTS_ENABLED: proposedCutsEnabled,
  PUBLIC_PAGES_ENABLED: publicPagesEnabled,
  RATE_LIMIT_ENABLED: rateLimitEnabled,
  RULE_ZERO_ENABLED: ruleZeroEnabled,
  SCAN_LAB_ENABLED: scanLabEnabled,
  SHOPPING_MARK_BOUGHT_ENABLED: shoppingMarkBoughtEnabled,
  SIGNATURE_CARD_ENABLED: signatureCardEnabled,
  SOCIAL_FRIENDS_ENABLED: socialFriendsEnabled,
  SOCIAL_GAMES_ENABLED: socialGamesEnabled,
  SOCIAL_INVITES_ENABLED: socialInvitesEnabled,
  SOCIAL_WISHLIST_ENABLED: wishlistEnabled,
  SPARE_REQUESTS_ENABLED: spareRequestsEnabled,
  PUSH_ENABLED: pushEnabled,
  STAND_IN_LABELS_ENABLED: standInLabelsEnabled,
  SUGGESTED_CHANGES_V2_ENABLED: suggestedChangesV2Enabled,
  SWAP_TOOLS_ENABLED: swapToolsEnabled,
  TUNING_ENABLED: tuningEnabled,
  WELCOME_CREDITS_ENABLED: welcomeCreditsEnabled,
};

/**
 * What a reader can press that spends model calls, per ledger feature (READINESS audit finding 2):
 * each capability's predicate over a reader's resolved env. A parent's flip (the Analysis tab gates
 * the Overview, Suggested changes and Proposed cuts) moves these as surely as a child's, which is why
 * `flags.test.ts` holds the registry's `model` tag to them. Admin PR 8c's confirm fires on a write that
 * raises how many accounts hold any of these (`riseBetween` in `explain.ts`).
 * `overview_v2` moves the Overview's model and method, so it counts apart.
 */
export type ModelCapabilityKey = ModelFeature | "overview_v2";
export const MODEL_CAPABILITIES: readonly { key: ModelCapabilityKey; on: (env: NodeJS.ProcessEnv) => boolean }[] = [
  { key: "synopsis", on: analysisTabEnabled },
  { key: "overview_v2", on: (env) => analysisTabEnabled(env) && overviewV2Enabled(env) },
  { key: "tuning", on: tuningEnabled },
  { key: "suggested_changes_v2", on: suggestedChangesV2Enabled },
  { key: "proposed_cuts", on: proposedCutsEnabled },
  { key: "intake", on: helpMeChooseEnabled },
  { key: "fits_read", on: findADeckReadEnabled },
];
