import { describe, expect, it } from "vitest";
import { explainAccount } from "../switches/explain";
import type { SwitchSnapshot } from "../switches/resolve";
import {
  effectBetween,
  groupEvents,
  groupHistory,
  groupsList,
  memberDiff,
  memberEffects,
  memberRows,
  memberState,
  parseCredits,
  pendingSummary,
  validateGroup,
  withMembership,
  type MemberRow,
  type SavedGroup,
} from "./groups-rule";

const T = "11111111-1111-4111-8111-111111111111"; // testers
const F = "22222222-2222-4222-8222-222222222222"; // friends
const accounts = [
  { id: "u_hugh", name: "Hugh", email: "hugh@x.dev" },
  { id: "u_mara", name: "Mara", email: null },
  { id: "u_theo", name: "Theo", email: null },
  { id: "u_jun", name: "Jun", email: null },
];

describe("validateGroup", () => {
  it("takes a lowercase name, trims, and drops an empty description to null", () => {
    expect(validateGroup({ name: " testers ", description: "  ", dailyAllowance: null, members: ["a", "a", "b"] })).toEqual({
      ok: true,
      desired: { name: "testers", description: null, dailyAllowance: null, members: ["a", "b"], confirmed: null },
    });
    expect(validateGroup({ name: "beta-1_x", dailyAllowance: 8, confirmed: 2 })).toMatchObject({ ok: true, desired: { dailyAllowance: 8, members: [], confirmed: 2 } });
  });

  it.each([["Testers"], ["two words"], ["-lead"], [""], ["a".repeat(41)], [7]])("refuses the name %j", (name) => {
    expect(validateGroup({ name })).toEqual({ ok: false, error: "nameRule" });
  });

  it("refuses a long description, credits out of 1 to 1000, and bad members", () => {
    expect(validateGroup({ name: "t", description: "x".repeat(501) })).toEqual({ ok: false, error: "description" });
    expect(validateGroup({ name: "t", description: "x".repeat(500) }).ok).toBe(true);
    for (const a of [0, 1001, 2.5, "5"]) expect(validateGroup({ name: "t", dailyAllowance: a })).toEqual({ ok: false, error: "allowance" });
    for (const a of [1, 1000]) expect(validateGroup({ name: "t", dailyAllowance: a }).ok).toBe(true);
    expect(validateGroup({ name: "t", members: "u1" })).toEqual({ ok: false, error: "members" });
    expect(validateGroup({ name: "t", members: ["u1", ""] })).toEqual({ ok: false, error: "members" });
  });
});

describe("memberDiff and withMembership", () => {
  const groupOf = new Map([
    ["u_hugh", T],
    ["u_mara", T],
    ["u_theo", F],
  ]);

  it("adds, moves from another group and removes, against the rows held now", () => {
    const diff = memberDiff(T, ["u_hugh", "u_theo", "u_jun"], groupOf);
    expect(diff).toEqual({ adds: [{ userId: "u_theo", from: F }, { userId: "u_jun", from: null }], removes: ["u_mara"] });
    const after = withMembership({ overrides: [], groupOf }, T, diff);
    expect([...after.groupOf].sort()).toEqual([["u_hugh", T], ["u_jun", T], ["u_theo", T]]);
    // The snapshot it was given is unchanged.
    expect(groupOf.get("u_mara")).toBe(T);
  });

  it("is empty when the selection matches", () => {
    expect(memberDiff(T, ["u_mara", "u_hugh"], groupOf)).toEqual({ adds: [], removes: [] });
  });
});

