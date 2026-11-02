import { ALL_FEATURES, ALL_FEATURES_RAISES, FLAGS, switchDefaultsOn, switchFallbackOn, switchReadsEnv, type OverrideName, type SwitchKind, type SwitchName } from "./registry";

/**
 * One reader's switches, resolved from the admin's overrides alone (brief, locked rules 1 to 3; plan
 * `2026-10-31-feature-flags-in-db.md` PR 2). Pure: the snapshot is read by `snapshot.ts` and handed in.
 *
 * Per switch, in order:
 * 1. A kill wins outright: the app-wide row set to `killed`. For the model-call switch alone, its variable at `off` or
 *    `false` too (`envStops`), so a redeploy stops model spend with the database down. Nothing raises a kill.
 * 2. The reader's own override.
 * 2a. The reader's All features row (`ALL_FEATURES`), for a switch in `ALL_FEATURES_RAISES`: On. Below
 *    the account's own overrides, so an explicit Off on one switch still lets the admin test the off state.
 * 3. Their group's override. An account is in at most one group (`flag_group_members.user_id` is
 *    unique), but should two group rows ever apply, OFF wins.
 * 4. The app-wide override: since the seed (`seed.ts`) every switch but `MODEL_CALLS_ENABLED` has one, so this is its default.
 * 5. The registry's compiled fallback (`switchFallbackOn`): with no row, or when the read failed (a null snapshot).
 *    No other variable is read.
 *
 * A `plumbing` switch takes the app-wide override alone, so no reader runs on different plumbing.
 *
 * The result is env-shaped: EVERY switch's variable is replaced, by `"true"`, `"false"` or the kill value `off`, and
 * every other variable is passed through, so a flag function reads it exactly as it reads `process.env` but never sees
 * the deployment's own value. Parents are checked inside the flag functions themselves
 * (`welcomeCreditsEnabled` asks `paymentsEnabled`), so an override of a child never raises its parent.
 */
export type OverrideValue = "on" | "off";
/** A row's value. `killed` is the app-wide row's alone (`flag_overrides_killed_scope_check`). */
export type RowValue = OverrideValue | "killed";
export const KILLED = "killed";
export type OverrideRow = {
  switchName: OverrideName;
  scope: "app" | "group" | "user";
  groupId: string | null;
  userId: string | null;
  value: RowValue;
};
export type SwitchSnapshot = {
  overrides: readonly OverrideRow[];
  /** Account → the group it is in. */
  groupOf: ReadonlyMap<string, string>;
};

export const KILL = "off";

/**
 * Where a switch's value came from, for one reader: the rung of the ladder that decided it.
 * `env` means no override applied and the registry's fallback stands: the admin's Fallback rung (the key kept its name).
 */
export type SwitchSource =
  | { kind: "kill" }
  | { kind: "account" }
  | { kind: "all" }
  | { kind: "group"; groupId: string }
  | { kind: "app" }
  | { kind: "env" };

export type SwitchDecision = { value: OverrideValue | null; source: SwitchSource };

/**
 * One switch for one reader: the override that decides it, or `env` with no value when none does.
 * `resolveEnv` is a map over this, so the admin's ladder, its counts and Check an account decide by
 * the same rule every request does.
 */
export function decide(
  name: SwitchName,
  kind: SwitchKind,
  base: NodeJS.ProcessEnv,
  snapshot: SwitchSnapshot | null,
  userId: string | null,
): SwitchDecision {
  if (isKilled(name, base, snapshot?.overrides)) return { value: null, source: { kind: "kill" } };
  const rows = snapshot ? snapshot.overrides.filter((o) => o.switchName === name) : [];
  const app = rows.find((o) => o.scope === "app")?.value as OverrideValue | undefined;
  if (kind !== "plumbing" && userId) {
    const own = rows.find((o) => o.scope === "user" && o.userId === userId)?.value as OverrideValue | undefined;
    if (own) return { value: own, source: { kind: "account" } };
    if (ALL_FEATURES_RAISES.has(name) && hasAllFeatures(snapshot, userId)) return { value: "on", source: { kind: "all" } };
    const group = snapshot?.groupOf.get(userId) ?? null;
    const groups = group ? rows.filter((o) => o.scope === "group" && o.groupId === group).map((o) => o.value as OverrideValue) : [];
    if (group && groups.length > 0) return { value: groups.includes("off") ? "off" : "on", source: { kind: "group", groupId: group } };
  }
  if (app) return { value: app, source: { kind: "app" } };
  return { value: null, source: { kind: "env" } };
}

/** The one environment read left: the model-call switch's variable at `off` or `false` (registry, `defaultOn`). */
export function envStops(name: SwitchName, base: Readonly<Record<string, string | null | undefined>>): boolean {
  return switchReadsEnv(name) && (base[name] === KILL || base[name] === "false");
}

/** Whether a switch is killed for everyone: its app-wide row is `killed`, or the model-call switch's variable stops it. */
export function isKilled(name: SwitchName, base: NodeJS.ProcessEnv, overrides: readonly OverrideRow[] | undefined): boolean {
  if (envStops(name, base)) return true;
  return overrides?.some((o) => o.switchName === name && o.scope === "app" && o.value === KILLED) ?? false;
}

/** Whether the account holds an All features row. */
export function hasAllFeatures(snapshot: SwitchSnapshot | null, userId: string): boolean {
  return snapshot?.overrides.some((o) => o.switchName === ALL_FEATURES && o.scope === "user" && o.userId === userId && o.value === "on") ?? false;
}

export function resolveEnv(base: NodeJS.ProcessEnv, snapshot: SwitchSnapshot | null, userId: string | null): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { ...base };
  for (const { name, kind } of FLAGS) {
    const { value, source } = decide(name, kind, base, snapshot, userId);
    // A kill is written as the variable's own kill value, so every flag function, `switchBits` and any reader of `off`
    // decides it as the environment's kill.
    if (source.kind === "kill") out[name] = KILL;
    else out[name] = (value ? value === "on" : switchFallbackOn(name)) ? "true" : "false";
  }
  return out;
}

/**
 * The resolved switches as one string of bits in registry order: a cache key's part, and the proxy's
 * header. A bit is on for the string `true`; a `defaultOn` switch's is on unless it reads `false` or `off`,
 * as its flag function decides, so the env `envFromSwitchBits` rebuilds says the same.
 */
export function switchBits(env: NodeJS.ProcessEnv): string {
  return FLAGS.map(({ name }) => (switchBitOn(name, env[name]) ? "1" : "0")).join("");
}

function switchBitOn(name: SwitchName, value: string | undefined): boolean {
  if (switchDefaultsOn(name)) return value !== "false" && value !== KILL;
  return value === "true";
}
