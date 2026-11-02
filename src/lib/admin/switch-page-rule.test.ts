// One switch's page (admin STATES F1 to F13), over sentinel envs and hand-built snapshots.
import { describe, expect, it } from "vitest";
import { explainAccounts } from "../switches/explain";
import type { SwitchSnapshot } from "../switches/resolve";
import { SWITCH_NAMES, type SwitchName } from "../switches/registry";
import type { Account } from "./accounts";
import { fmtWhen, switchPage, type OverrideDetail, type SwitchEvent } from "./switch-page-rule";

type Env = Partial<Record<SwitchName, string>>;
const envValues = (env: Env) => Object.fromEntries(SWITCH_NAMES.map((n) => [n, env[n] ?? null])) as Record<SwitchName, string | null>;
const AT = new Date("2026-10-11T14:02:00Z");
const ACCOUNTS: Account[] = [
  { id: "u1", name: "Hugh", email: "h•••@x•••.dev", named: true },
  { id: "u2", name: "Mara", email: "m•••@x•••.dev", named: true },
  { id: "u3", name: "Account ·u3", email: null, named: false },
];
const GROUPS = [{ id: "g1", name: "friends", members: 2 }];
const ov = (o: Partial<OverrideDetail> & { name?: SwitchName }): OverrideDetail & { name: SwitchName } => ({
  name: "OVERVIEW_V2_ENABLED",
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
    accounts: ACCOUNTS,
    groups: GROUPS,
    events,
    historyLimit: 100,
    viewerId: "u1",
  });
}

const rung = (p: ReturnType<typeof page>, key: string) => p.rungs.find((r) => r.key === key);

