// The override write's checks and what a write raises (admin plan 8c), over sentinel envs.
import { describe, expect, it } from "vitest";
import { riseBetween } from "../switches/explain";
import type { OverrideRow, SwitchSnapshot } from "../switches/resolve";
import { SWITCH_NAMES, type SwitchName } from "../switches/registry";
import { applyWrite, isNoop, validate, type Write } from "./switch-writes-rule";

type Env = Partial<Record<SwitchName, string>>;
const envValues = (env: Env) => Object.fromEntries(SWITCH_NAMES.map((n) => [n, env[n] ?? null])) as Record<SwitchName, string | null>;
const UNIVERSE = new Set(["u1", "u2"]);
const G = "0b6f2c1e-3c1a-4d55-9a3e-1f2d3c4b5a69";
const check = (op: "set" | "clear", input: object, env: Env = {}) => validate(op, input, envValues(env), UNIVERSE);
const snap = (overrides: OverrideRow[] = [], groupOf: Record<string, string> = {}): SwitchSnapshot => ({ overrides, groupOf: new Map(Object.entries(groupOf)) });
const write = (w: Partial<Write>): Write => ({ op: "set", name: "SUGGESTED_CHANGES_V2_ENABLED", scope: "app", groupId: null, userId: null, value: "on", note: null, confirmed: null, ...w });

describe("validate", () => {
  it("normalizes a good set and a good clear", () => {
    expect(check("set", { switchName: "FEEDBACK_ENABLED", scope: "user", targetUserId: "u1", value: "off", note: "  why  " })).toEqual({
      ok: true,
      write: { op: "set", name: "FEEDBACK_ENABLED", scope: "user", groupId: null, userId: "u1", value: "off", note: "why", confirmed: null },
    });
    expect(check("clear", { switchName: "FEEDBACK_ENABLED", scope: "group", groupId: G, confirmed: 3, note: "ignored" })).toMatchObject({
      ok: true,
      write: { op: "clear", groupId: G, value: null, note: "ignored", confirmed: 3 },
    });
  });

  it.each([
    ["switch", "set", { switchName: "NOPE_ENABLED", scope: "app", value: "on" }, {}],
    ["scope", "set", { switchName: "FEEDBACK_ENABLED", scope: "team", value: "on" }, {}],
    ["plumbing", "set", { switchName: "LIST_CACHE_ENABLED", scope: "user", targetUserId: "u1", value: "on" }, {}],
    ["plumbing", "clear", { switchName: "LIST_CACHE_ENABLED", scope: "group", groupId: G }, {}],
    ["killed", "set", { switchName: "FEEDBACK_ENABLED", scope: "app", value: "on" }, { FEEDBACK_ENABLED: "off" }],
    ["target", "set", { switchName: "FEEDBACK_ENABLED", scope: "app", targetUserId: "u1", value: "on" }, {}],
    ["target", "set", { switchName: "FEEDBACK_ENABLED", scope: "group", groupId: "not-a-uuid", value: "on" }, {}],
    ["target", "set", { switchName: "FEEDBACK_ENABLED", scope: "user", value: "on" }, {}],
    ["target", "set", { switchName: "FEEDBACK_ENABLED", scope: "user", targetUserId: "u1", groupId: G, value: "on" }, {}],
    ["account", "set", { switchName: "FEEDBACK_ENABLED", scope: "user", targetUserId: "stranger", value: "on" }, {}],
    ["value", "set", { switchName: "FEEDBACK_ENABLED", scope: "app", value: "true" }, {}],
    ["note", "set", { switchName: "FEEDBACK_ENABLED", scope: "app", value: "on", note: "x".repeat(501) }, {}],
  ] as const)("refuses %s", (error, op, input, env) => {
    expect(check(op, input, env)).toEqual({ ok: false, error });
  });

  it("lets a clear through under a kill, since Clear still works (F5)", () => {
    expect(check("clear", { switchName: "FEEDBACK_ENABLED", scope: "user", targetUserId: "u1" }, { FEEDBACK_ENABLED: "off" }).ok).toBe(true);
  });
});

describe("applyWrite and isNoop", () => {
  it("replaces the target's row on a set and removes it on a clear, leaving the rest", () => {
    const other: OverrideRow = { switchName: "SUGGESTED_CHANGES_V2_ENABLED", scope: "user", groupId: null, userId: "u1", value: "on" };
    const app: OverrideRow = { switchName: "SUGGESTED_CHANGES_V2_ENABLED", scope: "app", groupId: null, userId: null, value: "on" };
    expect(applyWrite(snap([app, other]), write({ value: "off" })).overrides).toEqual([other, { ...app, value: "off" }]);
    expect(applyWrite(snap([app, other]), write({ op: "clear", value: null })).overrides).toEqual([other]);
  });

  it("calls a same-value same-note set, or a clear of nothing, a no-op", () => {
    expect(isNoop({ value: "on", note: null }, write({}))).toBe(true);
    expect(isNoop({ value: "on", note: "old" }, write({}))).toBe(false);
    expect(isNoop(null, write({}))).toBe(false);
    expect(isNoop(null, write({ op: "clear", value: null }))).toBe(true);
    expect(isNoop({ value: "on", note: null }, write({ op: "clear", value: null }))).toBe(false);
  });
});

