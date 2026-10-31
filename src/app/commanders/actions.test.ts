import { beforeEach, describe, expect, it, vi } from "vitest";

const after = vi.fn();
vi.mock("next/server", () => ({ after: (...a: unknown[]) => after(...a) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const requireUserId = vi.fn(async () => "user_1");
vi.mock("../../lib/auth", () => ({ requireUserId: () => requireUserId() }));
const writeCommandersAvail = vi.fn(async () => {});
vi.mock("../../lib/commanders/avail-pref", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/commanders/avail-pref")>()),
  writeCommandersAvail: (...a: unknown[]) => writeCommandersAvail(...(a as [])),
}));
vi.mock("../../lib/cache/user-lists", () => ({ revalidateUserLists: vi.fn() }));
// The excluded-matches lookup re-derives the discover pool.
const loadDiscoveryPool = vi.hoisted(() => vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({ collection: [{ oracleId: "c1" }] })));
vi.mock("../../lib/discovery/candidates", () => ({ loadNameMatches: async () => [] }));
vi.mock("../../lib/decks/built", () => ({ loadBuiltCommanderIds: async () => new Set() }));
vi.mock("../../lib/discovery/excluded-match", () => ({ classifyMatches: () => [] }));
vi.mock("../../lib/discovery/list", () => ({ loadDiscoveryPool }));
vi.mock("../../lib/recs/store", () => ({}));

const { findExcludedMatches, rememberCommandersAvail } = await import("./actions");

describe("findExcludedMatches", () => {
  it("reads the reader's pool once", async () => {
    expect(await findExcludedMatches("korvold", { sort: "fit" })).toEqual([]);
    expect(loadDiscoveryPool).toHaveBeenCalledTimes(1);
    expect(loadDiscoveryPool.mock.calls[0]).toEqual(["user_1"]);
  });
});

beforeEach(() => {
  after.mockReset();
  writeCommandersAvail.mockClear();
  requireUserId.mockClear();
});

describe("rememberCommandersAvail", () => {
  // In the action's own run, not deferred: Next runs a page's actions one at a time, which is
  // what keeps two quick flips in order. Two `after()` callbacks would carry no order.
  it("writes in the action's own run, for the signed-in account", async () => {
    await rememberCommandersAvail("free");
    expect(writeCommandersAvail).toHaveBeenCalledWith("user_1", "free");
    expect(after).not.toHaveBeenCalled();
  });

  it("drops anything that is not a mode before asking who is signed in", async () => {
    for (const value of ["", "any", null, 1, { avail: "free" }]) await rememberCommandersAvail(value);
    expect(requireUserId).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });
});
