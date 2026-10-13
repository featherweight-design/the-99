// The rankings payload is filed only when it was counted by the basis its key names: a ranking
// counted by the classifier because the label read failed is served and never filed under the
// labels key (admin PR 6d-2, Copilot round 5).
import { describe, expect, it, vi } from "vitest";

const seen = vi.hoisted(() => ({ store: undefined as ((v: { labelFallback?: true }) => boolean) | undefined }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => ({}) as NodeJS.ProcessEnv }));
vi.mock("../../lib/home/summary", () => ({
  getCollectionStats: async () => ({ uniqueCards: 10 }),
  listRecentDecks: async () => [],
}));
vi.mock("../../lib/commanders/avail-pref", () => ({ readCommandersAvail: async () => null }));
vi.mock("../../lib/sets/lane-printed-in", () => ({
  loadCommanderPrintings: () => Promise.resolve(null),
  lanePrintedInFor: async () => null,
}));
vi.mock("../../lib/commanders/rankings", () => ({
  commanderRankingsKey: () => ["commander-rankings"],
  loadCommanderRankings: async () => ({}),
}));
vi.mock("../../lib/cache/user-lists", () => ({
  cacheForUser: async (_u: string, _k: string[], _load: unknown, opts: { store?: typeof seen.store } = {}) => {
    seen.store = opts.store;
    return { items: [], degraded: false, uniqueCardsRead: 10, candidateCount: 0, freeRanking: null, availOk: true };
  },
}));
vi.mock("./actions", () => ({ retryRecs: async () => {} }));

const { default: CommandersPage } = await import("./page");

describe("/commanders", () => {
  it("files a ranking only when it did not fall back to the classifier", async () => {
    await CommandersPage({ searchParams: Promise.resolve({}) });
    expect(seen.store).toBeTypeOf("function");
    expect(seen.store!({})).toBe(true);
    expect(seen.store!({ labelFallback: true })).toBe(false);
  });
});
