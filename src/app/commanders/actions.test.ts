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
const loadNameMatches = vi.hoisted(() => vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => []));
vi.mock("../../lib/discovery/candidates", () => ({ loadNameMatches }));
vi.mock("../../lib/decks/built", () => ({ loadBuiltCommanderIds: async () => new Set(["built"]) }));
const classifyMatches = vi.hoisted(() => vi.fn<(...a: unknown[]) => unknown[]>(() => []));
vi.mock("../../lib/discovery/excluded-match", () => ({ classifyMatches }));
vi.mock("../../lib/discovery/list", () => ({ loadDiscoveryPool }));
// The hidden read and the slug lookup reach the database; the actions are tested for what they ask.
const loadHiddenIds = vi.hoisted(() => vi.fn<(...a: unknown[]) => Promise<string[]>>(async () => []));
const loadOwnedHiddenNameMatches = vi.hoisted(() =>
  vi.fn<(...a: unknown[]) => Promise<{ oracleId: string; name: string }[] | null>>(async () => []),
);
const loadHiddenSlugs = vi.hoisted(() =>
  vi.fn<(...a: unknown[]) => Promise<Map<string, string>>>(async () => new Map()),
);
vi.mock("../../lib/commanders/hidden-matches", () => ({ loadOwnedHiddenNameMatches, loadHiddenSlugs }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => ({}) }));
vi.mock("../../lib/recs/store", () => ({}));
const hideCommander = vi.fn(async () => {});
const unhideCommander = vi.fn(async () => {});
const isHideable = vi.fn(async () => true);
vi.mock("../../lib/commanders/hidden", () => ({
  loadHiddenIds: (...a: unknown[]) => loadHiddenIds(...a),
  hideCommander: (...a: unknown[]) => hideCommander(...(a as [])),
  unhideCommander: (...a: unknown[]) => unhideCommander(...(a as [])),
  isHideable: (...a: unknown[]) => isHideable(...(a as [])),
}));

const {
  findExcludedMatches,
  findOwnedExcludedMatches,
  hideCommanderAction,
  rememberCommandersAvail,
  unhideCommanderAction,
} = await import("./actions");
const { revalidateUserLists } = await import("../../lib/cache/user-lists");

describe("findExcludedMatches", () => {
  beforeEach(() => {
    loadDiscoveryPool.mockClear();
    loadHiddenIds.mockReset();
    loadHiddenIds.mockResolvedValue([]);
    loadHiddenSlugs.mockClear();
    classifyMatches.mockReset();
    classifyMatches.mockReturnValue([]);
  });

  it("reads the reader's pool once", async () => {
    expect(await findExcludedMatches("korvold", { sort: "fit" })).toEqual([]);
    expect(loadDiscoveryPool).toHaveBeenCalledTimes(1);
    expect(loadDiscoveryPool.mock.calls[0]).toEqual(["user_1"]);
  });

  // Beside the built ids: a hidden commander left the list on the server, so only the server can say so.
  it("reads the reader's hidden ids and classifies against them", async () => {
    loadHiddenIds.mockResolvedValue(["h1", "h2"]);
    await findExcludedMatches("ghal", { sort: "fit" });
    expect(loadHiddenIds).toHaveBeenCalledWith("user_1");
    const [, opts] = classifyMatches.mock.calls[0] as [unknown, { hiddenOracleIds: Set<string>; builtOracleIds: Set<string> }];
    expect([...opts.hiddenOracleIds]).toEqual(["h1", "h2"]);
    expect([...opts.builtOracleIds]).toEqual(["built"]);
  });

  it("gives each hidden match the slug its page opens at, and no slug read without one", async () => {
    classifyMatches.mockReturnValue([
      { oracleId: "h1", name: "Ghalta, Primal Hunger", cause: "hidden", pct: null },
      { oracleId: "h2", name: "Ghalta, Stampede Tyrant", cause: "hidden", pct: null },
      { oracleId: "f1", name: "Ghave", cause: "floor", pct: 12 },
    ]);
    loadHiddenSlugs.mockResolvedValueOnce(new Map([["h1", "ghalta-primal-hunger"]]));
    const out = await findExcludedMatches("gha", { sort: "new" });
    expect(loadHiddenSlugs.mock.calls[0].slice(0, 3)).toEqual(["user_1", ["h1", "h2"], ["c1"]]);
    expect(out).toEqual([
      { oracleId: "h1", name: "Ghalta, Primal Hunger", cause: "hidden", pct: null, slug: "ghalta-primal-hunger" },
      // No list holds a slug for it: the held state then offers no page rather than a 404.
      { oracleId: "h2", name: "Ghalta, Stampede Tyrant", cause: "hidden", pct: null, slug: null },
      { oracleId: "f1", name: "Ghave", cause: "floor", pct: 12 },
    ]);

    loadHiddenSlugs.mockClear();
    classifyMatches.mockReturnValue([{ oracleId: "f1", name: "Ghave", cause: "floor", pct: 12 }]);
    await findExcludedMatches("gha", { sort: "new" });
    expect(loadHiddenSlugs).not.toHaveBeenCalled();
  });

  it("answers null past the cap without classifying", async () => {
    loadNameMatches.mockResolvedValueOnce(null);
    expect(await findExcludedMatches("a b", { sort: "fit" })).toBeNull();
    expect(classifyMatches).not.toHaveBeenCalled();
  });
});

