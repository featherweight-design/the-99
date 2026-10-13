import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

const { findScoredCommander, getRankedList, loadDiscoveryPool, loadCandidateSlugRows } =
  vi.hoisted(() => ({
    findScoredCommander: vi.fn(),
    getRankedList: vi.fn(),
    loadDiscoveryPool: vi.fn(),
    loadCandidateSlugRows: vi.fn(),
  }));

vi.mock("../recs/store", () => ({ findScoredCommander }));
vi.mock("../recs/ranked-list", () => ({ getRankedList }));
vi.mock("./list", () => ({ loadDiscoveryPool }));
vi.mock("./candidates", () => ({ loadCandidateSlugRows }));

const { resolveCommanderSlug } = await import("./resolve-slug");

beforeEach(() => {
  findScoredCommander.mockReset().mockResolvedValue(null);
  getRankedList.mockReset().mockResolvedValue({ items: [] });
  loadDiscoveryPool.mockReset().mockResolvedValue({ collection: [] });
  loadCandidateSlugRows.mockReset().mockResolvedValue([]);
});

describe("resolveCommanderSlug", () => {
  it("prefers the persisted row, and asks nothing else", async () => {
    findScoredCommander.mockResolvedValue({ oracleId: "a", rank: 4, anyDegraded: true });
    expect(await resolveCommanderSlug("user", "atraxa", ENV_VIEW))
      .toEqual({ oracleId: "a", rank: 4, anyDegraded: true });
    expect(getRankedList).not.toHaveBeenCalled();
  });

  it("falls through to the computed owned ranking on a store miss", async () => {
    getRankedList.mockResolvedValue({ items: [{ slug: "zur", oracleId: "z" }, { slug: "meren", oracleId: "m" }] });
    expect(await resolveCommanderSlug("user", "meren", ENV_VIEW))
      .toEqual({ oracleId: "m", rank: 2, anyDegraded: false });
    expect(loadCandidateSlugRows).not.toHaveBeenCalled();
  });

  it("resolves an unbuilt commander from the discovery ranking, at its fit rank", async () => {
    loadCandidateSlugRows.mockResolvedValue([
      { oracleId: "low", name: "Low", ownedSupport: 5 },
      { oracleId: "high", name: "High", ownedSupport: 90 },
    ]);
    expect(await resolveCommanderSlug("user", "low", ENV_VIEW))
      .toEqual({ oracleId: "low", rank: 2, anyDegraded: false });
  });

  it("ranks against the whole collection, so the rank matches the row it was reached from", async () => {
    // Was pinned against the free pool, which the discover lane no longer has:
    // it scores everything owned, and a resolver scoring anything narrower
    // renumbers the list it is resolving into.
    loadDiscoveryPool.mockResolvedValue({
      collection: [{ oracleId: "owned-committed" }, { oracleId: "owned-free" }],
    });
    loadCandidateSlugRows.mockResolvedValue([{ oracleId: "x", name: "X", ownedSupport: 1 }]);
    // Under the reader's resolved switches (admin PR 6f-1): the pool's claim read requires its env, and
    // the environment says the opposite here. Identity, as a boolean.
    const READER = { NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    try {
      await resolveCommanderSlug("user", "x", READER);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(loadDiscoveryPool).toHaveBeenCalledTimes(1);
    expect(loadDiscoveryPool.mock.calls[0][0]).toBe("user");
    expect(loadDiscoveryPool.mock.calls[0][1] === READER).toBe(true);
    expect(loadCandidateSlugRows).toHaveBeenCalledWith("user", [
      "owned-committed",
      "owned-free",
    ]);
  });

  it("is null when all three miss, so the caller owns the 404", async () => {
    expect(await resolveCommanderSlug("user", "nobody", ENV_VIEW)).toBeNull();
  });
});
