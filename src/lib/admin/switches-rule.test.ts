// The Switches list's rows (admin STATES L1 to L6), over sentinel envs and hand-built snapshots.
import { describe, expect, it } from "vitest";
import { explainAccounts } from "../switches/explain";
import type { OverrideRow, SwitchSnapshot } from "../switches/resolve";
import { SWITCH_NAMES, type SwitchName } from "../switches/registry";
import { matchesFilter, matchesSearch, sections, switchRows, type SwitchRow } from "./switches-rule";

type Env = Partial<Record<SwitchName, string>>;
const envValues = (env: Env) => Object.fromEntries(SWITCH_NAMES.map((n) => [n, env[n] ?? null])) as Record<SwitchName, string | null>;
const row = (over: Partial<OverrideRow>): OverrideRow => ({ switchName: "FEEDBACK_ENABLED", scope: "app", groupId: null, userId: null, value: "on", ...over });
const snap = (overrides: OverrideRow[], groupOf: Record<string, string> = {}): SwitchSnapshot => ({ overrides, groupOf: new Map(Object.entries(groupOf)) });

function rows(env: Env, overrides: OverrideRow[] = [], users = ["u1", "u2", "u3"], groupOf: Record<string, string> = {}) {
  const s = snap(overrides, groupOf);
  const verdicts = explainAccounts(env as NodeJS.ProcessEnv, s, users);
  return new Map(switchRows({ env: envValues(env), overrides, verdicts }).map((r) => [r.name, r]));
}

