import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SwitchSnapshot } from "../switches/resolve";

// The Accounts loaders over mocked reads (admin plan 9b): the list's order (the allowance owner first,
// not every admin), and which ids `loadAccountPage` knows: a listed account, one named only by a
// membership, an override or `model_calls`, a stranger (null), and an unread snapshot that still finds
// a membership through `namedByRows`. The `system` sentinel is the 404 before any read.

const listAccounts = vi.fn();
const readSwitchSnapshot = vi.fn<() => Promise<SwitchSnapshot | null>>();
const loadGroupHeads = vi.fn();
const readAllowance = vi.fn();
const execute = vi.fn();
let owner: string | null = null;
let called: { one: number }[] = [];
let spend: { userId: string; micro: string }[] = [];

// One chainable select per query, answered by its projection: what each loader read is.
function select(projection: Record<string, unknown>) {
  const keys = Object.keys(projection).sort().join(",");
  const result =
    keys === "one" ? called
    : keys === "micro,userId" ? spend
    : [];
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where", "groupBy", "limit"]) chain[m] = () => chain;
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

vi.mock("../../db", () => ({ db: { select: (p: Record<string, unknown>) => select(p), execute: (q: unknown) => execute(q) } }));
vi.mock("./accounts", async (orig) => ({ ...(await orig<typeof import("./accounts")>()), listAccounts: () => listAccounts() }));
vi.mock("../switches/snapshot", () => ({ readSwitchSnapshot: () => readSwitchSnapshot() }));
vi.mock("./groups", () => ({ loadGroupHeads: () => loadGroupHeads() }));
vi.mock("../model/allowance", () => ({
  readAllowance: (...a: unknown[]) => readAllowance(...a),
  dailyLimitsFor: async (_q: unknown, ids: string[]) => new Map(ids.map((id) => [id, 5])),
  modelOwnerUserId: () => owner,
  ownerShareMicro: () => 5_000_000,
}));

const { loadAccountPage, loadAccountsList } = await import("./account-page");

const G = "11111111-1111-4111-8111-111111111111";
const HUGH = { id: "user_hugh", name: "Hugh", email: "hugh@example.com" };
const ADAM = { id: "user_adam", name: "Adam", email: null };
const empty: SwitchSnapshot = { overrides: [], groupOf: new Map() };

beforeEach(() => {
  owner = null;
  called = [];
  spend = [];
  listAccounts.mockReset().mockResolvedValue({ accounts: [HUGH], clerk: "ok" });
  readSwitchSnapshot.mockReset().mockResolvedValue(empty);
  loadGroupHeads.mockReset().mockResolvedValue([{ id: G, name: "friends", description: null }]);
  readAllowance.mockReset().mockResolvedValue({ used: 0, limit: 5, reopensAt: null, nextAt: null });
  execute.mockReset().mockResolvedValue({ rows: [] });
});

describe("loadAccountsList", () => {
  it("puts the allowance owner first, then A to Z, even when another admin sorts earlier", async () => {
    owner = HUGH.id;
    // `listAccounts` puts every admin first; Adam (an admin, not the owner) arrives ahead of Hugh.
    listAccounts.mockResolvedValue({ accounts: [ADAM, HUGH, { id: "user_bea", name: "Bea", email: null }], clerk: "ok" });
    const list = await loadAccountsList(new Date("2026-10-13T12:00:00Z"));
    expect(list.rows.map((r) => r.id)).toEqual(["user_hugh", "user_adam", "user_bea"]);
  });

  it("orders A to Z with no owner set", async () => {
    listAccounts.mockResolvedValue({ accounts: [HUGH, ADAM], clerk: "ok" });
    expect((await loadAccountsList()).rows.map((r) => r.id)).toEqual(["user_adam", "user_hugh"]);
  });
});

describe("loadAccountPage", () => {
  it("answers null for the system sentinel, reading nothing", async () => {
    expect(await loadAccountPage("system")).toBeNull();
    expect(listAccounts).not.toHaveBeenCalled();
    expect(readSwitchSnapshot).not.toHaveBeenCalled();
  });

  it("draws a listed account by its Clerk name", async () => {
    const page = await loadAccountPage(HUGH.id);
    expect(page).toMatchObject({ id: HUGH.id, name: "Hugh", email: "hugh@example.com", overridesRead: true, group: null });
  });

  it("draws an account known only by a membership, with its group", async () => {
    readSwitchSnapshot.mockResolvedValue({ overrides: [], groupOf: new Map([["user_ghost", G]]) });
    expect(await loadAccountPage("user_ghost")).toMatchObject({ name: "user_ghost", group: { id: G, name: "friends" } });
  });

  it("draws an account known only by an account override", async () => {
    readSwitchSnapshot.mockResolvedValue({
      overrides: [{ switchName: "SWAP_TOOLS_ENABLED", scope: "user", groupId: null, userId: "user_ghost", value: "on" }],
      groupOf: new Map(),
    });
    expect(await loadAccountPage("user_ghost")).toMatchObject({ id: "user_ghost" });
  });

  it("draws an account known only by its model_calls rows", async () => {
    called = [{ one: 1 }];
    expect(await loadAccountPage("user_ghost")).toMatchObject({ id: "user_ghost" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("answers null for an id nothing names", async () => {
    expect(await loadAccountPage("user_stranger")).toBeNull();
  });

  it("with the snapshot unread, still finds a membership through its own read, and says the overrides did not load", async () => {
    readSwitchSnapshot.mockResolvedValue(null);
    execute.mockResolvedValue({ rows: [{ "?column?": 1 }] });
    const page = await loadAccountPage("user_ghost");
    expect(page).toMatchObject({ id: "user_ghost", overridesRead: false });
    expect(execute).toHaveBeenCalledTimes(1);
    execute.mockResolvedValue({ rows: [] });
    expect(await loadAccountPage("user_stranger")).toBeNull();
  });
});
