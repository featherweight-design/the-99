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
const write = (w: Partial<Write>): Write => ({ op: "set", name: "TUNING_ENABLED", scope: "app", groupId: null, userId: null, value: "on", note: null, confirmed: null, ...w });

describe("validate", () => {
  it("normalizes a good set and a good clear", () => {
    expect(check("set", { switchName: "DECK_NOTES_ENABLED", scope: "user", targetUserId: "u1", value: "off", note: "  why  " })).toEqual({
      ok: true,
      write: { op: "set", name: "DECK_NOTES_ENABLED", scope: "user", groupId: null, userId: "u1", value: "off", note: "why", confirmed: null },
    });
    expect(check("clear", { switchName: "DECK_NOTES_ENABLED", scope: "group", groupId: G, confirmed: 3, note: "ignored" })).toMatchObject({
      ok: true,
      write: { op: "clear", groupId: G, value: null, note: "ignored", confirmed: 3 },
    });
  });

  it.each([
    ["switch", "set", { switchName: "NOPE_ENABLED", scope: "app", value: "on" }, {}],
    ["scope", "set", { switchName: "DECK_NOTES_ENABLED", scope: "team", value: "on" }, {}],
    ["plumbing", "set", { switchName: "LIST_CACHE_ENABLED", scope: "user", targetUserId: "u1", value: "on" }, {}],
    ["plumbing", "clear", { switchName: "LIST_CACHE_ENABLED", scope: "group", groupId: G }, {}],
    ["killed", "set", { switchName: "DECK_NOTES_ENABLED", scope: "app", value: "on" }, { DECK_NOTES_ENABLED: "off" }],
    ["target", "set", { switchName: "DECK_NOTES_ENABLED", scope: "app", targetUserId: "u1", value: "on" }, {}],
    ["target", "set", { switchName: "DECK_NOTES_ENABLED", scope: "group", groupId: "not-a-uuid", value: "on" }, {}],
    ["target", "set", { switchName: "DECK_NOTES_ENABLED", scope: "user", value: "on" }, {}],
    ["target", "set", { switchName: "DECK_NOTES_ENABLED", scope: "user", targetUserId: "u1", groupId: G, value: "on" }, {}],
    ["account", "set", { switchName: "DECK_NOTES_ENABLED", scope: "user", targetUserId: "stranger", value: "on" }, {}],
    ["value", "set", { switchName: "DECK_NOTES_ENABLED", scope: "app", value: "true" }, {}],
    ["note", "set", { switchName: "DECK_NOTES_ENABLED", scope: "app", value: "on", note: "x".repeat(501) }, {}],
  ] as const)("refuses %s", (error, op, input, env) => {
    expect(check(op, input, env)).toEqual({ ok: false, error });
  });

  it("lets a clear through under a kill, since Clear still works (F5)", () => {
    expect(check("clear", { switchName: "DECK_NOTES_ENABLED", scope: "user", targetUserId: "u1" }, { DECK_NOTES_ENABLED: "off" }).ok).toBe(true);
  });
});

describe("applyWrite and isNoop", () => {
  it("replaces the target's row on a set and removes it on a clear, leaving the rest", () => {
    const other: OverrideRow = { switchName: "TUNING_ENABLED", scope: "user", groupId: null, userId: "u1", value: "on" };
    const app: OverrideRow = { switchName: "TUNING_ENABLED", scope: "app", groupId: null, userId: null, value: "on" };
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

  it("raises the synopsis, and Suggested changes where it is on, when the Analysis tab turns on for a group", () => {
    const r = rise({ TUNING_ENABLED: "true" }, snap([], { u1: G }), write({ name: "ANALYSIS_TAB_ENABLED", scope: "group", groupId: G }));
    expect(r.accounts).toEqual(["u1"]);
    expect(r.capabilities).toEqual(["synopsis", "tuning"]);
  });

  it("raises on clearing an app-wide off over an env var that is true", () => {
    const before = snap([{ switchName: "HELP_ME_CHOOSE_ENABLED", scope: "app", groupId: null, userId: null, value: "off" }]);
    const r = rise({ HELP_ME_CHOOSE_ENABLED: "true" }, before, write({ op: "clear", name: "HELP_ME_CHOOSE_ENABLED", value: null }));
    expect(r).toMatchObject({ accounts: ["u1", "u2"], capabilities: ["intake"] });
  });

  it("raises nothing for an account on under a kill, or for any off", () => {
    expect(rise({ TUNING_ENABLED: "off", ANALYSIS_TAB_ENABLED: "true" }, snap(), write({ scope: "user", userId: "u1" })).accounts).toEqual([]);
    expect(rise({ TUNING_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true" }, snap(), write({ value: "off" })).accounts).toEqual([]);
  });

  it("counts the accounts whose About page gains an entry", () => {
    expect(rise({}, snap(), write({ name: "DECK_TOKENS_ENABLED" })).whatsNew).toEqual(["u1", "u2"]);
    expect(rise({ DECK_TOKENS_ENABLED: "true" }, snap(), write({ name: "DECK_TOKENS_ENABLED" })).whatsNew).toEqual([]);
  });
});
