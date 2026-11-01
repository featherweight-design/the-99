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
const hideCommander = vi.fn(async () => {});
const unhideCommander = vi.fn(async () => {});
const isHideable = vi.fn(async () => true);
vi.mock("../../lib/commanders/hidden", () => ({
  hideCommander: (...a: unknown[]) => hideCommander(...(a as [])),
  unhideCommander: (...a: unknown[]) => unhideCommander(...(a as [])),
  isHideable: (...a: unknown[]) => isHideable(...(a as [])),
}));

// A Discover row's hide reads its slug against the reader's own cached payload of the drawn sort.
const loadDiscoveryPayload = vi.hoisted(() => vi.fn<(...a: unknown[]) => Promise<unknown>>());
vi.mock("../../lib/discovery/payload", () => ({ loadDiscoveryPayload }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => ({}) }));

const { findExcludedMatches, hideCommanderAction, hideDiscoverCommanderAction, rememberCommandersAvail, unhideCommanderAction } =
  await import("./actions");
const { encodeDiscovery } = await import("../../lib/discovery/encode");
const { revalidateUserLists } = await import("../../lib/cache/user-lists");

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

describe("hideDiscoverCommanderAction", () => {
  const A = "0f6a3b8e-5c1d-4e2f-9a7b-1c2d3e4f5a6b";
  const B = "1f6a3b8e-5c1d-4e2f-9a7b-1c2d3e4f5a6b";
  const row = (slug: string, rank: number) => ({
    slug, name: slug, colorIdentity: ["G"], artCropUri: null, releasedAt: null, deckCount: null, rank,
    price: { kind: "absent" as const }, prose: null, gapSlot: { kind: "noMechanics" as const },
    score: 50, measurableTotal: 100, fitPool: 10, fitRoles: 10, fitSynergy: 30,
  });
  const payload = {
    encoded: encodeDiscovery({
      items: [row("alpha", 1), row("bravo", 2)],
      candidateCount: 2, cardsRead: 10, freePoolSize: 10, bestPct: null, floorExcluded: 0, poolExcluded: 0,
      unmeasured: 0, hasDecks: true, deckIdentities: [], availOk: true, priceOk: true, sort: "fit",
    }),
    oracleIds: [A, B],
    basis: "labels",
    fellBack: false,
  };

  beforeEach(() => {
    hideCommander.mockClear();
    isHideable.mockReset();
    isHideable.mockResolvedValue(true);
    loadDiscoveryPayload.mockReset();
    loadDiscoveryPayload.mockResolvedValue(payload);
    vi.mocked(revalidateUserLists).mockClear();
  });

  it("hides the oracle id at the slug's position in the drawn sort's payload, and answers it", async () => {
    expect(await hideDiscoverCommanderAction("bravo", "fit")).toBe(B);
    expect(loadDiscoveryPayload.mock.calls[0].slice(0, 2)).toEqual(["user_1", "fit"]);
    expect(hideCommander).toHaveBeenCalledWith("user_1", B);
    expect(revalidateUserLists).toHaveBeenCalledWith("user_1");
  });

  it("refuses a slug the payload does not hold, a bad slug or a bad sort, with no write", async () => {
    expect(await hideDiscoverCommanderAction("charlie", "fit")).toBeNull();
    for (const [slug, sort] of [["Bravo!", "fit"], [["bravo"], "fit"], ["bravo", "best"], [null, "new"]] as const) {
      expect(await hideDiscoverCommanderAction(slug, sort)).toBeNull();
    }
    expect(hideCommander).not.toHaveBeenCalled();
    expect(revalidateUserLists).not.toHaveBeenCalled();
  });

  it("refuses an id the catalog does not hold", async () => {
    isHideable.mockResolvedValue(false);
    expect(await hideDiscoverCommanderAction("alpha", "fit")).toBeNull();
    expect(hideCommander).not.toHaveBeenCalled();
  });
});
