/**
 * Every app switch the admin can override (admin plan, PR 4; brief, rulings 1 and 2). The
 * environment variable keeps its meaning and stays the default; an override in `flag_overrides`
 * sits on top of it. A name here is the variable's own, so a resolved env carries it unchanged.
 *
 * The list is CLOSED: `flag_overrides.switch` is checked against it by constraint, and
 * `registry.test.ts` fails when `src/` reads an `*_ENABLED` variable this list does not name, or
 * names one nothing reads.
 *
 * `kind`:
 * - `feature`: a surface a reader sees. Overridable app-wide, per group and per account.
 * - `model`: as `feature`, and turning it on can let a reader spend model calls: the switch itself,
 *   or a parent of one (the Analysis tab gates the Overview; Swap tools gates Find a deck's read).
 *   The Switches list marks it; the confirm fires on the capabilities a write raises, not on this tag.
 *   `flags.test.ts` holds the tag to exactly that.
 * - `plumbing`: infrastructure, or a surface no friend tries on its own (How it works, by Design's
 *   answer to the brief's open question 2). App-wide only: an account or group
 *   override of one is ignored by the resolver, so no reader runs on different plumbing.
 *
 * `needs`: the parent a compound switch's flag function also checks (`tuningEnabled` asks
 * `analysisTabEnabled`). The flag functions decide; this records it for the admin, and
 * `flags.test.ts` fails when the two disagree.
 *
 * Client-safe: no imports.
 */
export type SwitchKind = "feature" | "model" | "plumbing";

export const SWITCHES = [
  { name: "ALL_DECKS_CART_ENABLED", kind: "feature" },
  { name: "ANALYSIS_TAB_ENABLED", kind: "model" },
  { name: "ANNOUNCEMENTS_ENABLED", kind: "feature" },
  { name: "BRACKET_REACH_ENABLED", kind: "feature", needs: "HELP_ME_CHOOSE_ENABLED" },
  { name: "CHANGE_COMMANDER_ENABLED", kind: "feature" },
  { name: "COLLECTION_EDIT_ENABLED", kind: "feature" },
  { name: "COLLECTION_SYNC_ENABLED", kind: "feature", needs: "COLLECTION_EDIT_ENABLED" },
  { name: "COMMANDERS_PLACE_ENABLED", kind: "feature" },
  { name: "DECK_NOTES_ENABLED", kind: "feature" },
  { name: "DECK_PRINTINGS_ENABLED", kind: "feature" },
  { name: "DECK_STATS_ENABLED", kind: "feature" },
  { name: "FEEDBACK_ENABLED", kind: "feature" },
  { name: "FIND_A_DECK_READ_ENABLED", kind: "model", needs: "SWAP_TOOLS_ENABLED" },
  { name: "HELP_ME_CHOOSE_ENABLED", kind: "model" },
  { name: "FLYER_TRIAL_ENABLED", kind: "feature" },
  { name: "FRIEND_DECKS_ENABLED", kind: "feature", needs: "SOCIAL_FRIENDS_ENABLED" },
  { name: "HOME_FEED_ENABLED", kind: "feature" },
  { name: "HOW_IT_WORKS_ENABLED", kind: "plumbing" },
  { name: "LABEL_ROLE_COUNTS_ENABLED", kind: "plumbing" },
  { name: "LABEL_SURFACES_ENABLED", kind: "feature" },
  { name: "LIST_CACHE_ENABLED", kind: "plumbing" },
  { name: "MANA_BALANCE_ENABLED", kind: "feature", needs: "ANALYSIS_TAB_ENABLED" },
  { name: "NAV_STALL_LOG_ENABLED", kind: "plumbing" },
  { name: "NEVER_CUT_ENABLED", kind: "feature" },
  { name: "NOTICES_ENABLED", kind: "feature" },
  { name: "OVERVIEW_V2_ENABLED", kind: "model" },
  { name: "PAYMENTS_ENABLED", kind: "feature" },
  { name: "PUSH_ENABLED", kind: "feature", needs: "HOME_FEED_ENABLED" },
  { name: "PROPOSED_CUTS_ENABLED", kind: "model", needs: "ANALYSIS_TAB_ENABLED" },
  { name: "PUBLIC_PAGES_ENABLED", kind: "plumbing" },
  { name: "RATE_LIMIT_ENABLED", kind: "plumbing" },
  { name: "RULE_ZERO_ENABLED", kind: "feature", needs: "SOCIAL_FRIENDS_ENABLED" },
  { name: "SCAN_LAB_ENABLED", kind: "plumbing" },
  { name: "SHOPPING_MARK_BOUGHT_ENABLED", kind: "feature", needs: "COLLECTION_EDIT_ENABLED" },
  { name: "SIGNATURE_CARD_ENABLED", kind: "feature", needs: "SOCIAL_FRIENDS_ENABLED" },
  { name: "SOCIAL_FRIENDS_ENABLED", kind: "feature" },
  { name: "SOCIAL_GAMES_ENABLED", kind: "feature", needs: "SOCIAL_FRIENDS_ENABLED" },
  { name: "SOCIAL_INVITES_ENABLED", kind: "feature", needs: "SOCIAL_FRIENDS_ENABLED" },
  { name: "SOCIAL_WISHLIST_ENABLED", kind: "feature" },
  { name: "SPARE_REQUESTS_ENABLED", kind: "feature", needs: "SOCIAL_FRIENDS_ENABLED" },
  { name: "STAND_IN_LABELS_ENABLED", kind: "feature" },
  { name: "SUGGESTED_CHANGES_V2_ENABLED", kind: "model", needs: "TUNING_ENABLED" },
  { name: "SWAP_TOOLS_ENABLED", kind: "model" },
  { name: "TUNING_ENABLED", kind: "model", needs: "ANALYSIS_TAB_ENABLED" },
  { name: "WELCOME_CREDITS_ENABLED", kind: "feature", needs: "PAYMENTS_ENABLED" },
] as const satisfies readonly { name: `${string}_ENABLED`; kind: SwitchKind; needs?: `${string}_ENABLED` }[];

