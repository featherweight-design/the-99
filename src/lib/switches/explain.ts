import { visibleEntries } from "../about/visible";
import { MODEL_CAPABILITIES, SWITCH_FLAGS, type ModelCapabilityKey } from "./flags";
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

/**
 * What a write raises (admin plan 8c; READINESS audit finding 2): the accounts that gain a model
 * capability (`MODEL_CAPABILITIES`), the capabilities gained, and the accounts whose About page gains
 * an entry. Each side resolves through the request path's own `resolveEnv`, so a parent's flip, or
 * clearing an app-wide `off` over an env var that is `true`, counts exactly as a reader would meet it.
 * Turning something off never raises. Pure.
 */
export type SwitchRise = { accounts: string[]; capabilities: ModelCapabilityKey[]; whatsNew: string[] };

export function riseBetween(base: NodeJS.ProcessEnv, before: SwitchSnapshot, after: SwitchSnapshot, userIds: readonly string[]): SwitchRise {
  const accounts: string[] = [];
  const capabilities = new Set<ModelCapabilityKey>();
  const whatsNew: string[] = [];
  for (const id of userIds) {
    const was = resolveEnv(base, before, id);
    const now = resolveEnv(base, after, id);
    const gained = MODEL_CAPABILITIES.filter((c) => !c.on(was) && c.on(now));
    if (gained.length) accounts.push(id);
    for (const c of gained) capabilities.add(c.key);
    const seen = new Set(visibleEntries(was).map((e) => e.id));
    if (visibleEntries(now).some((e) => !seen.has(e.id))) whatsNew.push(id);
  }
  return { accounts, capabilities: MODEL_CAPABILITIES.map((c) => c.key).filter((k) => capabilities.has(k)), whatsNew };
}

/** `riseBetween` under this deployment's environment. */
export function riseForAccounts(before: SwitchSnapshot, after: SwitchSnapshot, userIds: readonly string[]): SwitchRise {
  return riseBetween(process.env, before, after, userIds);
}