describe("switchRows", () => {
  it("draws one row per registry switch", () => {
    expect([...rows({}).keys()].sort()).toEqual([...SWITCH_NAMES].sort());
  });

  it("counts the accounts a switch is on for, and calls it on, off or mixed", () => {
    const r = rows({ FEEDBACK_ENABLED: "true" }, [row({ scope: "user", userId: "u2", value: "off" })]);
    expect(r.get("FEEDBACK_ENABLED")).toMatchObject({ env: "true", on: 2, total: 3, state: "mixed", accounts: 1, groups: 0, app: null, reason: null });
    expect(r.get("HELP_ME_CHOOSE_ENABLED")).toMatchObject({ env: null, on: 0, state: "off", reason: null });
    expect(rows({ HELP_ME_CHOOSE_ENABLED: "true" }).get("HELP_ME_CHOOSE_ENABLED")).toMatchObject({ on: 3, state: "on" });
  });

  it("shows the app-wide override and counts group and account rows", () => {
    const r = rows({}, [
      row({ scope: "app", value: "off" }),
      row({ scope: "group", groupId: "g1", value: "on" }),
      row({ scope: "user", userId: "u1", value: "on" }),
      row({ scope: "user", userId: "u2", value: "on" }),
    ], ["u1", "u2", "u3"], { u3: "g1" });
    expect(r.get("FEEDBACK_ENABLED")).toMatchObject({ app: "off", groups: 1, accounts: 2, on: 3, state: "on", refused: false });
  });

  it("names the kill switch, and marks the overrides it refuses (L4)", () => {
    const r = rows({ FLYER_TRIAL_ENABLED: "off" }, [row({ switchName: "FLYER_TRIAL_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(r.get("FLYER_TRIAL_ENABLED")).toMatchObject({ env: "off", on: 0, state: "off", refused: true, reason: { kind: "kill" } });
  });

  // Welcome credits under payments: the live compound pair (the Analysis tab's children were the example until it retired).
  it("names the parent when it turns a child off for everyone (L5)", () => {
    const r = rows({ WELCOME_CREDITS_ENABLED: "true", PAYMENTS_ENABLED: "false" });
    expect(r.get("WELCOME_CREDITS_ENABLED")).toMatchObject({ parent: "PAYMENTS_ENABLED", state: "off", reason: { kind: "parent", parent: "PAYMENTS_ENABLED" } });
    // Off by its own env var, not the parent: no reason, the count reads.
    expect(rows({ PAYMENTS_ENABLED: "false" }).get("WELCOME_CREDITS_ENABLED")?.reason).toBeNull();
  });

  it("refuses an app-wide override under the kill switch, with no group or account row", () => {
    const r = rows({ FLYER_TRIAL_ENABLED: "off" }, [row({ switchName: "FLYER_TRIAL_ENABLED", scope: "app", value: "on" })]);
    expect(r.get("FLYER_TRIAL_ENABLED")).toMatchObject({ app: "on", refused: true, appRefused: true, groups: 0, accounts: 0 });
    // Not killed: nothing refused.
    expect(rows({}, [row({ scope: "app", value: "on" })]).get("FEEDBACK_ENABLED")).toMatchObject({ refused: false, appRefused: false });
    // Killed with only an account row: refused, but the app-wide cell has nothing to refuse.
    const k = rows({ FLYER_TRIAL_ENABLED: "off" }, [row({ switchName: "FLYER_TRIAL_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(k.get("FLYER_TRIAL_ENABLED")).toMatchObject({ refused: true, appRefused: false });
  });

  it("counts group and account rows on a plumbing switch as ignored", () => {
    const r = rows({}, [row({ switchName: "LIST_CACHE_ENABLED", scope: "user", userId: "u1", value: "on" })]);
    expect(r.get("LIST_CACHE_ENABLED")).toMatchObject({ ignored: 1, on: 0 });
    expect(r.get("FEEDBACK_ENABLED")?.ignored).toBe(0);
  });

  it("reads off with no accounts at all", () => {
    expect(rows({ HELP_ME_CHOOSE_ENABLED: "true" }, [], []).get("HELP_ME_CHOOSE_ENABLED")).toMatchObject({ on: 0, total: 0, state: "off" });
  });
});

describe("the chips and the search", () => {
  const r = rows({ FEEDBACK_ENABLED: "true", HELP_ME_CHOOSE_ENABLED: "true" }, [row({ switchName: "HELP_ME_CHOOSE_ENABLED", scope: "app", value: "on" })]);
  const get = (n: SwitchName) => r.get(n) as SwitchRow;

  it("filters by chip", () => {
    expect(matchesFilter(get("FEEDBACK_ENABLED"), "all")).toBe(true);
    expect(matchesFilter(get("HELP_ME_CHOOSE_ENABLED"), "overridden")).toBe(true);
    expect(matchesFilter(get("FEEDBACK_ENABLED"), "overridden")).toBe(false);
    expect(matchesFilter(get("FEEDBACK_ENABLED"), "offForAnyone")).toBe(false);
    expect(matchesFilter(get("FLYER_TRIAL_ENABLED"), "offForAnyone")).toBe(true);
    // Mixed is off for someone.
    const mixed = rows({ FEEDBACK_ENABLED: "true" }, [row({ scope: "user", userId: "u2", value: "off" })]).get("FEEDBACK_ENABLED") as SwitchRow;
    expect(matchesFilter(mixed, "offForAnyone")).toBe(true);
    expect(matchesFilter(get("TUNING_ENABLED"), "model")).toBe(true);
    expect(matchesFilter(get("FLYER_TRIAL_ENABLED"), "model")).toBe(false);
  });

  it("matches the name or the variable, case-insensitively", () => {
    expect(matchesSearch(get("TUNING_ENABLED"), "Suggested changes", "SUGGESTED")).toBe(true);
    expect(matchesSearch(get("TUNING_ENABLED"), "Suggested changes", "tuning_en")).toBe(true);
    expect(matchesSearch(get("TUNING_ENABLED"), "Suggested changes", "cuts")).toBe(false);
    expect(matchesSearch(get("TUNING_ENABLED"), "Suggested changes", "  ")).toBe(true);
  });

  it("puts features A to Z by name, then plumbing", () => {
    const { features, plumbing } = sections([...r.values()], (x) => x.name);
    expect(features.every((x) => x.kind !== "plumbing")).toBe(true);
    expect(plumbing.map((x) => x.name)).toEqual(["LIST_CACHE_ENABLED", "MODEL_CALLS_ENABLED", "NAV_STALL_LOG_ENABLED", "PUBLIC_PAGES_ENABLED", "RATE_LIMIT_ENABLED", "SCAN_LAB_ENABLED"]);
    // A to Z as the list sorts, by locale, where a code-point sort would put an underscore after a letter.
    expect(features.map((x) => x.name)).toEqual([...features.map((x) => x.name)].sort((a, b) => a.localeCompare(b, "en-US")));
  });
});