export type SwitchName = (typeof SWITCHES)[number]["name"];

export const SWITCH_NAMES: readonly SwitchName[] = SWITCHES.map((s) => s.name);

const KINDS = new Map<string, SwitchKind>(SWITCHES.map((s) => [s.name, s.kind]));

export const switchKind = (name: SwitchName): SwitchKind => KINDS.get(name) as SwitchKind;

const PARENTS = new Map<string, SwitchName>(
  SWITCHES.flatMap((s) => ("needs" in s ? [[s.name, s.needs as SwitchName] as const] : [])),
);

/** The parent a compound switch needs, or null. */
export const switchParent = (name: SwitchName): SwitchName | null => PARENTS.get(name) ?? null;

export const isSwitchName = (name: string): name is SwitchName => KINDS.has(name);

/**
 * All features (Hugh, 2026-10-15): one account-scoped row in `flag_overrides` under this reserved name
 * raises every switch in `ALL_FEATURES_RAISES` for that account, so a switch added later is covered by
 * the row already there. Not a registry switch: no variable carries it and no flag function reads it.
 * The resolver applies it below the account's own overrides (an account's explicit Off still wins)
 * and above the group and app-wide rungs; the env kill switch still beats it.
 */
export const ALL_FEATURES = "ALL_FEATURES";
export type OverrideName = SwitchName | typeof ALL_FEATURES;
export const isOverrideName = (name: string): name is OverrideName => name === ALL_FEATURES || isSwitchName(name);

/**
 * Switches All features leaves to their other rungs, each with the reason: a switch whose surface
 * breaks on a deployment lacking config it needs. A plumbing switch is never raised (it is not a
 * feature a reader tries), so it needs no entry here.
 *
 * Empty as of 2026-10-15, by an audit of every feature and model switch: none breaks without config. It held
 * `COMMANDERS_PLACE_ENABLED` and `HOME_FEED_ENABLED` on 2026-10-22 while their surfaces landed (menu and Home), until
 * Home drew the feed. It held `SPARE_REQUESTS_ENABLED` from 2026-10-22 until spare requests'
 * close-out (the asks and answers drawn, its About lines shipped). `NEAR_COMBOS_ENABLED` held it from 2026-10-22 and left it with its
 * About entry (`combos-one-away`) once the deck page and card details drew it. `FRIEND_DECKS_ENABLED` left it on 2026-10-22 with its About entry (`friend-decks`).
 * `STRATEGY_FOCUS_ENABLED` left it on 2026-10-22 with Suggested changes aiming at the focus and its About entry (`deck-focus`).
 * `PUSH_ENABLED` held it from 2026-10-22 and left it on 2026-10-23 with its About entry (`push`), once Settings drew the push
 * column and the cron sent. Without the VAPID keys Settings draws no push column and nothing is sent (`pushAvailable`),
 * but the About `push` entry and the `whats-new` key follow the switch alone (`pushEnabled`: `visible.ts` sits on the proxy's
 * path, where the key parsing may not), so they would describe a column that is not there. Both Vercel projects carry the
 * keys (Production scope) and previews are not built, so that only happens on a local server run without them.
 * `SIGNATURE_CARD_ENABLED` held it from 2026-10-27 and left it with the `friends` entry's signature-card caption line.
 * `FLYER_TRIAL_ENABLED` and `FEEDBACK_ENABLED` hold it from 2026-10-30, until the first PR that ships a usable surface for each
 * (flyer: the `/join` page, PR 3; feedback: Report a problem, PR 5). Raised early, an account would see half a trial.
 * It holds the two above; a switch that joins it carries its reason beside it.
 * The model switches need `ANTHROPIC_API_KEY`, and without it a run ends refused rather than throwing
 * (`src/lib/model/client.ts`, `realMessages`); payment, webhook and cron secrets sit behind no switch;
 * every table a switch reads ships in a migration production applies on deploy.
 */
export const ALL_FEATURES_EXCLUDED: Readonly<Partial<Record<SwitchName, string>>> = {
  FEEDBACK_ENABLED: "no feedback surface yet; it joins All features with Report a problem (flyer trial PR 5)",
  FLYER_TRIAL_ENABLED: "no flyer surface yet; it joins All features with the `/join` page (flyer trial PR 3)",
  // SUGGESTED_CHANGES_V2_ENABLED left on 2026-10-29 (Hugh: switches are on by default for his account), once
  // its intake, wait, results and apply had shipped; its History view and in-flight tile follow in later PRs.
};

/**
 * What All features raises: every `feature` and `model` switch not excluded, and every parent those
 * need, so a raised child is never held off by a parent the account would otherwise lack.
 */
export const ALL_FEATURES_RAISES: ReadonlySet<SwitchName> = (() => {
  const out = new Set<SwitchName>();
  for (const s of SWITCHES) {
    if (s.kind === "plumbing" || s.name in ALL_FEATURES_EXCLUDED) continue;
    for (let n: SwitchName | null = s.name; n && !out.has(n); n = switchParent(n)) out.add(n);
  }
  return out;
})();
