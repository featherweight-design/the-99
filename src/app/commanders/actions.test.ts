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
vi.mock("../../lib/flags/request", () => ({ requestFlags: async () => ({}) }));
vi.mock("../../lib/recs/store", () => ({}));
const hideCommander = vi.fn(async () => {});
const unhideCommander = vi.fn<(...a: unknown[]) => Promise<Date | null>>(async () => null);
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
  unhideCommanderForUndoAction,
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
    loadOwnedHiddenNameMatches.mockReset();
    loadOwnedHiddenNameMatches.mockResolvedValue([]);
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

  // Small items 10, 3b: an owned hide is For you's to report, so Discover's lookup drops it entirely
  // rather than reclassifying it; a hide on a commander the player does not own stays.
  it("drops a hidden match the player owns and keeps one they do not", async () => {
    classifyMatches.mockReturnValue([
      { oracleId: "h1", name: "Ghalta, Primal Hunger", cause: "hidden", pct: null },
      { oracleId: "h2", name: "Ghalta, Stampede Tyrant", cause: "hidden", pct: null },
      { oracleId: "f1", name: "Ghave", cause: "floor", pct: 12 },
    ]);
    loadOwnedHiddenNameMatches.mockResolvedValueOnce([{ oracleId: "h1", name: "Ghalta, Primal Hunger" }]);
    loadHiddenIds.mockResolvedValue(["h1", "h2"]);
    const out = await findExcludedMatches("gha", { sort: "new" });
    expect(loadOwnedHiddenNameMatches).toHaveBeenCalledWith("user_1", "gha");
    expect(out?.map((m) => m.oracleId)).toEqual(["h2", "f1"]);
    // The owned id stays in the classifier's hidden set: taking it out would let a `new`-sort row fall
    // through to the floor tiers and read "below the floor", a position Discover never lists it at.
    const [, opts] = classifyMatches.mock.calls[0] as [unknown, { hiddenOracleIds: Set<string> }];
    expect([...opts.hiddenOracleIds]).toEqual(["h1", "h2"]);
    expect(out?.some((m) => m.oracleId === "h1" && m.cause === "floor")).toBe(false);
  });

  it("reads no owned hides when no match is hidden", async () => {
    loadOwnedHiddenNameMatches.mockClear();
    classifyMatches.mockReturnValue([{ oracleId: "f1", name: "Ghave", cause: "floor", pct: 12 }]);
    await findExcludedMatches("gha", { sort: "new" });
    expect(loadOwnedHiddenNameMatches).not.toHaveBeenCalled();
  });

  it("answers null when the owned hides pass the cap", async () => {
    classifyMatches.mockReturnValue([{ oracleId: "h1", name: "Ghalta", cause: "hidden", pct: null }]);
    loadOwnedHiddenNameMatches.mockResolvedValueOnce(null);
    expect(await findExcludedMatches("gha", { sort: "new" })).toBeNull();
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
    unhideCommander.mockReset();
    unhideCommander.mockResolvedValue(null);
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

  // Ruling R1: the Undo of an Unhide restores the original time its unhide answered, never a time past now.
  it("restores a past time, clamps a later one to now, and dates any other hide now", async () => {
    const original = "2026-11-01T12:00:00.000Z";
    expect(await hideCommanderAction(ID, original)).toBe(true);
    expect(hideCommander).toHaveBeenLastCalledWith("user_1", ID, new Date(original));
    const before = Date.now();
    expect(await hideCommanderAction(ID, "2999-01-01T00:00:00.000Z")).toBe(true);
    const clamped = (hideCommander.mock.lastCall as unknown[] | undefined)?.[2] as Date;
    expect(clamped.getTime()).toBeGreaterThanOrEqual(before);
    expect(clamped.getTime()).toBeLessThanOrEqual(Date.now());
    // A time before the feature first shipped is forged ("1970" would sort a restored row last for good): now().
    for (const bad of ["not a date", "", 1793581176699, { at: original }, null, "1970-01-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z"]) {
      hideCommander.mockClear();
      expect(await hideCommanderAction(ID, bad)).toBe(true);
      expect(hideCommander).toHaveBeenCalledWith("user_1", ID);
    }
    hideCommander.mockClear();
    expect(await hideCommanderAction(ID)).toBe(true);
    expect(hideCommander).toHaveBeenCalledWith("user_1", ID);
  });

  it("answers the Hidden list's unhide with the removed row's time", async () => {
    unhideCommander.mockResolvedValue(new Date("2026-11-01T12:00:00Z"));
    expect(await unhideCommanderForUndoAction(ID)).toEqual({ ok: true, hiddenAt: "2026-11-01T12:00:00.000Z" });
    unhideCommander.mockResolvedValue(null);
    expect(await unhideCommanderForUndoAction(ID)).toEqual({ ok: true, hiddenAt: null });
    expect(await unhideCommanderForUndoAction("korvold")).toEqual({ ok: false, hiddenAt: null });
    expect(await unhideCommanderAction("korvold")).toBe(false);
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
