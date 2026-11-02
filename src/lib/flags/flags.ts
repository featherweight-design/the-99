import { announcementsEnabled } from "../announcements/flag";
import { listCacheEnabled } from "../cache/list-cache-flag";
import { pushEnabled } from "../push/flag";
import type { ModelFeature } from "../model/allowance-rule";
import { modelCallsEnabled } from "../model/calls-flag";
import { publicPagesEnabled } from "../public/flag";
import { navStallLogEnabled } from "../nav-stall/flag";
import { paymentsEnabled, welcomeCreditsEnabled } from "../payments/flag";
import { rateLimitEnabled } from "../rate/flag";
import { scanLabEnabled } from "../scan-lab/flag";
import { feedbackEnabled } from "../feedback/flag";
import { flyerTrialEnabled } from "../flyer/flag";
import { overviewV2Enabled } from "../synopsis/overview-v2";
import { suggestedChangesV2Enabled } from "../tuning/flag";
import type { SwitchName } from "./registry";

/**
 * Every switch's own flag function (admin PR 8). A switch is ON for a reader when this returns true
 * over that reader's resolved env, so a child whose parent is off counts as off, exactly as the app
 * decides it. Server-side by its imports.
 */
export const SWITCH_FLAGS: Readonly<Record<SwitchName, (env: NodeJS.ProcessEnv) => boolean>> = {
  ANNOUNCEMENTS_ENABLED: announcementsEnabled,
  FEEDBACK_ENABLED: feedbackEnabled,
  FLYER_TRIAL_ENABLED: flyerTrialEnabled,
  LIST_CACHE_ENABLED: listCacheEnabled,
  MODEL_CALLS_ENABLED: modelCallsEnabled,
  NAV_STALL_LOG_ENABLED: navStallLogEnabled,
  OVERVIEW_V2_ENABLED: overviewV2Enabled,
  PAYMENTS_ENABLED: paymentsEnabled,
  PUBLIC_PAGES_ENABLED: publicPagesEnabled,
  RATE_LIMIT_ENABLED: rateLimitEnabled,
  SCAN_LAB_ENABLED: scanLabEnabled,
  PUSH_ENABLED: pushEnabled,
  SUGGESTED_CHANGES_V2_ENABLED: suggestedChangesV2Enabled,
  WELCOME_CREDITS_ENABLED: welcomeCreditsEnabled,
};

/**
 * What a reader can press that spends model calls, per ledger feature (READINESS audit finding 2):
 * each capability's predicate over a reader's resolved env. A parent's flip moves these as surely as a
 * child's, which is why `flags.test.ts` holds the registry's `model` tag to them. Admin PR 8c's confirm fires on a write that
 * raises how many accounts hold any of these (`riseBetween` in `explain.ts`).
 * `overview_v2` moves the Overview's model and method, so it counts apart.
 */
export type ModelCapabilityKey = ModelFeature | "overview_v2";
export const MODEL_CAPABILITIES: readonly { key: ModelCapabilityKey; on: (env: NodeJS.ProcessEnv) => boolean }[] = [
  // The Analysis tab's switch is retired (always on, Hugh 2026-11-01): the Overview, Suggested changes and Proposed cuts
  // mount on it, so their paid runs are always offered and only the model-call kill switch stops them.
  { key: "synopsis", on: () => true },
  { key: "overview_v2", on: overviewV2Enabled },
  { key: "tuning", on: () => true },
  { key: "suggested_changes_v2", on: suggestedChangesV2Enabled },
  { key: "proposed_cuts", on: () => true },
  // Help me choose's read followed its own switch, which is retired (always on): only the model-call kill switch stops it.
  { key: "intake", on: () => true },
  // Find a deck's read followed swap tools, whose switch is retired (always on): only the model-call kill switch stops it.
  { key: "fits_read", on: () => true },
];
