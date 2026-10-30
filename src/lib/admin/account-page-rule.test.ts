// The Accounts pages' arithmetic (admin STATES A1 to A7, plan 9b): search, order, the list's credits,
// the role line from real limits, the tiles (A6 no presses, A7 none left), the switches' three groups
// and spend by feature.
import { describe, expect, it } from "vitest";
import { explainAccount } from "../switches/explain";
import { SWITCHES } from "../switches/registry";
import type { SwitchSnapshot } from "../switches/resolve";
import { orderAccounts } from "./accounts";
import {
  accountRows,
  accountTiles,
  creditsNow,
  featureSpend,
  featureTotal,
  initials,
  utcMonthName,
  matchesAccount,
  roleLine,
  switchGroups,
  utcClock,
} from "./account-page-rule";

const HUGH = { id: "user_2hugh", name: "Hugh H.", email: "h•••@e•••.com", named: true };
const MARA = { id: "user_9mara", name: "Mara Q.", email: "m•••@e•••.com", named: true };
const BARE = { id: "user_7bare", name: "Account ·bare", email: null, named: false };

describe("matchesAccount (A2)", () => {
  it("matches the masked name anywhere, ignoring case", () => {
    expect(matchesAccount(HUGH, "gh h")).toBe(true);
    expect(matchesAccount(MARA, "  mARA ")).toBe(true);
    expect(matchesAccount(MARA, "hugh")).toBe(false);
    expect(matchesAccount(BARE, "·BARE")).toBe(true);
  });

  it("never matches an email or a Clerk id, which do not reach the client", () => {
    expect(matchesAccount(MARA, "example.com")).toBe(false);
    expect(matchesAccount(MARA, "mara@")).toBe(false);
    expect(matchesAccount(BARE, "user_7")).toBe(false);
    expect(matchesAccount(BARE, "user_7bare")).toBe(false);
  });

  it("keeps every account for an empty query", () => {
    expect(matchesAccount(BARE, "   ")).toBe(true);
  });
});

describe("the list (A1)", () => {
  it("orders the owner first, then A to Z, and draws each row's group, credits and spend", () => {
    const accounts = orderAccounts([MARA, BARE, HUGH], new Set([HUGH.id]));
    const rows = accountRows({
      accounts,
      groupOf: new Map([[MARA.id, "g1"]]),
      groupNames: new Map([["g1", "friends"]]),
      credits: new Map([[HUGH.id, { left: 7, limit: 10 }], [MARA.id, { left: 0, limit: 5 }], [BARE.id, { left: 5, limit: 5 }]]),
      spend: new Map([[HUGH.id, 2_100_000], [MARA.id, 1_420_000]]),
      invites: new Map([[MARA.id, { left: 2, waiting: 1, invitedBy: { kind: "account", id: HUGH.id, name: "Hugh H.", joinedAt: new Date(0) } }]]),
      ownerId: HUGH.id,
    });
    // An account the invite read did not name holds none and was invited by no one.
    expect(rows.map((r) => r.invites.left)).toEqual([0, 2, 0]);
    expect(rows[0].invites.invitedBy).toEqual({ kind: "founder" });
    expect(rows.map((r) => [r.name, r.group?.name ?? null, r.credits, r.spend])).toEqual([
      ["Hugh H.", null, "7 of 10", "$2.10"],
      ["Mara Q.", "friends", "0 of 5", "$1.420"],
      ["Account ·bare", null, "5 of 5", "$0"],
    ]);
    // D4: the owner and an account with no name are marked with the diamond (null), the rest lettered.
    expect(rows.map((r) => [r.owner, r.initials])).toEqual([[true, null], [false, "MQ"], [false, null]]);
  });

  it("keeps a membership whose group name did not load, naming it by its id", () => {
    const rows = accountRows({ accounts: [MARA], groupOf: new Map([[MARA.id, "g9"]]), groupNames: new Map(), credits: new Map(), spend: new Map(), invites: new Map(), ownerId: null });
    expect(rows[0].group).toEqual({ id: "g9", name: "g9" });
  });

  it("counts each account's free credits from the window's rows against its own limit", () => {
    const now = new Date("2026-10-13T12:00:00Z");
    const hour = (h: number) => new Date(now.getTime() - h * 3_600_000);
    const credits = creditsNow(
      [HUGH.id, MARA.id],
      [
        { userId: HUGH.id, status: "spent", createdAt: hour(1) },
        { userId: MARA.id, status: "spent", createdAt: hour(2) },
        { userId: MARA.id, status: "spent", createdAt: hour(25) },
      ],
      new Map([[HUGH.id, 10], [MARA.id, 1]]),
      now,
    );
    expect(credits.get(HUGH.id)).toEqual({ left: 9, limit: 10 });
    expect(credits.get(MARA.id)).toEqual({ left: 0, limit: 1 });
  });

  it("takes initials from the masked name (D4), and none for an account with no name", () => {
    expect(initials(MARA)).toBe("MQ");
    expect(initials({ ...MARA, name: "  mara  " })).toBe("MA");
    expect(initials({ ...MARA, name: "Account ·9xQe", named: false })).toBeNull();
  });
});

describe("roleLine (A4)", () => {
  it("names the owner's own limit and share, not the handoff's 10 and $5", () => {
    expect(roleLine(true, 12, 7_500_000)).toBe("Owner. 12 credits a day, and a $7.50 testing share each month.");
    expect(roleLine(false, 3, 5_000_000)).toBe("3 credits a day.");
    expect(roleLine(false, 1, 5_000_000)).toBe("1 credit a day.");
  });
});

