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
 * - `plumbing`: infrastructure, or a surface no friend tries on its own (the About sheet and How it
 *   works, by Design's answer to the brief's open question 2). App-wide only: an account or group
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
  { name: "ABOUT_SHEET_ENABLED", kind: "plumbing" },
  { name: "ADDED_COPY_ENABLED", kind: "feature", needs: "COLLECTION_EDIT_ENABLED" },
  { name: "ALL_DECKS_CART_ENABLED", kind: "feature" },
  { name: "ANALYSIS_TAB_ENABLED", kind: "model" },
  { name: "CHANGE_COMMANDER_ENABLED", kind: "feature" },
  { name: "COLLECTION_EDIT_ENABLED", kind: "feature" },
  { name: "COLLECTION_SYNC_ENABLED", kind: "feature", needs: "COLLECTION_EDIT_ENABLED" },
  { name: "DECK_BENCHMARKS_ENABLED", kind: "feature" },
  { name: "DECK_NOTES_ENABLED", kind: "feature" },
  { name: "DECK_PRINTINGS_ENABLED", kind: "feature" },
  { name: "DECK_STATS_ENABLED", kind: "feature" },
  { name: "DECK_TOKENS_ENABLED", kind: "feature" },
  { name: "FIND_A_DECK_READ_ENABLED", kind: "model", needs: "SWAP_TOOLS_ENABLED" },
  { name: "HELP_ME_CHOOSE_ENABLED", kind: "model" },
  { name: "HOW_IT_WORKS_ENABLED", kind: "plumbing" },
  { name: "LABEL_ROLE_COUNTS_ENABLED", kind: "plumbing" },
  { name: "LABEL_SURFACES_ENABLED", kind: "feature" },
  { name: "LINEUP_ENABLED", kind: "feature" },
  { name: "LIST_CACHE_ENABLED", kind: "plumbing" },
  { name: "MANA_BALANCE_ENABLED", kind: "feature", needs: "ANALYSIS_TAB_ENABLED" },
  { name: "NAV_STALL_LOG_ENABLED", kind: "plumbing" },
  { name: "NEVER_CUT_ENABLED", kind: "feature" },
  { name: "NOTICES_ENABLED", kind: "feature" },
  { name: "OVERVIEW_V2_ENABLED", kind: "model" },
  { name: "PRECONS_ENABLED", kind: "feature" },
  { name: "PROPOSED_CUTS_ENABLED", kind: "model", needs: "ANALYSIS_TAB_ENABLED" },
  { name: "RATE_LIMIT_ENABLED", kind: "plumbing" },
  { name: "SHOPPING_MARK_BOUGHT_ENABLED", kind: "feature", needs: "COLLECTION_EDIT_ENABLED" },
  { name: "SOCIAL_FRIENDS_ENABLED", kind: "feature" },
  { name: "SOCIAL_GAMES_ENABLED", kind: "feature", needs: "SOCIAL_FRIENDS_ENABLED" },
  { name: "SOCIAL_WISHLIST_ENABLED", kind: "feature" },
  { name: "STAND_IN_LABELS_ENABLED", kind: "feature" },
  { name: "SWAP_TOOLS_ENABLED", kind: "model" },
  { name: "TUNING_ENABLED", kind: "model", needs: "ANALYSIS_TAB_ENABLED" },
  { name: "UPCOMING_PRECONS_ENABLED", kind: "feature", needs: "PRECONS_ENABLED" },
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
 * Empty as of 2026-10-15, by an audit of every feature and model switch: none breaks without config.
 * The model switches need `ANTHROPIC_API_KEY`, and without it a run ends refused rather than throwing
 * (`src/lib/model/client.ts`, `realMessages`); payment, webhook and cron secrets sit behind no switch;
 * every table a switch reads ships in a migration production applies on deploy.
 */
export const ALL_FEATURES_EXCLUDED: Readonly<Partial<Record<SwitchName, string>>> = {};

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