describe("groupEvents", () => {
  const saved: SavedGroup = { id: T, name: "testers", description: null, dailyAllowance: 5 };
  const desired = { name: "testers", description: null, dailyAllowance: 5, members: [], confirmed: null };

  it("records nothing for a save that changes nothing", () => {
    expect(groupEvents(T, saved, desired, { adds: [], removes: [] })).toEqual([]);
  });

  it("records each field, then removals, then a move as removed from the old group and added here", () => {
    const events = groupEvents(T, saved, { ...desired, name: "beta", description: "Hugh plus one", dailyAllowance: null }, {
      adds: [{ userId: "u_theo", from: F }, { userId: "u_jun", from: null }],
      removes: ["u_mara"],
    });
    expect(events.map((e) => [e.kind, e.groupId === T ? "T" : "F", e.userId, e.oldValue, e.newValue])).toEqual([
      ["group_renamed", "T", null, "testers", "beta"],
      ["group_described", "T", null, null, "Hugh plus one"],
      ["group_allowance_set", "T", null, "5", null],
      ["member_removed", "T", "u_mara", null, null],
      ["member_removed", "F", "u_theo", null, null],
      ["member_added", "T", "u_theo", null, null],
      ["member_added", "T", "u_jun", null, null],
    ]);
  });

  it("records a create first, then what the new group was given", () => {
    const events = groupEvents(T, null, { ...desired, description: "d", dailyAllowance: 8 }, { adds: [{ userId: "u_jun", from: null }], removes: [] });
    expect(events.map((e) => e.kind)).toEqual(["group_created", "group_described", "group_allowance_set", "member_added"]);
    expect(events[0].newValue).toBe("testers");
    expect(events[2]).toMatchObject({ oldValue: null, newValue: "8" });
  });
});