describe("accountTiles (A4, A6, A7)", () => {
  const base = { owner: false, shareMicro: 5_000_000, spentMicro: 1_420_000, presses: 34, hub: { drawn: true, tools: 2 }, month: "October" };

  it("draws credits left, spend, presses and the hub, with no reset while credits remain", () => {
    const tiles = accountTiles({ ...base, credits: { used: 2, limit: 5, reopensAt: null } });
    expect(tiles.map((t) => [t.label, t.figure, t.sub])).toEqual([
      ["Credits now", "3 of 5 left", null],
      ["Spent in October", "$1.420", null],
      ["Runs", "34", null],
      ["Tuning hub", "Drawn", "2 of its tools on"],
    ]);
  });

  it("says when the next credit comes back once none is left (A7)", () => {
    const at = new Date("2026-10-13T21:05:00Z");
    const [credits] = accountTiles({ ...base, credits: { used: 5, limit: 5, reopensAt: at } });
    expect(credits.figure).toBe("0 of 5 left");
    expect(credits.sub).toBe(`reset at ${utcClock(at)} UTC`);
    expect(utcClock(at)).toBe("9:05 PM");
  });

  it("reads the owner's spend against the share", () => {
    const spent = accountTiles({ ...base, owner: true, spentMicro: 2_100_000, credits: { used: 0, limit: 10, reopensAt: null } })[1];
    expect(spent.sub).toBe("42% of the $5 testing share");
  });

  it("draws $0 and 0 for a month with no presses (A6), and a hub that is not drawn", () => {
    const tiles = accountTiles({ ...base, spentMicro: 0, presses: 0, hub: { drawn: false, tools: 1 }, credits: { used: 0, limit: 5, reopensAt: null } });
    expect(tiles.slice(1).map((t) => [t.figure, t.sub])).toEqual([["$0", null], ["0", null], ["Not drawn", "1 of its tools on"]]);
  });
});

describe("switchGroups (A4, A5)", () => {
  const G = "11111111-1111-4111-8111-111111111111";
  const snapshot: SwitchSnapshot = {
    overrides: [
      { switchName: "SWAP_TOOLS_ENABLED", scope: "group", groupId: G, userId: null, value: "on" },
      { switchName: "PROPOSED_CUTS_ENABLED", scope: "user", groupId: null, userId: MARA.id, value: "on" },
      { switchName: "MANA_BALANCE_ENABLED", scope: "app", groupId: null, userId: null, value: "off" },
    ],
    groupOf: new Map([[MARA.id, G]]),
  };
  const env = { ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "off" } as unknown as NodeJS.ProcessEnv;

  it("sorts every switch into exactly one group, with the source each verdict names", () => {
    const g = switchGroups(explainAccount(env, snapshot, MARA.id), (id) => (id === G ? "friends" : id));
    expect(g.total).toBe(SWITCHES.length);
    expect(g.override.length + g.rule.length + g.envOn.length + g.envOff.length).toBe(SWITCHES.length);
    expect(g.override.map((l) => [l.name, l.on, l.source])).toEqual([
      ["MANA_BALANCE_ENABLED", false, "app-wide override"],
      ["PROPOSED_CUTS_ENABLED", true, "account override"],
      ["SWAP_TOOLS_ENABLED", true, "group friends"],
    ]);
    expect(g.envOn).toContain("Analysis tab");
    expect(g.envOn).toContain("Suggested changes");
  });

  it("puts the kill and an off parent under Off by a rule, and inks only the kill", () => {
    const killed = { ...env, ANALYSIS_TAB_ENABLED: "off" } as unknown as NodeJS.ProcessEnv;
    const g = switchGroups(explainAccount(killed, snapshot, MARA.id), () => "friends");
    const rule = new Map(g.rule.map((l) => [l.name, l]));
    expect(rule.get("ANALYSIS_TAB_ENABLED")).toMatchObject({ on: false, source: "env var is off", kill: true });
    expect(rule.get("TUNING_ENABLED")).toMatchObject({ on: false, source: "Analysis tab is off", kill: false });
    // An account override under an off parent is decided by the parent, not the override.
    expect(rule.get("PROPOSED_CUTS_ENABLED")).toMatchObject({ on: false, kill: false });
    expect(g.override.map((l) => l.name)).not.toContain("PROPOSED_CUTS_ENABLED");
  });
});

describe("featureTotal (A4)", () => {
  it("sums presses and spend for the Total foot", () => {
    expect(featureTotal([{ presses: 12, micro: 640_000 }, { presses: 9, micro: 270_000 }])).toEqual({ presses: 21, spent: "$0.910" });
  });
});

describe("featureSpend (A4)", () => {
  it("names each feature as Costs does, most spent first", () => {
    expect(featureSpend([
      { feature: "intake", presses: 9, micro: 270_000 },
      { feature: "synopsis", presses: 12, micro: 640_000 },
      { feature: "mystery", presses: 1, micro: 270_000 },
    ])).toEqual([
      { feature: "synopsis", name: "Overview", presses: 12, spent: "$0.640" },
      { feature: "intake", name: "Help me choose", presses: 9, spent: "$0.270" },
      { feature: "mystery", name: "mystery", presses: 1, spent: "$0.270" },
    ]);
  });
});

describe("utcMonthName", () => {
  it("names the UTC month in full, or short for the list's 52px spend head (R3, A1)", () => {
    const at = new Date("2026-09-30T23:30:00Z");
    expect(utcMonthName(at)).toBe("September");
    expect(utcMonthName(at, "short")).toBe("Sep");
  });
});
