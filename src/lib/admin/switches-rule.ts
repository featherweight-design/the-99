import type { AccountSwitches } from "../switches/explain";
import { KILL, type OverrideRow, type OverrideValue } from "../switches/resolve";
import { SWITCHES, switchParent, type SwitchKind, type SwitchName } from "../switches/registry";

/**
 * The Switches list (admin STATES L1 to L6; design table, Switches list), pure. One row per
 * registry switch: its environment value, the app-wide override, how many group and account
 * overrides it carries, and how it resolves across every account, counted through each switch's own
 * flag function (`explain.ts`), so a child whose parent is off counts as off.
 */
export type ResolvedState = "on" | "off" | "mixed";
export type ResolvedReason = { kind: "kill" } | { kind: "parent"; parent: SwitchName } | null;

export type SwitchRow = {
  name: SwitchName;
  kind: SwitchKind;
  parent: SwitchName | null;
  /** The variable as set on this deployment, or null when unset. */
  env: string | null;
  app: OverrideValue | null;
  groups: number;
  accounts: number;
  /** The environment is `off`, so every override this switch carries, app-wide included, is refused (L4). */
  refused: boolean;
  /** The app-wide override in particular is refused: set, under a killed env var. */
  appRefused: boolean;
  /** Group or account rows on a plumbing switch, which the resolver never applies. */
  ignored: number;
  on: number;
  total: number;
  state: ResolvedState;
  /** Why every account is off, when one rule decides it for all (L4, L5). */
  reason: ResolvedReason;
};

export type SwitchesInput = {
  env: Readonly<Record<SwitchName, string | null>>;
  overrides: readonly OverrideRow[];
  /** Every account's switches, from `explainForAccounts`. */
  verdicts: ReadonlyMap<string, AccountSwitches>;
};

export function switchRows({ env, overrides, verdicts }: SwitchesInput): SwitchRow[] {
  const accounts = [...verdicts.values()];
  return SWITCHES.map(({ name, kind }) => {
    const rows = overrides.filter((o) => o.switchName === name);
    const groups = rows.filter((o) => o.scope === "group").length;
    const users = rows.filter((o) => o.scope === "user").length;
    const killed = env[name] === KILL;
    const app = rows.find((o) => o.scope === "app")?.value ?? null;
    const on = accounts.filter((a) => a[name].on).length;
    const total = accounts.length;
    const state: ResolvedState = total > 0 && on === total ? "on" : on === 0 ? "off" : "mixed";
    let reason: ResolvedReason = null;
    if (killed) reason = { kind: "kill" };
    else if (state === "off" && total > 0) {
      const first = accounts[0][name].source;
      if (first.kind === "parent" && accounts.every((a) => a[name].source.kind === "parent")) reason = { kind: "parent", parent: first.parent };
    }
    return {
      name,
      kind,
      parent: switchParent(name),
      env: env[name],
      app,
      groups,
      accounts: users,
      refused: killed && (groups + users > 0 || app !== null),
      appRefused: killed && app !== null,
      ignored: kind === "plumbing" ? groups + users : 0,
      on,
      total,
      state,
      reason,
    };
  });
}

export type SwitchFilter = "all" | "overridden" | "offForAnyone" | "model";
export const SWITCH_FILTERS: readonly SwitchFilter[] = ["all", "overridden", "offForAnyone", "model"];

export function matchesFilter(row: SwitchRow, filter: SwitchFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "overridden":
      return row.app !== null || row.groups + row.accounts > 0;
    case "offForAnyone":
      return row.state !== "on";
    case "model":
      return row.kind === "model";
  }
}

/** The search box: the switch's name or its variable, case-insensitive. */
export function matchesSearch(row: SwitchRow, label: string, query: string): boolean {
  const q = query.trim().toLocaleLowerCase("en-US");
  return q === "" || label.toLocaleLowerCase("en-US").includes(q) || row.name.toLocaleLowerCase("en-US").includes(q);
}

/** Features A to Z by name, then Plumbing (L1). */
export function sections<T extends { kind: SwitchKind }>(rows: readonly T[], labelOf: (row: T) => string): { features: T[]; plumbing: T[] } {
  const byLabel = (a: T, b: T) => labelOf(a).localeCompare(labelOf(b), "en-US");
  return {
    features: rows.filter((r) => r.kind !== "plumbing").sort(byLabel),
    plumbing: rows.filter((r) => r.kind === "plumbing").sort(byLabel),
  };
}
