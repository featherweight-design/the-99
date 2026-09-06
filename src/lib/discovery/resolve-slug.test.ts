import { beforeEach, describe, expect, it, vi } from "vitest";

const { findScoredCommander, getRankedList, loadCollectionPool, loadCandidateSlugRows } =
  vi.hoisted(() => ({
    findScoredCommander: vi.fn(),
    getRankedList: vi.fn(),
    loadCollectionPool: vi.fn(),
    loadCandidateSlugRows: vi.fn(),
  }));

vi.mock("../recs/store", () => ({ findScoredCommander }));
vi.mock("../recs/ranked-list", () => ({ getRankedList }));
vi.mock("../recs/recommend", () => ({ loadCollectionPool }));
vi.mock("./candidates", () => ({ loadCandidateSlugRows }));

const { resolveCommanderSlug } = await import("./resolve-slug");

beforeEach(() => {
  findScoredCommander.mockReset().mockResolvedValue(null);
  getRankedList.mockReset().mockResolvedValue({ items: [] });
  loadCollectionPool.mockReset().mockResolvedValue({ collection: [] });
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

  it("is null when all three miss, so the caller owns the 404", async () => {
    expect(await resolveCommanderSlug("user", "nobody")).toBeNull();
  });
});
