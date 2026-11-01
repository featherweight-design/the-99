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
 * - `plumbing`: infrastructure, or a surface no friend tries on its own. App-wide only: an account or group
 *   override of one is ignored by the resolver, so no reader runs on different plumbing.
 *
 * `defaultOn`: on while the variable is unset, off for `false` or `off` (`switchDefaultsOn`). As for every
 * switch, only `off` is the hard kill no override raises; `false` is a soft off an app-wide On row overrides. Only the
 * model-call kill switch: a deployment that forgets the variable must keep serving model calls.
 *
 * `needs`: the parent a compound switch's flag function also checks (`tuningEnabled` asks
 * `analysisTabEnabled`). The flag functions decide; this records it for the admin, and
 * `flags.test.ts` fails when the two disagree.
 *
 * Client-safe: no imports.
 */
export type SwitchKind = "feature" | "model" | "plumbing";

export const SWITCHES = [
  { name: "ANALYSIS_TAB_ENABLED", kind: "model" },
  { name: "ANNOUNCEMENTS_ENABLED", kind: "feature" },
  { name: "FEEDBACK_ENABLED", kind: "feature" },
  { name: "HELP_ME_CHOOSE_ENABLED", kind: "model" },
  { name: "FLYER_TRIAL_ENABLED", kind: "feature" },
  { name: "LIST_CACHE_ENABLED", kind: "plumbing" },
  // The model-call kill switch, ON while unset, unlike every other switch (`defaultOn`). A hard stop: the variable set
  // to `off`. Without a deploy: the app-wide Off row. `false` is a soft off an app-wide On row overrides.
  { name: "MODEL_CALLS_ENABLED", kind: "plumbing", defaultOn: true },
  { name: "NAV_STALL_LOG_ENABLED", kind: "plumbing" },
  { name: "OVERVIEW_V2_ENABLED", kind: "model" },
  { name: "PAYMENTS_ENABLED", kind: "feature" },
  { name: "PUSH_ENABLED", kind: "feature" },
  { name: "PROPOSED_CUTS_ENABLED", kind: "model", needs: "ANALYSIS_TAB_ENABLED" },
  { name: "PUBLIC_PAGES_ENABLED", kind: "plumbing" },
  { name: "RATE_LIMIT_ENABLED", kind: "plumbing" },
  { name: "SCAN_LAB_ENABLED", kind: "plumbing" },
  { name: "SUGGESTED_CHANGES_V2_ENABLED", kind: "model", needs: "ANALYSIS_TAB_ENABLED" },
  { name: "SWAP_TOOLS_ENABLED", kind: "model" },
  { name: "TUNING_ENABLED", kind: "model", needs: "ANALYSIS_TAB_ENABLED" },
  { name: "WELCOME_CREDITS_ENABLED", kind: "feature", needs: "PAYMENTS_ENABLED" },
] as const satisfies readonly { name: `${string}_ENABLED`; kind: SwitchKind; needs?: `${string}_ENABLED`; defaultOn?: true }[];

export type SwitchName = (typeof SWITCHES)[number]["name"];

export const SWITCH_NAMES: readonly SwitchName[] = SWITCHES.map((s) => s.name);

const KINDS = new Map<string, SwitchKind>(SWITCHES.map((s) => [s.name, s.kind]));

export const switchKind = (name: SwitchName): SwitchKind => KINDS.get(name) as SwitchKind;

const PARENTS = new Map<string, SwitchName>(
  SWITCHES.flatMap((s) => ("needs" in s ? [[s.name, s.needs as SwitchName] as const] : [])),
);

/** The parent a compound switch needs, or null. */
export const switchParent = (name: SwitchName): SwitchName | null => PARENTS.get(name) ?? null;

const DEFAULT_ON = new Set<string>(SWITCHES.flatMap((s) => ("defaultOn" in s && s.defaultOn ? [s.name] : [])));

/**
 * A switch that is ON while its variable is unset (`MODEL_CALLS_ENABLED`): only `false` or the kill
 * value `off` turns it off. Every other switch is on for the exact string `true` alone. Its flag
 * function decides that way, and `switchBits` reads it the same way, so a page handed the proxy's bits
 * sees the switch on exactly when the flag function would.
 */
export const switchDefaultsOn = (name: SwitchName): boolean => DEFAULT_ON.has(name);

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
 * `SPARE_REQUESTS_ENABLED` from 2026-10-22 until spare requests'
 * close-out (the asks and answers drawn, its About lines shipped; retired since). `NEAR_COMBOS_ENABLED` held it from 2026-10-22 and left it with its
 * About entry (`combos-one-away`) once the deck page and card details drew it.
 * `STRATEGY_FOCUS_ENABLED` left it on 2026-10-22 with Suggested changes aiming at the focus and its About entry (`deck-focus`).
 * `PUSH_ENABLED` held it from 2026-10-22 and left it on 2026-10-23 with its About entry (`push`), once Settings drew the push
 * column and the cron sent. Without the VAPID keys Settings draws no push column and nothing is sent (`pushAvailable`),
 * but the About `push` entry and the `whats-new` key follow the switch alone (`pushEnabled`: `visible.ts` sits on the proxy's
 * path, where the key parsing may not), so they would describe a column that is not there. Both Vercel projects carry the
 * keys (Production scope) and previews are not built, so that only happens on a local server run without them.
 * `SIGNATURE_CARD_ENABLED` held it from 2026-10-27 and left it with the `friends` entry's signature-card caption line (retired since).
 * `FEEDBACK_ENABLED` held it from 2026-10-30 and left it with Report a problem (flyer trial PR 5); the check-in and the
 * Feedback tab follow on the same switch. `FLYER_TRIAL_ENABLED` held it from 2026-10-30 and left it with the `/join`
 * page for a flyer code (PR 3); its admin section follows (PR 4).
 * A switch that joins it carries its reason beside it.
 * The model switches need `ANTHROPIC_API_KEY`, and without it a run ends refused rather than throwing
 * (`src/lib/model/client.ts`, `realMessages`); payment, webhook and cron secrets sit behind no switch;
 * every table a switch reads ships in a migration production applies on deploy.
 */
export const ALL_FEATURES_EXCLUDED: Readonly<Partial<Record<SwitchName, string>>> = {
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
