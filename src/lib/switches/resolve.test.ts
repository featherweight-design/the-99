// One reader's switches: the kill switch, then account, group, app-wide and the environment.
import { describe, expect, it } from "vitest";
import { tuningEnabled } from "../tuning/flag";
import { decide, resolveEnv, switchBits, type OverrideRow, type SwitchSnapshot } from "./resolve";
import { ALL_FEATURES, ALL_FEATURES_EXCLUDED, ALL_FEATURES_RAISES, SWITCHES, SWITCH_NAMES } from "./registry";

const e = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const row = (over: Partial<OverrideRow>): OverrideRow => ({ switchName: "FEEDBACK_ENABLED", scope: "app", groupId: null, userId: null, value: "on", ...over });
const snap = (overrides: OverrideRow[], groupOf: Record<string, string> = {}): SwitchSnapshot => ({ overrides, groupOf: new Map(Object.entries(groupOf)) });

describe("resolveEnv", () => {
  it("passes the environment through untouched with no overrides, or none read", () => {
    const env = e({ FEEDBACK_ENABLED: "true", OTHER: "x" });
    expect(resolveEnv(env, null, "u1")).toBe(env);
    expect(resolveEnv(env, snap([]), "u1")).toBe(env);
  });

  it("takes the account, then the group, then app-wide, then the environment", () => {
    const s = snap([
      row({ scope: "app", value: "off" }),
      row({ scope: "group", groupId: "g1", value: "on" }),
      row({ scope: "user", userId: "u1", value: "off" }),
    ], { u1: "g1", u2: "g1" });
    expect(resolveEnv(e({}), s, "u1").FEEDBACK_ENABLED).toBe("false");
    expect(resolveEnv(e({}), s, "u2").FEEDBACK_ENABLED).toBe("true");
    expect(resolveEnv(e({ FEEDBACK_ENABLED: "true" }), s, "u3").FEEDBACK_ENABLED).toBe("false");
    expect(resolveEnv(e({ FEEDBACK_ENABLED: "true" }), s, null).FEEDBACK_ENABLED).toBe("false");
    expect(resolveEnv(e({ SWAP_TOOLS_ENABLED: "true" }), s, "u3").SWAP_TOOLS_ENABLED).toBe("true");
  });

  it("lets OFF win when two group rows apply", () => {
    const s = snap([row({ scope: "group", groupId: "g1", value: "on" }), row({ scope: "group", groupId: "g1", value: "off" })], { u1: "g1" });
    expect(resolveEnv(e({}), s, "u1").FEEDBACK_ENABLED).toBe("false");
  });

  it("refuses every override when the environment says off: the kill switch", () => {
    const s = snap([row({ scope: "user", userId: "u1", value: "on" }), row({ scope: "app", value: "on" })]);
    expect(resolveEnv(e({ FEEDBACK_ENABLED: "off" }), s, "u1").FEEDBACK_ENABLED).toBe("off");
  });

  it("takes only the app-wide override of a plumbing switch", () => {
    const s = snap([row({ switchName: "LIST_CACHE_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(resolveEnv(e({}), s, "u1").LIST_CACHE_ENABLED).toBeUndefined();
    const app = snap([row({ switchName: "LIST_CACHE_ENABLED", scope: "app", value: "on" })]);
    expect(resolveEnv(e({}), app, "u1").LIST_CACHE_ENABLED).toBe("true");
  });

  it("ignores an account or group override of a plumbing switch, and takes the app-wide one over the environment", () => {
    const user = snap([row({ switchName: "SCAN_LAB_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(resolveEnv(e({ SCAN_LAB_ENABLED: "false" }), user, "u1").SCAN_LAB_ENABLED).toBe("false");
    const group = snap([row({ switchName: "SCAN_LAB_ENABLED", scope: "group", groupId: "g1", value: "on" })], { u1: "g1" });
    expect(resolveEnv(e({}), group, "u1").SCAN_LAB_ENABLED).toBeUndefined();
    const app = snap([row({ switchName: "SCAN_LAB_ENABLED", scope: "app", value: "on" })]);
    expect(resolveEnv(e({ SCAN_LAB_ENABLED: "false" }), app, "u1").SCAN_LAB_ENABLED).toBe("true");
  });

  it("never raises a parent: a child switched on for an account still needs its parent", () => {
    const s = snap([row({ switchName: "TUNING_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(tuningEnabled(resolveEnv(e({ ANALYSIS_TAB_ENABLED: "false" }), s, "u1"))).toBe(false);
    expect(tuningEnabled(resolveEnv(e({ ANALYSIS_TAB_ENABLED: "true" }), s, "u1"))).toBe(true);
  });

  it("does not change the environment it was given", () => {
    const env = e({ FEEDBACK_ENABLED: "false" });
    resolveEnv(env, snap([row({})]), "u1");
    expect(env.FEEDBACK_ENABLED).toBe("false");
  });
});

describe("switchBits", () => {
  it("is one bit per switch in registry order, on only for the string true", () => {
    const bits = switchBits(e({ [SWITCH_NAMES[0]]: "true", [SWITCH_NAMES[1]]: "off" }));
    expect(bits).toHaveLength(SWITCH_NAMES.length);
    expect(bits.slice(0, 3)).toBe("100");
  });

  // The proxy's header rebuilds the env from these bits (`envFromSwitchBits`), so a default-on switch's bit
  // must be on while its variable is unset, or every page would read model calls as stopped.
  it("reads a default-on switch as its flag function does: on unless false or off", () => {
    const at = SWITCH_NAMES.indexOf("MODEL_CALLS_ENABLED");
    expect(switchBits(e({}))[at]).toBe("1");
    expect(switchBits(e({ MODEL_CALLS_ENABLED: "true" }))[at]).toBe("1");
    expect(switchBits(e({ MODEL_CALLS_ENABLED: "false" }))[at]).toBe("0");
    expect(switchBits(e({ MODEL_CALLS_ENABLED: "off" }))[at]).toBe("0");
  });
});

// All features (2026-10-15): one account row raises every feature and model switch, parents included,
// for that account alone. The env kill and the account's own Off still win; plumbing is never raised.
describe("All features", () => {
  const all = (userId = "u1") => row({ switchName: ALL_FEATURES, scope: "user", userId, value: "on" });

  it("raises every feature and model switch for its account, and nobody else's", () => {
    const s = snap([all()]);
    const mine = resolveEnv(e({}), s, "u1");
    const theirs = resolveEnv(e({}), s, "u2");
    for (const { name, kind } of SWITCHES) {
      expect(mine[name], name).toBe(kind === "plumbing" || name in ALL_FEATURES_EXCLUDED ? undefined : "true");
      expect(theirs[name], name).toBeUndefined();
    }
    // A child's flag function asks its parent, so the parent being raised is what turns it on.
    expect(tuningEnabled(mine)).toBe(true);
  });

  it("raises a switch added later: the set is the registry's, not a list kept with the row", () => {
    expect([...ALL_FEATURES_RAISES].sort()).toEqual(
      SWITCHES.filter((s) => s.kind !== "plumbing" && !(s.name in ALL_FEATURES_EXCLUDED)).map((s) => s.name).sort(),
    );
  });

  it("loses to the env kill and to the account's own Off, and beats group and app-wide", () => {
    const s = snap([
      all(),
      row({ switchName: "HELP_ME_CHOOSE_ENABLED", scope: "user", userId: "u1", value: "off" }),
      row({ switchName: "FLYER_TRIAL_ENABLED", scope: "group", groupId: "g1", value: "off" }),
      row({ switchName: "ANNOUNCEMENTS_ENABLED", scope: "app", value: "off" }),
    ], { u1: "g1" });
    const env = resolveEnv(e({ SWAP_TOOLS_ENABLED: "off" }), s, "u1");
    expect(env.SWAP_TOOLS_ENABLED).toBe("off");
    expect(env.HELP_ME_CHOOSE_ENABLED).toBe("false");
    expect(env.FLYER_TRIAL_ENABLED).toBe("true");
    expect(env.ANNOUNCEMENTS_ENABLED).toBe("true");
    expect(decide("FLYER_TRIAL_ENABLED", "feature", e({}), s, "u1").source).toEqual({ kind: "all" });
  });

  it("leaves plumbing to its app-wide rung", () => {
    const env = resolveEnv(e({ LIST_CACHE_ENABLED: "true" }), snap([all(), row({ switchName: "LIST_CACHE_ENABLED", scope: "app", value: "off" })]), "u1");
    expect(env.LIST_CACHE_ENABLED).toBe("false");
  });

  it("does nothing as an Off row, or at a scope other than an account", () => {
    expect(resolveEnv(e({}), snap([all("u1"), row({ switchName: ALL_FEATURES, scope: "user", userId: "u2", value: "off" })]), "u2").HELP_ME_CHOOSE_ENABLED).toBeUndefined();
    expect(resolveEnv(e({}), snap([row({ switchName: ALL_FEATURES, scope: "app", value: "on" })]), "u1").HELP_ME_CHOOSE_ENABLED).toBeUndefined();
  });
});
