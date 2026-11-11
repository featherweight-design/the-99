// One switch's page (admin STATES F1 to F13), over sentinel envs and hand-built snapshots. Since the env layer went
// (flags-in-DB plan PR 2) only the model-call switch's variable is read, so the env values are that variable alone, as
// `switchEnvValues` hands them, and a row is what turns any other switch on.
import { describe, expect, it } from "vitest";
import { explainAccounts } from "../flags/explain";
import type { SwitchSnapshot } from "../flags/resolve";
import { SWITCH_NAMES, switchDefaultsOn, type SwitchName } from "../flags/registry";
import type { Account } from "./accounts";
import { fmtWhen, switchPage, type OverrideDetail, type SwitchEvent } from "./flag-page-rule";

type Env = Partial<Record<SwitchName, string>>;
const envValues = (env: Env) => Object.fromEntries(SWITCH_NAMES.map((n) => [n, switchDefaultsOn(n) ? (env[n] ?? null) : null])) as Record<SwitchName, string | null>;
const AT = new Date("2026-10-11T14:02:00Z");
const ACCOUNTS: Account[] = [
  { id: "u1", name: "Hugh", email: "h•••@x•••.dev", named: true },
  { id: "u2", name: "Mara", email: "m•••@x•••.dev", named: true },
  { id: "u3", name: "Account ·u3", email: null, named: false },
];
const GROUPS = [{ id: "g1", name: "friends", members: 2 }];
const ov = (o: Partial<OverrideDetail> & { name?: SwitchName }): OverrideDetail & { name: SwitchName } => ({
  name: "SUGGESTED_CHANGES_V2_ENABLED",
  scope: "app",
  groupId: null,
  userId: null,
  value: "on",
  note: null,
  updatedBy: "u1",
  updatedAt: AT,
  ...o,
});

function page(name: SwitchName, env: Env, rows: (OverrideDetail & { name: SwitchName })[] = [], events: SwitchEvent[] = [], groupOf: Record<string, string> = {}) {
  const snapshot: SwitchSnapshot = {
    overrides: rows.map((r) => ({ switchName: r.name, scope: r.scope, groupId: r.groupId, userId: r.userId, value: r.value })),
    groupOf: new Map(Object.entries(groupOf)),
  };
  return switchPage({
    name,
    env: envValues(env),
    overrides: rows.filter((r) => r.name === name),
    verdicts: explainAccounts(env as NodeJS.ProcessEnv, snapshot, ACCOUNTS.map((a) => a.id)),
    allFeatures: [],
    accounts: ACCOUNTS,
    groups: GROUPS,
    events,
    historyLimit: 100,
    viewerId: "u1",
  });
}

const rung = (p: ReturnType<typeof page>, key: string) => p.rungs.find((r) => r.key === key);

