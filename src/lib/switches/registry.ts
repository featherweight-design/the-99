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
 * - `model`: as `feature`, and turning it on spends model calls (the Switches UI confirms a raise).
 * - `plumbing`: infrastructure with no reader-facing difference. App-wide only: an account or
 *   group override of one is ignored by the resolver, so no reader runs on different plumbing.
 *
 * Client-safe: no imports.
 */
export type SwitchKind = "feature" | "model" | "plumbing";

export const SWITCHES = [
  { name: "ABOUT_SHEET_ENABLED", kind: "feature" },
  { name: "ADDED_COPY_ENABLED", kind: "feature" },
  { name: "ALL_DECKS_CART_ENABLED", kind: "feature" },
  { name: "ANALYSIS_TAB_ENABLED", kind: "feature" },
  { name: "CHANGE_COMMANDER_ENABLED", kind: "feature" },
  { name: "COLLECTION_EDIT_ENABLED", kind: "feature" },
  { name: "DECK_BENCHMARKS_ENABLED", kind: "feature" },
  { name: "DECK_NOTES_ENABLED", kind: "feature" },
  { name: "DECK_PRINTINGS_ENABLED", kind: "feature" },
  { name: "DECK_STATS_ENABLED", kind: "feature" },
  { name: "DECK_TOKENS_ENABLED", kind: "feature" },
  { name: "FIND_A_DECK_READ_ENABLED", kind: "model" },
  { name: "HELP_ME_CHOOSE_ENABLED", kind: "model" },
  { name: "HOW_IT_WORKS_ENABLED", kind: "feature" },
  { name: "LABEL_ROLE_COUNTS_ENABLED", kind: "feature" },
  { name: "LABEL_SURFACES_ENABLED", kind: "feature" },
  { name: "LINEUP_ENABLED", kind: "feature" },
  { name: "LIST_CACHE_ENABLED", kind: "plumbing" },
  { name: "MANA_BALANCE_ENABLED", kind: "feature" },
  { name: "NEVER_CUT_ENABLED", kind: "feature" },
  { name: "NOTICES_ENABLED", kind: "feature" },
  { name: "OVERVIEW_V2_ENABLED", kind: "model" },
  { name: "PRECONS_ENABLED", kind: "feature" },
  { name: "PROPOSED_CUTS_ENABLED", kind: "model" },
  { name: "SHOPPING_MARK_BOUGHT_ENABLED", kind: "feature" },
  { name: "SOCIAL_FRIENDS_ENABLED", kind: "feature" },
  { name: "SOCIAL_GAMES_ENABLED", kind: "feature" },
  { name: "SOCIAL_WISHLIST_ENABLED", kind: "feature" },
  { name: "STAND_IN_LABELS_ENABLED", kind: "feature" },
  { name: "SWAP_TOOLS_ENABLED", kind: "feature" },
  { name: "TUNING_ENABLED", kind: "model" },
] as const satisfies readonly { name: `${string}_ENABLED`; kind: SwitchKind }[];

export type SwitchName = (typeof SWITCHES)[number]["name"];

export const SWITCH_NAMES: readonly SwitchName[] = SWITCHES.map((s) => s.name);

const KINDS = new Map<string, SwitchKind>(SWITCHES.map((s) => [s.name, s.kind]));

export const switchKind = (name: SwitchName): SwitchKind => KINDS.get(name) as SwitchKind;

export const isSwitchName = (name: string): name is SwitchName => KINDS.has(name);
