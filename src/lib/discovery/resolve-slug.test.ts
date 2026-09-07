import { beforeEach, describe, expect, it, vi } from "vitest";

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
  loadDiscoveryPool.mockReset().mockResolvedValue({ collection: [], scored: [] });
  loadCandidateSlugRows.mockReset().mockResolvedValue([]);
});

describe("resolveCommanderSlug", () => {
  it("prefers the persisted row, and asks nothing else", async () => {
    findScoredCommander.mockResolvedValue({ oracleId: "a", rank: 4, anyDegraded: true });
    expect(await resolveCommanderSlug("user", "atraxa"))
      .toEqual({ oracleId: "a", rank: 4, anyDegraded: true });
    expect(getRankedList).not.toHaveBeenCalled();
  });

  it("falls through to the computed owned ranking on a store miss", async () => {
    getRankedList.mockResolvedValue({ items: [{ slug: "zur", oracleId: "z" }, { slug: "meren", oracleId: "m" }] });
    expect(await resolveCommanderSlug("user", "meren"))
      .toEqual({ oracleId: "m", rank: 2, anyDegraded: false });
    expect(loadCandidateSlugRows).not.toHaveBeenCalled();
  });

  it("resolves an unbuilt commander from the discovery ranking, at its fit rank", async () => {
    loadCandidateSlugRows.mockResolvedValue([
      { oracleId: "low", name: "Low", ownedSupport: 5 },
      { oracleId: "high", name: "High", ownedSupport: 90 },
    ]);
    expect(await resolveCommanderSlug("user", "low"))
      .toEqual({ oracleId: "low", rank: 2, anyDegraded: false });
  });

  it("ranks against the free pool, so the rank matches the row it was reached from", async () => {
    // The detail route carries no `avail`, and `/commanders` defaults to free.
    loadDiscoveryPool.mockResolvedValue({
      collection: [{ oracleId: "owned-committed" }, { oracleId: "owned-free" }],
      scored: [{ oracleId: "owned-free" }],
    });
    loadCandidateSlugRows.mockResolvedValue([{ oracleId: "x", name: "X", ownedSupport: 1 }]);
    await resolveCommanderSlug("user", "x");
    expect(loadDiscoveryPool).toHaveBeenCalledWith("user", "free");
    // The pool ranks, the collection draws the lane: a population wider than the
    // list's by even one owned commander would shift every slug after it.
    expect(loadCandidateSlugRows).toHaveBeenCalledWith("user", ["owned-free"], [
      "owned-committed",
      "owned-free",
    ]);
  });

  it("is null when all three miss, so the caller owns the 404", async () => {
    expect(await resolveCommanderSlug("user", "nobody")).toBeNull();
  });
});
