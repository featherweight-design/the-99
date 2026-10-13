// The admin's reading of one account's switches: the request path's own decision, then the flag
// function, and the rung that decided it (admin PR 8a). Sentinel envs only.
import { describe, expect, it } from "vitest";
import { explainAccount, explainAccounts } from "./explain";
import type { OverrideRow, SwitchSnapshot } from "./resolve";

const e = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const row = (over: Partial<OverrideRow>): OverrideRow => ({ switchName: "DECK_NOTES_ENABLED", scope: "app", groupId: null, userId: null, value: "on", ...over });
const snap = (overrides: OverrideRow[], groupOf: Record<string, string> = {}): SwitchSnapshot => ({ overrides, groupOf: new Map(Object.entries(groupOf)) });

describe("explainAccount", () => {
  it("names the environment when no override applies", () => {
    expect(explainAccount(e({ DECK_NOTES_ENABLED: "true" }), null, "u1").DECK_NOTES_ENABLED).toEqual({ on: true, source: { kind: "env" } });
    expect(explainAccount(e({}), snap([]), "u1").DECK_NOTES_ENABLED).toEqual({ on: false, source: { kind: "env" } });
  });

  it("names the account, the group and app-wide, in that order", () => {
    const s = snap([
      row({ scope: "app", value: "off" }),
      row({ scope: "group", groupId: "g1", value: "on" }),
      row({ scope: "user", userId: "u1", value: "off" }),
    ], { u1: "g1", u2: "g1" });
    const base = e({ DECK_NOTES_ENABLED: "true" });
    expect(explainAccount(base, s, "u1").DECK_NOTES_ENABLED).toEqual({ on: false, source: { kind: "account" } });
    expect(explainAccount(base, s, "u2").DECK_NOTES_ENABLED).toEqual({ on: true, source: { kind: "group", groupId: "g1" } });
    expect(explainAccount(base, s, "u3").DECK_NOTES_ENABLED).toEqual({ on: false, source: { kind: "app" } });
  });

  it("names the kill switch over an account's on", () => {
    const s = snap([row({ scope: "user", userId: "u1", value: "on" })]);
    expect(explainAccount(e({ DECK_NOTES_ENABLED: "off" }), s, "u1").DECK_NOTES_ENABLED).toEqual({ on: false, source: { kind: "kill" } });
  });

  it("ignores a group or account row on a plumbing switch", () => {
    const s = snap([row({ switchName: "LIST_CACHE_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(explainAccount(e({}), s, "u1").LIST_CACHE_ENABLED).toEqual({ on: false, source: { kind: "env" } });
  });

  it("names the parent when the switch is on and its parent is off", () => {
    const s = snap([row({ switchName: "TUNING_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(explainAccount(e({ ANALYSIS_TAB_ENABLED: "false" }), s, "u1").TUNING_ENABLED).toEqual({
      on: false,
      source: { kind: "parent", parent: "ANALYSIS_TAB_ENABLED" },
    });
    // The parent off by the kill switch is still the parent that decides.
    expect(explainAccount(e({ ANALYSIS_TAB_ENABLED: "off", TUNING_ENABLED: "true" }), null, "u1").TUNING_ENABLED.source).toEqual({
      kind: "parent",
      parent: "ANALYSIS_TAB_ENABLED",
    });
  });

  it("keeps the child's own rung when the child is off itself", () => {
    expect(explainAccount(e({ ANALYSIS_TAB_ENABLED: "false", TUNING_ENABLED: "false" }), null, "u1").TUNING_ENABLED).toEqual({
      on: false,
      source: { kind: "env" },
    });
  });
});

describe("explainAccounts", () => {
  it("reads each account apart", () => {
    const s = snap([row({ scope: "user", userId: "u1", value: "on" })]);
    const out = explainAccounts(e({}), s, ["u1", "u2"]);
    expect(out.get("u1")?.DECK_NOTES_ENABLED.on).toBe(true);
    expect(out.get("u2")?.DECK_NOTES_ENABLED.on).toBe(false);
  });
});