describe("what a write raises", () => {
  const rise = (env: Env, before: SwitchSnapshot, w: Write, ids = ["u1", "u2"]) => riseBetween(env as NodeJS.ProcessEnv, before, applyWrite(before, w), ids);

  it("raises Suggested changes v2 when its switch turns on for a group", () => {
    const r = rise({}, snap([], { u1: G }), write({ name: "SUGGESTED_CHANGES_V2_ENABLED", scope: "group", groupId: G }));
    expect(r.accounts).toEqual(["u1"]);
    // It needs nothing else: the Analysis tab it mounts on is retired (always on).
    expect(r.capabilities).toEqual(["suggested_changes_v2"]);
  });

  it("raises on clearing an app-wide off over an env var that is true", () => {
    const before = snap([{ switchName: "SUGGESTED_CHANGES_V2_ENABLED", scope: "app", groupId: null, userId: null, value: "off" }]);
    const r = rise({ SUGGESTED_CHANGES_V2_ENABLED: "true" }, before, write({ op: "clear", name: "SUGGESTED_CHANGES_V2_ENABLED", value: null }));
    expect(r).toMatchObject({ accounts: ["u1", "u2"], capabilities: ["suggested_changes_v2"] });
  });

  it("raises nothing for an account on under a kill, or for any off", () => {
    expect(rise({ SUGGESTED_CHANGES_V2_ENABLED: "off" }, snap(), write({ scope: "user", userId: "u1" })).accounts).toEqual([]);
    expect(rise({ SUGGESTED_CHANGES_V2_ENABLED: "true" }, snap(), write({ value: "off" })).accounts).toEqual([]);
  });

  // Payments has About entries of its own (the Analysis tab was the example until its switch retired).
  it("counts the accounts whose About page gains an entry", () => {
    expect(rise({}, snap(), write({ name: "PAYMENTS_ENABLED" })).whatsNew).toEqual(["u1", "u2"]);
    expect(rise({ PAYMENTS_ENABLED: "true" }, snap(), write({ name: "PAYMENTS_ENABLED" })).whatsNew).toEqual([]);
  });

  // The Analysis tab is retired (always on): its entries already draw and the Overview's, Suggested changes' and
  // Proposed cuts' paid runs are always offered, so turning its name on raises no account, no capability and no entry.
  it("raises nothing for the retired Analysis tab", () => {
    expect(rise({}, snap(), write({ name: "ANALYSIS_TAB_ENABLED" }))).toMatchObject({ accounts: [], capabilities: [], whatsNew: [] });
  });

  // Swap tools is retired (always on): its entries already draw and Find a deck's paid read is always offered, so
  // turning its name on raises no account, no capability and no About entry.
  it("raises nothing for the retired swap tools", () => {
    expect(rise({}, snap(), write({ name: "SWAP_TOOLS_ENABLED" }))).toMatchObject({ accounts: [], capabilities: [], whatsNew: [] });
  });

  // Help me choose is retired (always on): its entries already draw and its paid read is always offered, so turning its
  // name on raises no account, no capability and no About entry.
  it("raises nothing for the retired Help me choose", () => {
    expect(rise({}, snap(), write({ name: "HELP_ME_CHOOSE_ENABLED" }))).toMatchObject({ accounts: [], capabilities: [], whatsNew: [] });
  });

  // Suggested changes is retired, and so is the Analysis tab its entries and its paid runs followed: turning its own
  // name on raises nothing, whatever the tab's retired name says.
  it("raises nothing for the retired Suggested changes", () => {
    for (const env of [{}, { ANALYSIS_TAB_ENABLED: "true" }]) {
      expect(rise(env, snap(), write({ name: "TUNING_ENABLED" }))).toMatchObject({ accounts: [], capabilities: [], whatsNew: [] });
    }
  });
});

// All features (2026-10-15): the reserved name is written at account scope alone, On only, and its rise
// is what the confirm counts, so turning it on for an account raises the model capabilities a set of
// each model switch would.
describe("All features through the write", () => {
  it("takes On or a clear at account scope, and refuses every other shape", () => {
    expect(check("set", { switchName: "ALL_FEATURES", scope: "user", targetUserId: "u1", value: "on" })).toMatchObject({ ok: true, write: { name: "ALL_FEATURES", userId: "u1", value: "on" } });
    expect(check("clear", { switchName: "ALL_FEATURES", scope: "user", targetUserId: "u1" })).toMatchObject({ ok: true });
    expect(check("set", { switchName: "ALL_FEATURES", scope: "user", targetUserId: "u1", value: "off" })).toEqual({ ok: false, error: "value" });
    expect(check("set", { switchName: "ALL_FEATURES", scope: "app", value: "on" })).toEqual({ ok: false, error: "scope" });
    expect(check("set", { switchName: "ALL_FEATURES", scope: "group", groupId: G, value: "on" })).toEqual({ ok: false, error: "scope" });
    expect(check("set", { switchName: "ALL_FEATURES", scope: "user", targetUserId: "u9", value: "on" })).toEqual({ ok: false, error: "account" });
  });

  it("raises the account's model capabilities, so the confirm fires", () => {
    const after = applyWrite(snap(), write({ name: "ALL_FEATURES", scope: "user", userId: "u1" }));
    const rise = riseBetween({} as NodeJS.ProcessEnv, snap(), after, ["u1", "u2"]);
    expect(rise.accounts).toEqual(["u1"]);
    expect(rise.capabilities.length).toBeGreaterThan(0);
  });
});
