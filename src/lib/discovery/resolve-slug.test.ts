import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW } from "@/test/env-view";

const { findScoredCommander, getRankedList, loadDiscoveryPool, loadCandidateSlugRows, loadHiddenIds } =
  vi.hoisted(() => ({
    findScoredCommander: vi.fn(),
    getRankedList: vi.fn(),
    loadDiscoveryPool: vi.fn(),
    loadCandidateSlugRows: vi.fn(),
    loadHiddenIds: vi.fn(),
  }));

vi.mock("../recs/store", () => ({ findScoredCommander }));
vi.mock("../recs/ranked-list", () => ({ getRankedList }));
vi.mock("./list", () => ({ loadDiscoveryPool }));
vi.mock("./candidates", () => ({ loadCandidateSlugRows }));
// The hidden ids are a database read: mocked so no case here reaches one.
vi.mock("../commanders/hidden", () => ({ loadHiddenIds }));

const { resolveCommanderSlug } = await import("./resolve-slug");

beforeEach(() => {
  findScoredCommander.mockReset().mockResolvedValue(null);
  getRankedList.mockReset().mockResolvedValue({ items: [] });
  loadDiscoveryPool.mockReset().mockResolvedValue({ collection: [] });
  loadCandidateSlugRows.mockReset().mockResolvedValue([]);
  loadHiddenIds.mockReset().mockResolvedValue([]);
});

describe("resolveCommanderSlug", () => {
  it("prefers the persisted row, and asks nothing else", async () => {
    findScoredCommander.mockResolvedValue({ oracleId: "a", rank: 4, hidden: false, anyDegraded: true });
    expect(await resolveCommanderSlug("user", "atraxa", ENV_VIEW))
      .toEqual({ oracleId: "a", rank: 4, hidden: false, anyDegraded: true });
    expect(getRankedList).not.toHaveBeenCalled();
    // The store answers the hidden flag itself, so a hit reads no hidden ids.
    expect(loadHiddenIds).not.toHaveBeenCalled();
  });

  it("falls through to the computed owned ranking on a store miss", async () => {
    getRankedList.mockResolvedValue({ items: [{ slug: "zur", oracleId: "z" }, { slug: "meren", oracleId: "m" }] });
    expect(await resolveCommanderSlug("user", "meren", ENV_VIEW))
      .toEqual({ oracleId: "m", rank: 2, hidden: false, anyDegraded: false });
    expect(loadCandidateSlugRows).not.toHaveBeenCalled();
  });

  it("does not count a hidden commander ahead of the target in the owned ranking", async () => {
    getRankedList.mockResolvedValue({
      items: [{ slug: "zur", oracleId: "z" }, { slug: "kess", oracleId: "k" }, { slug: "meren", oracleId: "m" }],
    });
    loadHiddenIds.mockResolvedValue(["z"]);
    expect(await resolveCommanderSlug("user", "meren", ENV_VIEW))
      .toEqual({ oracleId: "m", rank: 2, hidden: false, anyDegraded: false });
  });

  it("resolves a hidden commander from the owned ranking, with no rank", async () => {
    getRankedList.mockResolvedValue({ items: [{ slug: "zur", oracleId: "z" }, { slug: "meren", oracleId: "m" }] });
    loadHiddenIds.mockResolvedValue(["m"]);
    expect(await resolveCommanderSlug("user", "meren", ENV_VIEW))
      .toEqual({ oracleId: "m", rank: null, hidden: true, anyDegraded: false });
  });

  it("resolves an unbuilt commander from the discovery ranking, at its fit rank", async () => {
    loadCandidateSlugRows.mockResolvedValue([
      { oracleId: "low", name: "Low", ownedSupport: 5 },
      { oracleId: "high", name: "High", ownedSupport: 90 },
    ]);
    expect(await resolveCommanderSlug("user", "low", ENV_VIEW))
      .toEqual({ oracleId: "low", rank: 2, hidden: false, anyDegraded: false });
  });

  it("does not count a hidden commander ahead of the target in the discovery ranking", async () => {
    loadCandidateSlugRows.mockResolvedValue([
      { oracleId: "low", name: "Low", ownedSupport: 5 },
      { oracleId: "high", name: "High", ownedSupport: 90 },
    ]);
    loadHiddenIds.mockResolvedValue(["high"]);
    expect(await resolveCommanderSlug("user", "low", ENV_VIEW))
      .toEqual({ oracleId: "low", rank: 1, hidden: false, anyDegraded: false });
  });

  it("resolves a hidden commander from the discovery ranking, with no rank", async () => {
    loadCandidateSlugRows.mockResolvedValue([
      { oracleId: "low", name: "Low", ownedSupport: 5 },
      { oracleId: "high", name: "High", ownedSupport: 90 },
    ]);
    loadHiddenIds.mockResolvedValue(["low"]);
    expect(await resolveCommanderSlug("user", "low", ENV_VIEW))
      .toEqual({ oracleId: "low", rank: null, hidden: true, anyDegraded: false });
    // Read once for both fallbacks.
    expect(loadHiddenIds).toHaveBeenCalledTimes(1);
  });

  it("ranks against the whole collection, so the rank matches the row it was reached from", async () => {
    // Was pinned against the free pool, which the discover lane no longer has:
    // it scores everything owned, and a resolver scoring anything narrower
    // renumbers the list it is resolving into.
    loadDiscoveryPool.mockResolvedValue({
      collection: [{ oracleId: "owned-committed" }, { oracleId: "owned-free" }],
    });
    loadCandidateSlugRows.mockResolvedValue([{ oracleId: "x", name: "X", ownedSupport: 1 }]);
    await resolveCommanderSlug("user", "x", ENV_VIEW);
    expect(loadDiscoveryPool).toHaveBeenCalledTimes(1);
    expect(loadDiscoveryPool.mock.calls[0]).toEqual(["user"]);
    expect(loadCandidateSlugRows).toHaveBeenCalledWith("user", [
      "owned-committed",
      "owned-free",
    ]);
  });

  it("is null when all three miss, so the caller owns the 404", async () => {
    expect(await resolveCommanderSlug("user", "nobody", ENV_VIEW)).toBeNull();
  });
});
