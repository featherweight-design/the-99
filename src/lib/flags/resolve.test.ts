// One reader's switches: the kill switch, then account, group, app-wide and the compiled fallback (flags-in-DB plan PR 2).
import { describe, expect, it } from "vitest";
import { modelCallsEnabled } from "../model/calls-flag";
import { welcomeCreditsEnabled } from "../payments/flag";
import { decide, resolveEnv, switchBits, type OverrideRow, type SwitchSnapshot } from "./resolve";
import { ALL_FEATURES, ALL_FEATURES_EXCLUDED, ALL_FEATURES_RAISES, FLAGS, SWITCH_NAMES, switchFallbackOn } from "./registry";

const e = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const row = (over: Partial<OverrideRow>): OverrideRow => ({ switchName: "FEEDBACK_ENABLED", scope: "app", groupId: null, userId: null, value: "on", ...over });
const snap = (overrides: OverrideRow[], groupOf: Record<string, string> = {}): SwitchSnapshot => ({ overrides, groupOf: new Map(Object.entries(groupOf)) });
const fallback = (name: (typeof FLAGS)[number]["name"]) => (switchFallbackOn(name) ? "true" : "false");
const FALLBACK_ON = new Set(["RATE_LIMIT_ENABLED", "LIST_CACHE_ENABLED", "MODEL_CALLS_ENABLED"]);

