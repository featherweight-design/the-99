// One reader's switches: the kill switch, then account, group, app-wide and the environment.
import { describe, expect, it } from "vitest";
import { tuningEnabled } from "../tuning/flag";
import { decide, resolveEnv, switchBits, type OverrideRow, type SwitchSnapshot } from "./resolve";
import { ALL_FEATURES, ALL_FEATURES_RAISES, SWITCHES, SWITCH_NAMES } from "./registry";

const e = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const row = (over: Partial<OverrideRow>): OverrideRow => ({ switchName: "DECK_NOTES_ENABLED", scope: "app", groupId: null, userId: null, value: "on", ...over });
const snap = (overrides: OverrideRow[], groupOf: Record<string, string> = {}): SwitchSnapshot => ({ overrides, groupOf: new Map(Object.entries(groupOf)) });

describe("resolveEnv", () => {
  it("passes the environment through untouched with no overrides, or none read", () => {
    const env = e({ DECK_NOTES_ENABLED: "true", OTHER: "x" });
    expect(resolveEnv(env, null, "u1")).toBe(env);
    expect(resolveEnv(env, snap([]), "u1")).toBe(env);
  });

  it("takes the account, then the group, then app-wide, then the environment", () => {
    const s = snap([
      row({ scope: "app", value: "off" }),
      row({ scope: "group", groupId: "g1", value: "on" }),
      row({ scope: "user", userId: "u1", value: "off" }),
    ], { u1: "g1", u2: "g1" });
    expect(resolveEnv(e({}), s, "u1").DECK_NOTES_ENABLED).toBe("false");
    expect(resolveEnv(e({}), s, "u2").DECK_NOTES_ENABLED).toBe("true");
    expect(resolveEnv(e({ DECK_NOTES_ENABLED: "true" }), s, "u3").DECK_NOTES_ENABLED).toBe("false");
    expect(resolveEnv(e({ DECK_NOTES_ENABLED: "true" }), s, null).DECK_NOTES_ENABLED).toBe("false");
    expect(resolveEnv(e({ DECK_STATS_ENABLED: "true" }), s, "u3").DECK_STATS_ENABLED).toBe("true");
  });

  it("lets OFF win when two group rows apply", () => {
    const s = snap([row({ scope: "group", groupId: "g1", value: "on" }), row({ scope: "group", groupId: "g1", value: "off" })], { u1: "g1" });
    expect(resolveEnv(e({}), s, "u1").DECK_NOTES_ENABLED).toBe("false");
  });

  it("refuses every override when the environment says off: the kill switch", () => {
    const s = snap([row({ scope: "user", userId: "u1", value: "on" }), row({ scope: "app", value: "on" })]);
    expect(resolveEnv(e({ DECK_NOTES_ENABLED: "off" }), s, "u1").DECK_NOTES_ENABLED).toBe("off");
  });

  it("takes only the app-wide override of a plumbing switch", () => {
    const s = snap([row({ switchName: "LIST_CACHE_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(resolveEnv(e({}), s, "u1").LIST_CACHE_ENABLED).toBeUndefined();
    const app = snap([row({ switchName: "LIST_CACHE_ENABLED", scope: "app", value: "on" })]);
    expect(resolveEnv(e({}), app, "u1").LIST_CACHE_ENABLED).toBe("true");
  });

  it("takes only the app-wide override of the role-count basis, which is plumbing", () => {
    const user = snap([row({ switchName: "LABEL_ROLE_COUNTS_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(resolveEnv(e({ LABEL_ROLE_COUNTS_ENABLED: "false" }), user, "u1").LABEL_ROLE_COUNTS_ENABLED).toBe("false");
    const group = snap([row({ switchName: "LABEL_ROLE_COUNTS_ENABLED", scope: "group", groupId: "g1", value: "on" })], { u1: "g1" });
    expect(resolveEnv(e({}), group, "u1").LABEL_ROLE_COUNTS_ENABLED).toBeUndefined();
    const app = snap([row({ switchName: "LABEL_ROLE_COUNTS_ENABLED", scope: "app", value: "on" })]);
    expect(resolveEnv(e({ LABEL_ROLE_COUNTS_ENABLED: "false" }), app, "u1").LABEL_ROLE_COUNTS_ENABLED).toBe("true");
  });

  it("never raises a parent: a child switched on for an account still needs its parent", () => {
    const s = snap([row({ switchName: "TUNING_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(tuningEnabled(resolveEnv(e({ ANALYSIS_TAB_ENABLED: "false" }), s, "u1"))).toBe(false);
    expect(tuningEnabled(resolveEnv(e({ ANALYSIS_TAB_ENABLED: "true" }), s, "u1"))).toBe(true);
  });

  it("does not change the environment it was given", () => {
    const env = e({ DECK_NOTES_ENABLED: "false" });
    resolveEnv(env, snap([row({})]), "u1");
    expect(env.DECK_NOTES_ENABLED).toBe("false");
  });
});

describe("switchBits", () => {
  it("is one bit per switch in registry order, on only for the string true", () => {
    const bits = switchBits(e({ [SWITCH_NAMES[0]]: "true", [SWITCH_NAMES[1]]: "off" }));
    expect(bits).toHaveLength(SWITCH_NAMES.length);
    expect(bits.slice(0, 3)).toBe("100");
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
      expect(mine[name], name).toBe(kind === "plumbing" ? undefined : "true");
      expect(theirs[name], name).toBeUndefined();
    }
    // A child's flag function asks its parent, so the parent being raised is what turns it on.
    expect(tuningEnabled(mine)).toBe(true);
  });

  it("raises a switch added later: the set is the registry's, not a list kept with the row", () => {
    expect([...ALL_FEATURES_RAISES].sort()).toEqual(SWITCHES.filter((s) => s.kind !== "plumbing").map((s) => s.name).sort());
  });

  it("loses to the env kill and to the account's own Off, and beats group and app-wide", () => {
    const s = snap([
      all(),
      row({ switchName: "DECK_NOTES_ENABLED", scope: "user", userId: "u1", value: "off" }),
      row({ switchName: "DECK_STATS_ENABLED", scope: "group", groupId: "g1", value: "off" }),
      row({ switchName: "LINEUP_ENABLED", scope: "app", value: "off" }),
    ], { u1: "g1" });
    const env = resolveEnv(e({ NEVER_CUT_ENABLED: "off" }), s, "u1");
    expect(env.NEVER_CUT_ENABLED).toBe("off");
    expect(env.DECK_NOTES_ENABLED).toBe("false");
    expect(env.DECK_STATS_ENABLED).toBe("true");
    expect(env.LINEUP_ENABLED).toBe("true");
    expect(decide("DECK_STATS_ENABLED", "feature", e({}), s, "u1").source).toEqual({ kind: "all" });
  });

  it("leaves plumbing to its app-wide rung", () => {
    const env = resolveEnv(e({ LIST_CACHE_ENABLED: "true" }), snap([all(), row({ switchName: "LIST_CACHE_ENABLED", scope: "app", value: "off" })]), "u1");
    expect(env.LIST_CACHE_ENABLED).toBe("false");
  });

  it("does nothing as an Off row, or at a scope other than an account", () => {
    expect(resolveEnv(e({}), snap([all("u1"), row({ switchName: ALL_FEATURES, scope: "user", userId: "u2", value: "off" })]), "u2").DECK_NOTES_ENABLED).toBeUndefined();
    expect(resolveEnv(e({}), snap([row({ switchName: ALL_FEATURES, scope: "app", value: "on" })]), "u1").DECK_NOTES_ENABLED).toBeUndefined();
  });
});