describe("what an account gains or loses", () => {
  const env = { OVERVIEW_V2_ENABLED: "false", SWAP_TOOLS_ENABLED: "false", DECK_NOTES_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
  const snapshot: SwitchSnapshot = {
    overrides: [
      { switchName: "OVERVIEW_V2_ENABLED", scope: "group", groupId: T, userId: null, value: "on" },
      { switchName: "SWAP_TOOLS_ENABLED", scope: "group", groupId: T, userId: null, value: "on" },
      { switchName: "DECK_NOTES_ENABLED", scope: "group", groupId: F, userId: null, value: "off" },
    ],
    groupOf: new Map([
      ["u_hugh", T],
      ["u_theo", F],
    ]),
  };
  const explain = (s: SwitchSnapshot, id: string) => explainAccount(env, s, id);

  it("names the switches a move turns on and off, and a removal's losses", () => {
    const fx = memberEffects(snapshot, T, ["u_hugh", "u_theo", "u_jun"], explain);
    expect(fx.get("u_theo")!.toThis.gains).toEqual(expect.arrayContaining(["Overview v2", "Swap tools", "Deck notes"]));
    expect(fx.get("u_theo")!.toThis.losses).toEqual([]);
    expect(fx.get("u_hugh")!.toThis).toEqual({ gains: [], losses: [] });
    expect(fx.get("u_hugh")!.toNone.losses).toEqual(expect.arrayContaining(["Overview v2", "Swap tools"]));
    expect(fx.get("u_jun")!.toNone).toEqual({ gains: [], losses: [] });
  });

  it("treats a new group as no group", () => {
    const fx = memberEffects(snapshot, null, ["u_theo"], explain);
    expect(fx.get("u_theo")!.toThis).toEqual(fx.get("u_theo")!.toNone);
    expect(fx.get("u_theo")!.toNone.gains).toEqual(["Deck notes"]);
  });

  it("compares two resolutions switch by switch", () => {
    const a = explain(snapshot, "u_jun");
    expect(effectBetween(a, a)).toEqual({ gains: [], losses: [] });
  });
});

const row = (id: string, name: string, saved: { id: string; name: string } | null, gains: string[] = [], losses: string[] = []): MemberRow => ({
  id,
  name,
  email: null,
  saved,
  toThis: { gains, losses: [] },
  toNone: { gains: [], losses },
});

describe("memberState", () => {
  const theo = row("u_theo", "Theo", { id: F, name: "friends" });
  const mara = row("u_mara", "Mara", { id: T, name: "testers" });
  const jun = row("u_jun", "Jun", null);

  it("draws a saved member, a move, an add and an unselected account", () => {
    expect(memberState(mara, true, T)).toEqual({ sub: "in testers", state: "selected", unsaved: false });
    expect(memberState(theo, true, T)).toEqual({ sub: "moves from friends", state: "selected, not saved", unsaved: true });
    expect(memberState(jun, true, T)).toEqual({ sub: null, state: "selected, not saved", unsaved: true });
    expect(memberState(theo, false, T)).toEqual({ sub: "in friends", state: "unselected", unsaved: false });
    // A saved member being removed reads unselected, and is still a change.
    expect(memberState(mara, false, T)).toEqual({ sub: "in testers", state: "unselected", unsaved: true });
  });
});

describe("pendingSummary", () => {
  const saved: SavedGroup = { id: T, name: "testers", description: null, dailyAllowance: null };
  const draft = { name: "testers", description: "", credits: "" };
  const rows = [
    row("u_mara", "Mara", { id: T, name: "testers" }, [], ["Overview v2"]),
    row("u_theo", "Theo", { id: F, name: "friends" }, ["Overview v2", "Swap tools"]),
    row("u_jun", "Jun", null),
  ];

  it("is null when nothing differs", () => {
    expect(pendingSummary({ saved, draft, rows, selected: new Set(["u_mara"]) })).toBeNull();
  });

  it("names a move and what it gains, with no pronoun", () => {
    const p = pendingSummary({ saved, draft, rows, selected: new Set(["u_mara", "u_theo"]) })!;
    expect(p.title).toBe("Theo selected, not saved");
    expect(p.body).toBe("Theo moves from friends to testers, and gains Overview v2 and Swap tools.");
    expect(p.body).not.toMatch(/\b(he|she|his|her)\b/i);
  });

  it("names a removal's losses, and an add that changes nothing", () => {
    expect(pendingSummary({ saved, draft, rows, selected: new Set([]) })!.body).toBe("Saving removes Mara from testers, and Mara loses Overview v2.");
    const p = pendingSummary({ saved, draft, rows, selected: new Set(["u_mara", "u_jun"]) })!;
    expect(p.body).toBe("Saving adds Jun to testers. Nothing changes for Jun.");
  });

  it("counts field changes and members together", () => {
    const p = pendingSummary({ saved, draft: { name: "beta", description: "x", credits: "8" }, rows, selected: new Set(["u_mara", "u_jun"]) })!;
    expect(p.count).toBe(4);
    expect(p.title).toBe("4 changes not saved");
    expect(p.body).toBe("Saving renames testers to beta. Saving changes the description. Saving sets daily credits to 8. Saving adds Jun to beta. Nothing changes for Jun.");
    expect(pendingSummary({ saved: { ...saved, dailyAllowance: 8 }, draft, rows, selected: new Set(["u_mara"]) })).toMatchObject({
      title: "Not saved",
      body: "Saving sets daily credits back to the default.",
    });
  });

  it("names a new group by the name typed", () => {
    const p = pendingSummary({ saved: null, draft: { name: "beta", description: "", credits: "" }, rows, selected: new Set(["u_jun"]) })!;
    expect(p.body).toBe("Saving creates beta. Saving adds Jun to beta. Nothing changes for Jun.");
  });

  it("offers Create for a new group with only a name typed, and nothing for an empty one (G3)", () => {
    expect(pendingSummary({ saved: null, draft: { name: "beta", description: "", credits: "" }, rows, selected: new Set() })).toEqual({
      title: "Not saved",
      body: "Saving creates beta.",
      count: 1,
    });
    expect(pendingSummary({ saved: null, draft: { name: "", description: "", credits: "" }, rows, selected: new Set() })).toBeNull();
  });

  it("reads the credits field as the server will", () => {
    expect(parseCredits("")).toBeNull();
    expect(parseCredits(" 12 ")).toBe(12);
    expect(parseCredits("1.5")).toBeNaN();
  });
});

describe("groupsList and memberRows", () => {
  const snapshot: SwitchSnapshot = {
    overrides: [
      { switchName: "SWAP_TOOLS_ENABLED", scope: "group", groupId: T, userId: null, value: "on" },
      { switchName: "OVERVIEW_V2_ENABLED", scope: "group", groupId: T, userId: null, value: "on" },
      { switchName: "SWAP_TOOLS_ENABLED", scope: "app", groupId: null, userId: null, value: "off" },
    ],
    groupOf: new Map([
      ["u_mara", T],
      ["u_hugh", T],
      ["u_gone", F],
    ]),
  };

  it("draws a card per group, A to Z, its members in the universe's order, and the head meta", () => {
    const list = groupsList({ groups: [{ id: T, name: "testers", description: "Hugh plus one" }, { id: F, name: "friends", description: null }], snapshot, accounts });
    expect(list.count).toBe("2 groups");
    expect(list.meta).toBe("4 accounts · 2 in no group");
    expect(list.cards.map((c) => [c.name, c.count, c.members])).toEqual([
      ["friends", "1 member", "u_gone"],
      ["testers", "2 members", "Hugh, Mara"],
    ]);
    expect(list.cards[1].overrides.map((o) => `${o.label}: ${o.value}`)).toEqual(["Overview v2: on", "Swap tools: on"]);
  });

  it("lists every account, then a member the universe misses, with its saved group", () => {
    const rows = memberRows({ accounts: accounts.slice(0, 2), snapshot, groupId: F, groupNames: new Map([[T, "testers"], [F, "friends"]]), effects: new Map() });
    expect(rows.map((r) => [r.id, r.name, r.saved?.name ?? null])).toEqual([
      ["u_hugh", "Hugh", "testers"],
      ["u_mara", "Mara", "testers"],
      ["u_gone", "u_gone", "friends"],
    ]);
  });
});

describe("groupHistory", () => {
  const at = new Date("2026-10-03T11:02:00Z");
  const ev = (kind: string, rest: Partial<{ oldValue: string; newValue: string; userId: string; switchName: string; actorId: string }> = {}) => ({
    at,
    actorId: rest.actorId ?? "u_hugh",
    kind,
    scope: null,
    groupId: T,
    userId: rest.userId ?? null,
    oldValue: rest.oldValue ?? null,
    newValue: rest.newValue ?? null,
    note: null,
    switchName: rest.switchName ?? null,
  });

  it("words each kind, and says You for the viewer", () => {
    const items = groupHistory(
      [
        ev("group_created", { newValue: "testers" }),
        ev("group_renamed", { oldValue: "testers", newValue: "beta", actorId: "u_mara" }),
        ev("group_described", { newValue: "Hugh plus one" }),
        ev("group_described", { oldValue: "x" }),
        ev("group_allowance_set", { newValue: "8" }),
        ev("group_allowance_set", { oldValue: "8" }),
        ev("member_added", { userId: "u_theo" }),
        ev("member_removed", { userId: "u_x" }),
        ev("override_set", { switchName: "SWAP_TOOLS_ENABLED", newValue: "on" }),
        ev("override_cleared", { switchName: "SWAP_TOOLS_ENABLED", oldValue: "on" }),
        ev("setting_set"),
      ],
      accounts,
      "u_hugh",
    );
    expect(items.map((i) => i.what)).toEqual([
      "You created testers",
      "Mara renamed testers to beta",
      "You set the description to “Hugh plus one”",
      "You cleared the description",
      "You set daily credits: default → 8",
      "You set daily credits: 8 → default",
      "You added Theo",
      "You removed u_x",
      "You set Swap tools: not set → on",
      "You cleared Swap tools (was on)",
    ]);
    expect(items[0].when).toBe("3 Oct · 11:02");
  });
});