describe("resolveEnv", () => {
  it("writes every switch's compiled fallback with no overrides, or none read: on for the rate limit, the list cache and model calls", () => {
    for (const s of [null, snap([])]) {
      const out = resolveEnv(e({}), s, "u1");
      for (const { name } of FLAGS) expect(out[name], name).toBe(FALLBACK_ON.has(name) ? "true" : "false");
    }
  });

  it("passes every variable that is not a switch through unchanged", () => {
    expect(resolveEnv(e({ OTHER: "x" }), null, "u1").OTHER).toBe("x");
    expect(resolveEnv(e({ OTHER: "x" }), snap([row({})]), "u1").OTHER).toBe("x");
  });

  it("ignores a feature switch's variable at true with no row: the fallback stands", () => {
    expect(resolveEnv(e({ FEEDBACK_ENABLED: "true" }), null, "u1").FEEDBACK_ENABLED).toBe("false");
    expect(resolveEnv(e({ PUSH_ENABLED: "true" }), snap([row({})]), "u1").PUSH_ENABLED).toBe("false");
    expect(decide("PUSH_ENABLED", "feature", e({ PUSH_ENABLED: "true" }), snap([row({})]), "u1")).toEqual({ value: null, source: { kind: "env" } });
  });

  it("takes the account, then the group, then app-wide, then the fallback", () => {
    const s = snap([
      row({ scope: "app", value: "off" }),
      row({ scope: "group", groupId: "g1", value: "on" }),
      row({ scope: "user", userId: "u1", value: "off" }),
    ], { u1: "g1", u2: "g1" });
    expect(resolveEnv(e({}), s, "u1").FEEDBACK_ENABLED).toBe("false");
    expect(resolveEnv(e({}), s, "u2").FEEDBACK_ENABLED).toBe("true");
    expect(resolveEnv(e({ FEEDBACK_ENABLED: "true" }), s, "u3").FEEDBACK_ENABLED).toBe("false");
    expect(resolveEnv(e({ FEEDBACK_ENABLED: "true" }), s, null).FEEDBACK_ENABLED).toBe("false");
    expect(resolveEnv(e({ PUSH_ENABLED: "true" }), s, "u3").PUSH_ENABLED).toBe("false");
  });

  it("lets OFF win when two group rows apply", () => {
    const s = snap([row({ scope: "group", groupId: "g1", value: "on" }), row({ scope: "group", groupId: "g1", value: "off" })], { u1: "g1" });
    expect(resolveEnv(e({}), s, "u1").FEEDBACK_ENABLED).toBe("false");
  });

  it("no longer kills a feature switch whose variable says off: its rows decide it", () => {
    const s = snap([row({ scope: "user", userId: "u1", value: "on" }), row({ scope: "app", value: "on" })]);
    expect(resolveEnv(e({ FEEDBACK_ENABLED: "off" }), s, "u1").FEEDBACK_ENABLED).toBe("true");
    expect(decide("FEEDBACK_ENABLED", "feature", e({ FEEDBACK_ENABLED: "off" }), s, "u1").source).toEqual({ kind: "account" });
    expect(resolveEnv(e({ FEEDBACK_ENABLED: "off" }), null, "u1").FEEDBACK_ENABLED).toBe("false");
  });

  it("takes only the app-wide override of a plumbing switch", () => {
    const s = snap([row({ switchName: "LIST_CACHE_ENABLED", scope: "user", userId: "u1", value: "off" })]);
    expect(resolveEnv(e({}), s, "u1").LIST_CACHE_ENABLED).toBe("true");
    const app = snap([row({ switchName: "LIST_CACHE_ENABLED", scope: "app", value: "off" })]);
    expect(resolveEnv(e({}), app, "u1").LIST_CACHE_ENABLED).toBe("false");
  });

  it("ignores an account or group override of a plumbing switch, and takes the app-wide one, its variable unread", () => {
    const user = snap([row({ switchName: "SCAN_LAB_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(resolveEnv(e({ SCAN_LAB_ENABLED: "false" }), user, "u1").SCAN_LAB_ENABLED).toBe("false");
    const group = snap([row({ switchName: "SCAN_LAB_ENABLED", scope: "group", groupId: "g1", value: "on" })], { u1: "g1" });
    expect(resolveEnv(e({}), group, "u1").SCAN_LAB_ENABLED).toBe("false");
    const app = snap([row({ switchName: "SCAN_LAB_ENABLED", scope: "app", value: "on" })]);
    expect(resolveEnv(e({ SCAN_LAB_ENABLED: "false" }), app, "u1").SCAN_LAB_ENABLED).toBe("true");
  });

  it("never raises a parent: a child switched on for an account still needs its parent", () => {
    // Welcome credits, under payments (Suggested changes v2 was the example until the Analysis tab's switch retired).
    const child = row({ switchName: "WELCOME_CREDITS_ENABLED", scope: "user", userId: "u1", value: "on" });
    expect(welcomeCreditsEnabled(resolveEnv(e({}), snap([child]), "u1"))).toBe(false);
    expect(welcomeCreditsEnabled(resolveEnv(e({}), snap([child, row({ switchName: "PAYMENTS_ENABLED", scope: "app", value: "off" })]), "u1"))).toBe(false);
    expect(welcomeCreditsEnabled(resolveEnv(e({}), snap([child, row({ switchName: "PAYMENTS_ENABLED", scope: "app", value: "on" })]), "u1"))).toBe(true);
  });

  it("does not change the environment it was given", () => {
    const env = e({ FEEDBACK_ENABLED: "false" });
    resolveEnv(env, snap([row({})]), "u1");
    expect(env.FEEDBACK_ENABLED).toBe("false");
  });
});

describe("the model-call switch's variable stops it above every row", () => {
  // The one variable still read (`envStops`): `off` and `false` both stop model calls, and no row raises either.
  const appOn = snap([row({ switchName: "MODEL_CALLS_ENABLED", scope: "app", value: "on" })]);
  it("resolves env false under an app-wide On row to off", () => {
    expect(modelCallsEnabled(resolveEnv(e({ MODEL_CALLS_ENABLED: "false" }), appOn, null))).toBe(false);
    expect(decide("MODEL_CALLS_ENABLED", "plumbing", e({ MODEL_CALLS_ENABLED: "false" }), appOn, null).source).toEqual({ kind: "kill" });
  });
  it("resolves env off under an app-wide On row to off", () => {
    expect(modelCallsEnabled(resolveEnv(e({ MODEL_CALLS_ENABLED: "off" }), appOn, null))).toBe(false);
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
// for that account alone. The killed row and the account's own Off still win; plumbing is never raised.
describe("All features", () => {
  const all = (userId = "u1") => row({ switchName: ALL_FEATURES, scope: "user", userId, value: "on" });

  it("raises every feature and model switch for its account, and nobody else's", () => {
    const s = snap([all()]);
    const mine = resolveEnv(e({}), s, "u1");
    const theirs = resolveEnv(e({}), s, "u2");
    for (const { name, kind } of FLAGS) {
      expect(mine[name], name).toBe(kind === "plumbing" || name in ALL_FEATURES_EXCLUDED ? fallback(name) : "true");
      expect(theirs[name], name).toBe(fallback(name));
    }
    // A child's flag function asks its parent, so the parent being raised is what turns it on.
    expect(welcomeCreditsEnabled(mine)).toBe(true);
  });

  it("raises a switch added later: the set is the registry's, not a list kept with the row", () => {
    expect([...ALL_FEATURES_RAISES].sort()).toEqual(
      FLAGS.filter((s) => s.kind !== "plumbing" && !(s.name in ALL_FEATURES_EXCLUDED)).map((s) => s.name).sort(),
    );
  });

  it("loses to the killed row and to the account's own Off, and beats group and app-wide", () => {
    const s = snap([
      all(),
      row({ switchName: "OVERVIEW_V2_ENABLED", scope: "app", value: "killed" }),
      row({ switchName: "PUSH_ENABLED", scope: "user", userId: "u1", value: "off" }),
      row({ switchName: "FLYER_TRIAL_ENABLED", scope: "group", groupId: "g1", value: "off" }),
      row({ switchName: "ANNOUNCEMENTS_ENABLED", scope: "app", value: "off" }),
    ], { u1: "g1" });
    const env = resolveEnv(e({}), s, "u1");
    expect(env.OVERVIEW_V2_ENABLED).toBe("off");
    expect(env.PUSH_ENABLED).toBe("false");
    expect(env.FLYER_TRIAL_ENABLED).toBe("true");
    expect(env.ANNOUNCEMENTS_ENABLED).toBe("true");
    expect(decide("FLYER_TRIAL_ENABLED", "feature", e({}), s, "u1").source).toEqual({ kind: "all" });
  });

  it("leaves plumbing to its app-wide rung", () => {
    const env = resolveEnv(e({ LIST_CACHE_ENABLED: "true" }), snap([all(), row({ switchName: "LIST_CACHE_ENABLED", scope: "app", value: "off" })]), "u1");
    expect(env.LIST_CACHE_ENABLED).toBe("false");
  });

  it("does nothing as an Off row, or at a scope other than an account", () => {
    expect(resolveEnv(e({}), snap([all("u1"), row({ switchName: ALL_FEATURES, scope: "user", userId: "u2", value: "off" })]), "u2").PUSH_ENABLED).toBe("false");
    expect(resolveEnv(e({}), snap([row({ switchName: ALL_FEATURES, scope: "app", value: "on" })]), "u1").PUSH_ENABLED).toBe("false");
  });
});

describe("the app-wide killed row", () => {
  const kill = (switchName: OverrideRow["switchName"]) => row({ switchName, scope: "app", value: "killed" });

  it("beats the account's On, All features and the group's On on a feature switch, and writes the env's kill value", () => {
    const s = snap([
      kill("PUSH_ENABLED"),
      row({ switchName: "PUSH_ENABLED", scope: "user", userId: "u1", value: "on" }),
      row({ switchName: "PUSH_ENABLED", scope: "group", groupId: "g1", value: "on" }),
      row({ switchName: ALL_FEATURES, scope: "user", userId: "u2", value: "on" }),
    ], { u1: "g1", u3: "g1" });
    for (const id of ["u1", "u2", "u3", null]) {
      expect(decide("PUSH_ENABLED", "feature", e({ PUSH_ENABLED: "true" }), s, id).source).toEqual({ kind: "kill" });
      expect(resolveEnv(e({ PUSH_ENABLED: "true" }), s, id).PUSH_ENABLED).toBe("off");
    }
  });

  it("beats a model switch's rows and a plumbing switch's environment", () => {
    const s = snap([kill("OVERVIEW_V2_ENABLED"), row({ switchName: "OVERVIEW_V2_ENABLED", scope: "user", userId: "u1", value: "on" }), kill("RATE_LIMIT_ENABLED")]);
    expect(resolveEnv(e({ OVERVIEW_V2_ENABLED: "true" }), s, "u1").OVERVIEW_V2_ENABLED).toBe("off");
    expect(resolveEnv(e({ RATE_LIMIT_ENABLED: "true" }), s, "u1").RATE_LIMIT_ENABLED).toBe("off");
  });

  it("stops model calls, whose flag function reads the kill value as off", () => {
    expect(modelCallsEnabled(resolveEnv(e({}), snap([kill("MODEL_CALLS_ENABLED")]), "u1"))).toBe(false);
  });

  it("kills only its own switch", () => {
    expect(resolveEnv(e({}), snap([kill("PUSH_ENABLED"), row({ scope: "app", value: "on" })]), "u1").FEEDBACK_ENABLED).toBe("true");
  });
});

describe("the model-call emergency stop needs no database row", () => {
  // Other switches' seeded rows are present; the model-call switch has none (`seed.ts`, SEEDED).
  const seeded = snap([row({ switchName: "PUSH_ENABLED", value: "on" }), row({ switchName: "RATE_LIMIT_ENABLED", value: "on" })]);

  it("is on with its variable unset and no row, read or not", () => {
    expect(modelCallsEnabled(resolveEnv(e({}), seeded, "u1"))).toBe(true);
    expect(modelCallsEnabled(resolveEnv(e({}), null, "u1"))).toBe(true);
  });

  it("is stopped by the variable at off or false, with the overrides unread or read", () => {
    for (const v of ["off", "false"]) {
      expect(modelCallsEnabled(resolveEnv(e({ MODEL_CALLS_ENABLED: v }), null, "u1"))).toBe(false);
      expect(modelCallsEnabled(resolveEnv(e({ MODEL_CALLS_ENABLED: v }), seeded, "u1"))).toBe(false);
    }
  });
});
