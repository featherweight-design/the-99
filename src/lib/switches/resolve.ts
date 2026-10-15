import { ALL_FEATURES, ALL_FEATURES_RAISES, SWITCHES, type OverrideName, type SwitchKind, type SwitchName } from "./registry";

/**
 * One reader's switches, resolved from the environment and the admin's overrides (brief, locked
 * rules 1 to 3). Pure: the snapshot is read by `snapshot.ts` and handed in.
 *
 * Per switch, in order:
 * 1. The environment set to the literal `off` wins outright. It is the kill switch: a bad override
 *    is always beaten by a redeploy.
 * 2. The reader's own override.
 * 2a. The reader's All features row (`ALL_FEATURES`), for a switch in `ALL_FEATURES_RAISES`: On. Below
 *    the account's own overrides, so an explicit Off on one switch still lets the admin test the off state.
 * 3. Their group's override. An account is in at most one group (`flag_group_members.user_id` is
 *    unique), but should two group rows ever apply, OFF wins.
 * 4. The app-wide override.
 * 5. The environment as it stands.
 *
 * A `plumbing` switch takes the app-wide override alone, so no reader runs on different plumbing.
 *
 * The result is env-shaped: each switch's variable is replaced by `"true"` or `"false"` where an
 * override decides it, and every other variable is passed through, so a flag function reads it
 * exactly as it reads `process.env`. Parents are checked inside the flag functions themselves
 * (`tuningEnabled` asks `analysisTabEnabled`), so an override of a child never raises its parent.
 */
export type OverrideValue = "on" | "off";
export type OverrideRow = {
  switchName: OverrideName;
  scope: "app" | "group" | "user";
  groupId: string | null;
  userId: string | null;
  value: OverrideValue;
};
export type SwitchSnapshot = {
  overrides: readonly OverrideRow[];
  /** Account → the group it is in. */
  groupOf: ReadonlyMap<string, string>;
};

export const KILL = "off";

/**
 * Where a switch's value came from, for one reader: the rung of the ladder that decided it.
 * `env` means no override applied and the environment's own value stands.
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
  if (base[name] === KILL) return { value: null, source: { kind: "kill" } };
  const rows = snapshot ? snapshot.overrides.filter((o) => o.switchName === name) : [];
  const app = rows.find((o) => o.scope === "app")?.value;
  if (kind !== "plumbing" && userId) {
    const own = rows.find((o) => o.scope === "user" && o.userId === userId)?.value;
    if (own) return { value: own, source: { kind: "account" } };
    if (ALL_FEATURES_RAISES.has(name) && hasAllFeatures(snapshot, userId)) return { value: "on", source: { kind: "all" } };
    const group = snapshot?.groupOf.get(userId) ?? null;
    const groups = group ? rows.filter((o) => o.scope === "group" && o.groupId === group).map((o) => o.value) : [];
    if (group && groups.length > 0) return { value: groups.includes("off") ? "off" : "on", source: { kind: "group", groupId: group } };
  }
  if (app) return { value: app, source: { kind: "app" } };
  return { value: null, source: { kind: "env" } };
}

/** Whether the account holds an All features row. */
export function hasAllFeatures(snapshot: SwitchSnapshot | null, userId: string): boolean {
  return snapshot?.overrides.some((o) => o.switchName === ALL_FEATURES && o.scope === "user" && o.userId === userId && o.value === "on") ?? false;
}

export function resolveEnv(base: NodeJS.ProcessEnv, snapshot: SwitchSnapshot | null, userId: string | null): NodeJS.ProcessEnv {
  if (!snapshot || snapshot.overrides.length === 0) return base;
  const out: NodeJS.ProcessEnv = { ...base };
  for (const { name, kind } of SWITCHES) {
    const { value } = decide(name, kind, base, snapshot, userId);
    if (value) out[name] = value === "on" ? "true" : "false";
  }
  return out;
}

/** The resolved switches as one string of bits in registry order: a cache key's part. */
export function switchBits(env: NodeJS.ProcessEnv): string {
  return SWITCHES.map(({ name }) => (env[name] === "true" ? "1" : "0")).join("");
}