// For you's half (hide a commander, READINESS Y4): only a hide can take a match out of that list where
// the client cannot see it.
describe("findOwnedExcludedMatches", () => {
  beforeEach(() => {
    loadOwnedHiddenNameMatches.mockReset();
    loadOwnedHiddenNameMatches.mockResolvedValue([]);
    loadHiddenSlugs.mockClear();
  });

  it("asks nothing of a query under two characters", async () => {
    expect(await findOwnedExcludedMatches(" g ")).toEqual([]);
    expect(loadOwnedHiddenNameMatches).not.toHaveBeenCalled();
  });

  // Owned hides only (the reader's own lane), so the matched ids stand in for the collection and no
  // collection read is made: the slug comes from the persisted scores.
  it("reports an owned hidden match by name, with its page's slug", async () => {
    loadOwnedHiddenNameMatches.mockResolvedValue([{ oracleId: "h1", name: "Ghalta, Primal Hunger" }]);
    loadHiddenSlugs.mockResolvedValueOnce(new Map([["h1", "ghalta-primal-hunger"]]));
    expect(await findOwnedExcludedMatches(" ghal ")).toEqual([
      { oracleId: "h1", name: "Ghalta, Primal Hunger", cause: "hidden", pct: null, slug: "ghalta-primal-hunger" },
    ]);
    expect(loadOwnedHiddenNameMatches).toHaveBeenCalledWith("user_1", "ghal");
    expect(loadHiddenSlugs.mock.calls[0].slice(0, 3)).toEqual(["user_1", ["h1"], ["h1"]]);
  });

  it("reads no slug when nothing hidden is named that", async () => {
    expect(await findOwnedExcludedMatches("korvold")).toEqual([]);
    expect(loadHiddenSlugs).not.toHaveBeenCalled();
  });

  it("answers null past the cap", async () => {
    loadOwnedHiddenNameMatches.mockResolvedValue(null);
    expect(await findOwnedExcludedMatches("ghal")).toBeNull();
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

describe("hideCommanderAction / unhideCommanderAction", () => {
  const ID = "0f6a3b8e-5c1d-4e2f-9a7b-1c2d3e4f5a6b";

  beforeEach(() => {
    hideCommander.mockClear();
    unhideCommander.mockClear();
    isHideable.mockReset();
    isHideable.mockResolvedValue(true);
    vi.mocked(revalidateUserLists).mockClear();
  });

  it("hides a commander for the signed-in account and drops its list cache", async () => {
    expect(await hideCommanderAction(ID)).toBe(true);
    expect(hideCommander).toHaveBeenCalledWith("user_1", ID);
    expect(revalidateUserLists).toHaveBeenCalledWith("user_1");
  });

  // A Server Action's argument is whatever was posted: an array holding a real uuid must not reach the query.
  it("refuses anything that is not a uuid, without a read or a write", async () => {
    for (const value of ["", "korvold", null, 1, [ID], { oracleId: ID }]) {
      expect(await hideCommanderAction(value)).toBe(false);
      expect(await unhideCommanderAction(value)).toBe(false);
    }
    expect(isHideable).not.toHaveBeenCalled();
    expect(hideCommander).not.toHaveBeenCalled();
    expect(unhideCommander).not.toHaveBeenCalled();
    expect(revalidateUserLists).not.toHaveBeenCalled();
  });

  it("refuses an id the catalog does not hold", async () => {
    isHideable.mockResolvedValue(false);
    expect(await hideCommanderAction(ID)).toBe(false);
    expect(hideCommander).not.toHaveBeenCalled();
    expect(revalidateUserLists).not.toHaveBeenCalled();
  });

  // A card the catalog has since stopped calling a commander must still come off the Hidden list.
  it("unhides without asking whether the card is still a commander", async () => {
    isHideable.mockResolvedValue(false);
    expect(await unhideCommanderAction(ID)).toBe(true);
    expect(isHideable).not.toHaveBeenCalled();
    expect(unhideCommander).toHaveBeenCalledWith("user_1", ID);
    expect(revalidateUserLists).toHaveBeenCalledWith("user_1");
  });
});
