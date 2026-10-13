import { SWITCH_FLAGS } from "./flags";
import { SWITCHES, switchParent, type SwitchName } from "./registry";
import { decide, resolveEnv, type SwitchSnapshot, type SwitchSource } from "./resolve";

/**
 * The admin's reading of the switches (admin PR 8): for each account, each switch's effective value
 * and the rung that decided it. It runs the request path's own `decide` and `resolveEnv`, then each
 * switch's own flag function, so the ladder, the counts and Check an account cannot drift from what a
 * reader is served.
 *
 * This file is the one place the admin hands the process environment on: it lives under
 * `src/lib/switches/`, which `check:switch-reads` exempts, and returns plain data.
 */
export type ExplainSource = SwitchSource | { kind: "parent"; parent: SwitchName };
export type SwitchVerdict = { on: boolean; source: ExplainSource };
export type AccountSwitches = Readonly<Record<SwitchName, SwitchVerdict>>;

/** One account's switches, from `base` (the environment) and the snapshot. Pure. */
export function explainAccount(base: NodeJS.ProcessEnv, snapshot: SwitchSnapshot | null, userId: string | null): AccountSwitches {
  const env = resolveEnv(base, snapshot, userId);
  const out = {} as Record<SwitchName, SwitchVerdict>;
  for (const { name, kind } of SWITCHES) {
    const { source } = decide(name, kind, base, snapshot, userId);
    const on = SWITCH_FLAGS[name](env);
    // On by its own rung, off by a parent's: the nearest parent that is itself off decides.
    if (!on && env[name] === "true") {
      let parent = switchParent(name);
      while (parent && SWITCH_FLAGS[parent](env)) parent = switchParent(parent);
      if (parent) {
        out[name] = { on, source: { kind: "parent", parent } };
        continue;
      }
    }
    out[name] = { on, source };
  }
  return out;
}

export function explainAccounts(base: NodeJS.ProcessEnv, snapshot: SwitchSnapshot | null, userIds: readonly string[]): Map<string, AccountSwitches> {
  return new Map(userIds.map((id) => [id, explainAccount(base, snapshot, id)]));
}

/** Every account's switches under this deployment's environment. */
export function explainForAccounts(snapshot: SwitchSnapshot | null, userIds: readonly string[]): Map<string, AccountSwitches> {
  return explainAccounts(process.env, snapshot, userIds);
}

/** Each switch's environment value as set on this deployment (`off` included), by member reads. */
export function switchEnvValues(): Readonly<Record<SwitchName, string | null>> {
  return Object.fromEntries(SWITCHES.map(({ name }) => [name, process.env[name] ?? null])) as Record<SwitchName, string | null>;
}