describe("switchPage", () => {
  // Round 1 of #1790: an account on only because of All features counts on the Account rung, and the
  // rung's value names it, rather than reading None beside "decides for 1".
  it("names an account its All features row decides, on the Account rung", () => {
    const snapshot: SwitchSnapshot = {
      overrides: [{ switchName: "ALL_FEATURES", scope: "user", groupId: null, userId: "u2", value: "on" }],
      groupOf: new Map(),
    };
    const p = switchPage({
      name: "FLYER_TRIAL_ENABLED",
      env: envValues({}),
      overrides: [],
      verdicts: explainAccounts({} as NodeJS.ProcessEnv, snapshot, ACCOUNTS.map((a) => a.id)),
      accounts: ACCOUNTS,
      groups: GROUPS,
      events: [],
      historyLimit: 100,
      viewerId: "u1",
    });
    expect(rung(p, "account")).toMatchObject({ value: "Mara: All features", tone: "plain", deciding: true });
  });

  it("raises the rungs that decide, and says for how many (F1)", () => {
    // Welcome credits under payments: the one compound switch left once the Analysis tab's switch retired.
    const p = page("WELCOME_CREDITS_ENABLED", { PAYMENTS_ENABLED: "true", WELCOME_CREDITS_ENABLED: "true" }, [
      ov({ name: "WELCOME_CREDITS_ENABLED", scope: "app", value: "off" }),
      ov({ name: "WELCOME_CREDITS_ENABLED", scope: "user", userId: "u1", value: "on" }),
    ]);
    expect(p.rungs.map((r) => r.key)).toEqual(["account", "group", "app", "env", "needs"]);
    expect(rung(p, "account")).toMatchObject({ value: "Hugh: on", decides: "decides for 1", deciding: true });
    expect(rung(p, "group")).toMatchObject({ value: "None", tone: "none", decides: "decides for none", deciding: false });
    expect(rung(p, "app")).toMatchObject({ value: "Off", decides: "decides for 2", deciding: true });
    expect(rung(p, "env")).toMatchObject({ value: "true", tone: "mono", deciding: false });
    expect(rung(p, "needs")).toMatchObject({ value: "Buying credits: on for all 3 accounts", decides: "allows all 3" });
    expect(p.result).toEqual({ state: "mixed", text: "On for 1 of 3: Hugh" });
    expect(p.banner).toBeNull();
  });

  it("names the account and its source for Check an account, an account with no name as Account ·<tail>", () => {
    const p = page("FEEDBACK_ENABLED", { FEEDBACK_ENABLED: "true" }, [
      ov({ name: "FEEDBACK_ENABLED", scope: "group", groupId: "g1", value: "off" }),
      ov({ name: "FEEDBACK_ENABLED", scope: "user", userId: "u3", value: "off" }),
    ], [], { u2: "g1" });
    expect(p.explanations).toEqual([
      { id: "u1", label: "Hugh", on: true, source: "from the env var", kill: false },
      { id: "u2", label: "Mara", on: false, source: "group friends", kill: false },
      { id: "u3", label: "Account ·u3", on: false, source: "account override", kill: false },
    ]);
    expect(p.groups).toEqual([expect.objectContaining({ key: "g1", title: "friends", sub: "2 members", value: "off" })]);
    expect(p.accounts).toEqual([expect.objectContaining({ key: "u3", title: "Account ·u3", sub: "" })]);
  });

  it("refuses every override under a kill, and says so on the rungs, the rows and the banner (F5)", () => {
    const p = page("FLYER_TRIAL_ENABLED", { FLYER_TRIAL_ENABLED: "off" }, [
      ov({ name: "FLYER_TRIAL_ENABLED", scope: "user", userId: "u2", value: "on", note: "Early look" }),
      ov({ name: "FLYER_TRIAL_ENABLED", scope: "app", value: "on" }),
    ]);
    expect(p.banner).toMatchObject({ kind: "kill", title: "Off: the env var is off." });
    expect(p.banner?.body).toContain("FLYER_TRIAL_ENABLED=off refuses every override.");
    expect(rung(p, "account")).toMatchObject({ decides: "refused", deciding: false });
    expect(rung(p, "app")).toMatchObject({ decides: "refused" });
    expect(rung(p, "group")).toMatchObject({ decides: "decides for none" });
    expect(rung(p, "env")).toMatchObject({ value: "off · refuses every override", tone: "danger", decides: "decides for 3" });
    expect(p.accounts[0]).toMatchObject({ refused: true, note: "Early look", meta: "You · Oct 11 · 14:02 · refused, env var is off" });
    expect(p.app).toMatchObject({ refused: true, note: "Refused while the env var is off." });
    expect(p.explanations.every((e) => e.kill && e.source === "env var is off")).toBe(true);
    expect(p.result.text).toBe("Off for all 3 accounts");
  });

  it("draws the compound banner when the parent is off for everyone (F4)", () => {
    // Welcome credits under payments: the live compound pair (the Analysis tab's children were the example until it retired).
    const p = page("WELCOME_CREDITS_ENABLED", { WELCOME_CREDITS_ENABLED: "true", PAYMENTS_ENABLED: "false" });
    expect(p.banner).toMatchObject({ kind: "compound", title: "Off: needs Buying credits, which is off.", link: "Open Buying credits ›", parent: "PAYMENTS_ENABLED" });
    expect(rung(p, "needs")).toMatchObject({ value: "Buying credits: off for all 3 accounts", decides: "decides for 3", deciding: true });
    expect(p.explanations[0].source).toBe("Buying credits is off");
  });

  it("gives a plumbing switch no Account or Group rung, and marks a row it ignores (F6)", () => {
    const p = page("LIST_CACHE_ENABLED", { LIST_CACHE_ENABLED: "true" }, [ov({ name: "LIST_CACHE_ENABLED", scope: "user", userId: "u2", value: "off" })]);
    expect(p.plumbing).toBe(true);
    expect(p.rungs.map((r) => r.key)).toEqual(["app", "env"]);
    expect(p.accounts[0].meta).toContain("ignored, plumbing is app-wide only");
    expect(p.app.note).toBe("");
    expect(p.result.text).toBe("On for all 3 accounts");
  });

  it("writes the app-wide meta and note, and the unset env value", () => {
    expect(page("FEEDBACK_ENABLED", {}).app).toEqual({ value: "Not set", current: null, set: false, meta: "not set: the env var decides", note: "Not set falls back to the env var.", refused: false });
    expect(rung(page("FEEDBACK_ENABLED", {}), "env")?.value).toBe("unset");
    const set = page("FEEDBACK_ENABLED", {}, [ov({ name: "FEEDBACK_ENABLED", value: "off", note: "Held back", updatedBy: "u2" })]);
    expect(set.app).toMatchObject({ value: "Off", set: true, meta: "set by Mara, Oct 11 · 14:02", note: "Note: “Held back” Not set falls back to the env var." });
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
    const base = { name: "FEEDBACK_ENABLED" as const, env: envValues({}), overrides: [], verdicts: new Map(), accounts: ACCOUNTS, groups: GROUPS, events: [ev], viewerId: "u1", historyLimit: 100 };
    expect(switchPage({ ...base, deletedGroups: new Map([["0123456789abcdef", "testers"]]) }).history[0].what).toBe("You cleared group testers (was on)");
    expect(switchPage(base).history[0].what).toBe("You cleared group 01234567 (was on)");
  });

  it("lists at most the history limit, and says when older events were cut", () => {
    const ev = (n: number): SwitchEvent => ({ at: AT, actorId: "u1", kind: "override_set", scope: "app", groupId: null, userId: null, oldValue: null, newValue: String(n), note: null });
    const base = { name: "FEEDBACK_ENABLED" as const, env: envValues({}), overrides: [], verdicts: new Map(), accounts: [], groups: [], viewerId: "u1", historyLimit: 2 };
    expect(switchPage({ ...base, events: [ev(1), ev(2)] })).toMatchObject({ historyCut: false, history: { length: 2 } });
    const cut = switchPage({ ...base, events: [ev(1), ev(2), ev(3)] });
    expect(cut.historyCut).toBe(true);
    expect(cut.history.map((h) => h.what)).toEqual(["You set app-wide: not set → 1", "You set app-wide: not set → 2"]);
  });

  it("never says the parent allows all when there are no accounts", () => {
    const p = switchPage({ name: "WELCOME_CREDITS_ENABLED", env: envValues({ WELCOME_CREDITS_ENABLED: "true", PAYMENTS_ENABLED: "true" }), overrides: [], verdicts: new Map(), accounts: [], groups: [], events: [], historyLimit: 100, viewerId: "u1" });
    expect(p.rungs.find((r) => r.key === "needs")).toMatchObject({ value: "Buying credits: off for all 0 accounts", decides: "decides for none" });
  });

  it("formats times in UTC with a 24-hour clock", () => {
    expect(fmtWhen(new Date("2026-01-02T03:04:00Z"))).toBe("Jan 2 · 03:04");
    expect(fmtWhen(new Date("2026-10-11T23:59:00-05:00"))).toBe("Oct 12 · 04:59");
  });
});