describe("switchPage", () => {
  // `Flags-Kill` K3 to K7: All features has its own rung, between Account and Group, counting the accounts it decides.
  function allFeaturesPage(name: SwitchName, holders: string[], rows: (OverrideDetail & { name: SwitchName })[] = []) {
    const snapshot: SwitchSnapshot = {
      overrides: [
        ...rows.map((r) => ({ switchName: r.name, scope: r.scope, groupId: r.groupId, userId: r.userId, value: r.value })),
        ...holders.map((id) => ({ switchName: "ALL_FEATURES" as const, scope: "user" as const, groupId: null, userId: id, value: "on" as const })),
      ],
      groupOf: new Map(),
    };
    return switchPage({
      name,
      env: envValues({}),
      overrides: rows.filter((r) => r.name === name),
      verdicts: explainAccounts({} as NodeJS.ProcessEnv, snapshot, ACCOUNTS.map((a) => a.id)),
      allFeatures: holders,
      accounts: ACCOUNTS,
      groups: GROUPS,
      events: [],
      historyLimit: 100,
      viewerId: "u1",
    });
  }

  it("draws All features on its own rung between Account and Group, counting the accounts it decides", () => {
    // Hugh's own Off beats his All features row, so the rung decides for Mara alone.
    const p = allFeaturesPage("FLYER_TRIAL_ENABLED", ["u1", "u2"], [ov({ name: "FLYER_TRIAL_ENABLED", scope: "user", userId: "u1", value: "off" })]);
    expect(p.rungs.map((r) => r.key)).toEqual(["account", "all", "group", "app", "fallback"]);
    expect(rung(p, "account")).toMatchObject({ value: "1 account: Off", decides: "decides for 1", deciding: true });
    expect(rung(p, "all")).toEqual({ key: "all", value: "1 account", tone: "plain", decides: "decides for 1", deciding: true });
    const none = allFeaturesPage("FLYER_TRIAL_ENABLED", []);
    expect(rung(none, "all")).toEqual({ key: "all", value: "None", tone: "none", decides: "decides for none", deciding: false });
  });

  it("keeps the All features rung's count under a kill, refused", () => {
    const p = allFeaturesPage("PUSH_ENABLED", ["u2", "u3"], [ov({ name: "PUSH_ENABLED", scope: "app", value: "killed" })]);
    expect(p.rungs.map((r) => r.key)).toEqual(["killed", "account", "all", "group", "fallback"]);
    expect(rung(p, "all")).toEqual({ key: "all", value: "2 accounts", tone: "plain", decides: "refused", deciding: false });
  });

  it("raises the rungs that decide, and says for how many (F1)", () => {
    // Welcome credits under payments: the one compound switch left once the Analysis tab's switch retired.
    const p = page("WELCOME_CREDITS_ENABLED", {}, [
      ov({ name: "PAYMENTS_ENABLED", scope: "app", value: "on" }),
      ov({ name: "WELCOME_CREDITS_ENABLED", scope: "app", value: "off" }),
      ov({ name: "WELCOME_CREDITS_ENABLED", scope: "user", userId: "u1", value: "on" }),
    ]);
    expect(p.rungs.map((r) => r.key)).toEqual(["account", "all", "group", "app", "fallback", "needs"]);
    expect(rung(p, "account")).toMatchObject({ value: "1 account: On", decides: "decides for 1", deciding: true });
    expect(rung(p, "group")).toMatchObject({ value: "None", tone: "none", decides: "decides for none", deciding: false });
    expect(rung(p, "app")).toMatchObject({ value: "Off", decides: "decides for 2", deciding: true });
    expect(rung(p, "fallback")).toMatchObject({ value: "off", tone: "plain", decides: "only with no row", deciding: false });
    expect(rung(p, "needs")).toMatchObject({ value: "Buying credits: on for all 3 accounts", decides: "allows all 3" });
    expect(p.result).toEqual({ state: "mixed", text: "On for 1 of 3: Hugh" });
    expect(p.banner).toBeNull();
  });

  it("names the account and its source for Check an account, an account with no name as Account ·<tail>", () => {
    // Hugh has no row: the fallback decides him, off, whatever the variable says.
    const p = page("FEEDBACK_ENABLED", { FEEDBACK_ENABLED: "true" }, [
      ov({ name: "FEEDBACK_ENABLED", scope: "group", groupId: "g1", value: "off" }),
      ov({ name: "FEEDBACK_ENABLED", scope: "user", userId: "u3", value: "off" }),
    ], [], { u2: "g1" });
    expect(p.explanations).toEqual([
      { id: "u1", label: "Hugh", on: false, source: "fallback", kill: false },
      { id: "u2", label: "Mara", on: false, source: "group friends", kill: false },
      { id: "u3", label: "Account ·u3", on: false, source: "account override", kill: false },
    ]);
    expect(p.groups).toEqual([expect.objectContaining({ key: "g1", title: "friends", sub: "2 members", value: "off" })]);
    expect(p.accounts).toEqual([expect.objectContaining({ key: "u3", title: "Account ·u3", sub: "" })]);
  });

  // Small items 9, item 4 (`Flags-Kill` K3, K7): the app-wide row at killed.
  it("draws a killed app row: the banner, a first Killed rung deciding for all, every override refused, killed", () => {
    const p = page("PUSH_ENABLED", {}, [
      ov({ name: "PUSH_ENABLED", scope: "app", value: "killed" }),
      ov({ name: "PUSH_ENABLED", scope: "group", groupId: "g1", value: "on", note: "early access" }),
      ov({ name: "PUSH_ENABLED", scope: "user", userId: "u3", value: "on" }),
    ], [], { u2: "g1" });
    expect(p.killed).toBe(true);
    expect(p.banner).toEqual({
      kind: "kill",
      title: "Killed: off for everyone.",
      body: "Killed beats every account and group override and All features. Pick On, Off or Not set to lift it; the overrides below come back as they were.",
    });
    // The Killed rung is the app-wide row, so no App-wide rung follows it.
    expect(p.rungs.map((r) => r.key)).toEqual(["killed", "account", "all", "group", "fallback"]);
    expect(rung(p, "killed")).toMatchObject({ value: "the app-wide row", tone: "danger", decides: "decides for all 3", deciding: true });
    expect(rung(p, "account")).toMatchObject({ value: "1 account: On", decides: "refused", deciding: false });
    expect(rung(p, "group")).toMatchObject({ value: "friends: On", decides: "refused", deciding: false });
    expect(rung(p, "fallback")).toMatchObject({ value: "off", decides: "only with no row", deciding: false });
    expect(p.groups[0]).toMatchObject({ refused: true, note: "early access", meta: "refused, killed" });
    expect(p.accounts[0]).toMatchObject({ refused: true, meta: "refused, killed" });
    expect(p.app).toMatchObject({ value: "Killed", current: "killed", set: true, refused: false, stopped: false, note: "Killed is the kill switch: off for everyone, overrides refused." });
    expect(p.explanations.every((e) => e.kill && e.source === "killed")).toBe(true);
    expect(p.result.text).toBe("Off for all 3 accounts");
  });

  it("names who the kill confirm reaches: everyone, then who is held on now", () => {
    const p = page("PUSH_ENABLED", {}, [
      ov({ name: "PUSH_ENABLED", scope: "app", value: "off" }),
      ov({ name: "PUSH_ENABLED", scope: "group", groupId: "g1", value: "on" }),
      ov({ name: "PUSH_ENABLED", scope: "user", userId: "u3", value: "on" }),
    ], [], { u1: "g1", u2: "g1" });
    expect(p.killed).toBe(false);
    expect(p.app.who).toBe("All 3 accounts, the 2 held on by friends and one account override.");
    expect(page("PUSH_ENABLED", {}, [ov({ name: "PUSH_ENABLED", scope: "app", value: "on" })]).app.who).toBe("All 3 accounts.");
  });

  it("counts the Account rung's rows by value, On first, as the board draws it (`Flags-Kill`: `2 accounts: On`)", () => {
    const p = page("FLYER_TRIAL_ENABLED", {}, [
      ov({ name: "FLYER_TRIAL_ENABLED", scope: "user", userId: "u1", value: "off" }),
      ov({ name: "FLYER_TRIAL_ENABLED", scope: "user", userId: "u2", value: "on" }),
      ov({ name: "FLYER_TRIAL_ENABLED", scope: "user", userId: "u3", value: "on" }),
    ]);
    expect(rung(p, "account")).toMatchObject({ value: "2 accounts: On · 1 account: Off", decides: "decides for 3" });
  });

  // The env kill is the model-call switch's alone (`envStops`), a plumbing switch: no Account or Group rung.
  it("refuses every override under the env stop, and says so on the rungs, the rows and its own banner (F5)", () => {
    const p = page("MODEL_CALLS_ENABLED", { MODEL_CALLS_ENABLED: "off" }, [
      ov({ name: "MODEL_CALLS_ENABLED", scope: "user", userId: "u2", value: "on", note: "Early look" }),
      ov({ name: "MODEL_CALLS_ENABLED", scope: "app", value: "on" }),
    ]);
    expect(p.banner).toMatchObject({ kind: "kill", title: "Off: the env var is off." });
    expect(p.banner?.body).toContain("MODEL_CALLS_ENABLED=off refuses every override.");
    expect(p.rungs.map((r) => r.key)).toEqual(["killed", "app", "fallback"]);
    expect(rung(p, "killed")).toMatchObject({ value: "MODEL_CALLS_ENABLED=off", tone: "danger", decides: "decides for all 3", deciding: true });
    expect(rung(p, "app")).toMatchObject({ decides: "refused", deciding: false });
    expect(rung(p, "fallback")).toMatchObject({ value: "on", decides: "only with no row" });
    expect(p.accounts[0]).toMatchObject({ refused: true, note: "Early look", meta: "refused, killed" });
    expect(p.app).toMatchObject({ refused: true, stopped: true, note: "Refused while the env var is off." });
    expect(p.explanations.every((e) => e.kill && e.source === "killed")).toBe(true);
    expect(p.result.text).toBe("Off for all 3 accounts");
  });

  // The list draws a killed app row under the env stop as not refused (`appRefused`); the page agrees, and keeps its
  // App-wide rung, drawn Killed, since the Killed rung there is the env's.
  it("keeps a killed app row's App-wide rung under the env stop, Killed and not refused", () => {
    const p = page("MODEL_CALLS_ENABLED", { MODEL_CALLS_ENABLED: "off" }, [ov({ name: "MODEL_CALLS_ENABLED", scope: "app", value: "killed" })]);
    expect(p.rungs.map((r) => r.key)).toEqual(["killed", "app", "fallback"]);
    expect(rung(p, "killed")).toMatchObject({ value: "MODEL_CALLS_ENABLED=off", deciding: true });
    expect(rung(p, "app")).toMatchObject({ value: "Killed", decides: "decides for none", deciding: false });
    expect(p.app).toMatchObject({ value: "Killed", current: "killed", refused: false, stopped: true, note: "Killed is the kill switch: off for everyone, overrides refused." });
  });

  it("prints the env stop's own value: false stops it as off does", () => {
    const p = page("MODEL_CALLS_ENABLED", { MODEL_CALLS_ENABLED: "false" });
    expect(p.banner).toMatchObject({ kind: "kill", title: "Off: the env var is false." });
    expect(p.banner?.body).toBe("MODEL_CALLS_ENABLED=false refuses every override. Redeploy to change it. Clear still works.");
    expect(p.app.note).toBe("Refused while the env var is false.");
    expect(rung(p, "killed")).toMatchObject({ value: "MODEL_CALLS_ENABLED=false", tone: "danger", decides: "decides for all 3" });
  });

  it("draws no kill for a feature switch whose variable is off: its rows decide", () => {
    const p = page("FLYER_TRIAL_ENABLED", { FLYER_TRIAL_ENABLED: "off" }, [ov({ name: "FLYER_TRIAL_ENABLED", scope: "user", userId: "u2", value: "on" })]);
    expect(p.banner).toBeNull();
    expect(rung(p, "account")).toMatchObject({ decides: "decides for 1", deciding: true });
    expect(p.accounts[0].refused).toBe(false);
    expect(p.result).toEqual({ state: "mixed", text: "On for 1 of 3: Mara" });
  });

  it("draws the compound banner when the parent is off for everyone (F4)", () => {
    // Welcome credits under payments: the live compound pair (the Analysis tab's children were the example until it retired).
    const p = page("WELCOME_CREDITS_ENABLED", {}, [ov({ name: "WELCOME_CREDITS_ENABLED", scope: "app", value: "on" })]);
    expect(p.banner).toMatchObject({ kind: "compound", title: "Off: needs Buying credits, which is off.", body: "Overrides here can’t turn the parent on.", link: "Open Buying credits ›", parent: "PAYMENTS_ENABLED" });
    expect(rung(p, "needs")).toMatchObject({ value: "Buying credits: off for all 3 accounts", decides: "decides for 3", deciding: true });
    expect(p.explanations[0].source).toBe("Buying credits is off");
  });

  it("gives a plumbing switch no Account or Group rung, and marks a row it ignores (F6)", () => {
    // The list cache is on by its fallback with no app-wide row.
    const p = page("LIST_CACHE_ENABLED", {}, [ov({ name: "LIST_CACHE_ENABLED", scope: "user", userId: "u2", value: "off" })]);
    expect(p.plumbing).toBe(true);
    expect(p.rungs.map((r) => r.key)).toEqual(["app", "fallback"]);
    expect(rung(p, "fallback")).toMatchObject({ value: "on", decides: "decides for 3", deciding: true });
    expect(p.accounts[0].meta).toContain("ignored, plumbing is app-wide only");
    expect(p.app.note).toBe("");
    expect(p.result.text).toBe("On for all 3 accounts");
  });

  it("writes the app-wide meta and note, naming the compiled default", () => {
    expect(page("FEEDBACK_ENABLED", {}).app).toEqual({
      value: "Not set",
      current: null,
      set: false,
      meta: "not set: the fallback decides",
      note: "Not set falls back to the flag’s compiled default (off). Killed turns it off for everyone.",
      refused: false,
      stopped: false,
      who: "All 3 accounts.",
    });
    expect(rung(page("FEEDBACK_ENABLED", {}), "fallback")).toMatchObject({ value: "off", decides: "decides for 3", deciding: true });
    const set = page("FEEDBACK_ENABLED", {}, [ov({ name: "FEEDBACK_ENABLED", value: "off", note: "Held back", updatedBy: "u2" })]);
    expect(set.app).toMatchObject({ value: "Off", set: true, meta: "set by Mara, Oct 11 · 14:02", note: "Note: “Held back” Not set falls back to the flag’s compiled default (off). Killed turns it off for everyone." });
  });

  it("writes history in the copy file's shapes, naming the viewer as You and a gone group by its id", () => {
    const ev = (e: Partial<SwitchEvent>): SwitchEvent => ({ at: AT, actorId: "u1", kind: "override_set", scope: "app", groupId: null, userId: null, oldValue: null, newValue: "off", note: null, ...e });
    const p = page("FEEDBACK_ENABLED", {}, [], [
      ev({ note: "Held back" }),
      ev({ actorId: "u2", scope: "user", userId: "u1", oldValue: "off", newValue: "on" }),
      ev({ kind: "override_cleared", scope: "group", groupId: "0123456789abcdef", oldValue: "on", newValue: null }),
      ev({ scope: "group", groupId: "g1" }),
    ]);
    expect(p.history).toEqual([
      { when: "Oct 11 · 14:02", what: "You set app-wide: not set → off", note: "Held back" },
      { when: "Oct 11 · 14:02", what: "Mara set account Hugh: off → on", note: null },
      { when: "Oct 11 · 14:02", what: "You cleared group 01234567 (was on)", note: null },
      { when: "Oct 11 · 14:02", what: "You set group friends: not set → off", note: null },
    ]);
  });

  it("names a deleted group by the name its group_deleted event kept, before falling back to the id", () => {
    const ev: SwitchEvent = { at: AT, actorId: "u1", kind: "override_cleared", scope: "group", groupId: "0123456789abcdef", userId: null, oldValue: "on", newValue: null, note: null };
    const base = { name: "FEEDBACK_ENABLED" as const, env: envValues({}), overrides: [], verdicts: new Map(), allFeatures: [], accounts: ACCOUNTS, groups: GROUPS, events: [ev], viewerId: "u1", historyLimit: 100 };
    expect(switchPage({ ...base, deletedGroups: new Map([["0123456789abcdef", "testers"]]) }).history[0].what).toBe("You cleared group testers (was on)");
    expect(switchPage(base).history[0].what).toBe("You cleared group 01234567 (was on)");
  });

  it("lists at most the history limit, and says when older events were cut", () => {
    const ev = (n: number): SwitchEvent => ({ at: AT, actorId: "u1", kind: "override_set", scope: "app", groupId: null, userId: null, oldValue: null, newValue: String(n), note: null });
    const base = { name: "FEEDBACK_ENABLED" as const, env: envValues({}), overrides: [], verdicts: new Map(), allFeatures: [], accounts: [], groups: [], viewerId: "u1", historyLimit: 2 };
    expect(switchPage({ ...base, events: [ev(1), ev(2)] })).toMatchObject({ historyCut: false, history: { length: 2 } });
    const cut = switchPage({ ...base, events: [ev(1), ev(2), ev(3)] });
    expect(cut.historyCut).toBe(true);
    expect(cut.history.map((h) => h.what)).toEqual(["You set app-wide: not set → 1", "You set app-wide: not set → 2"]);
  });

  it("never says the parent allows all when there are no accounts", () => {
    const p = switchPage({ name: "WELCOME_CREDITS_ENABLED", env: envValues({ WELCOME_CREDITS_ENABLED: "true", PAYMENTS_ENABLED: "true" }), overrides: [], verdicts: new Map(), allFeatures: [], accounts: [], groups: [], events: [], historyLimit: 100, viewerId: "u1" });
    expect(p.rungs.find((r) => r.key === "needs")).toMatchObject({ value: "Buying credits: off for all 0 accounts", decides: "decides for none" });
  });

  it("formats times in UTC with a 24-hour clock", () => {
    expect(fmtWhen(new Date("2026-01-02T03:04:00Z"))).toBe("Jan 2 · 03:04");
    expect(fmtWhen(new Date("2026-10-11T23:59:00-05:00"))).toBe("Oct 12 · 04:59");
  });
});
