// Admin PR 6f-1: a commander page in free mode reads the free pool, whose claim model decides
// NEVER_CUT_ENABLED and CHANGE_COMMANDER_ENABLED from the env it is handed. `loadFreePool` requires that
// env (admin PR 7c-2), and the page's resolved env must be the one that reaches it (and, being memoised by
// argument, the same env the ranking above it passed, or the page pays the rollup twice). The reader's
// env and the environment hold opposite values here; the handed env is checked by identity, as a boolean.
import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  READER: { NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" } as unknown as NodeJS.ProcessEnv,
  loadFreePool: vi.fn<(...args: unknown[]) => Promise<{ oracleId: string }[]>>(async () => [{ oracleId: "card-1" }]),
  rankFree: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ ok: true, items: [{ oracleId: "cmd-1" }] })),
  scoreOneCommander: vi.fn<(...args: unknown[]) => Promise<null>>(async () => null),
}));

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  redirect: () => { throw new Error("REDIRECT"); },
}));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => m.READER }));
vi.mock("../../../lib/recs/recommend", () => ({ scoreOneCommander: m.scoreOneCommander }));
vi.mock("../../../lib/recs/free-ranking", () => ({ loadFreePool: m.loadFreePool, rankFree: m.rankFree }));
vi.mock("../../../lib/discovery/resolve-slug", () => ({
  resolveCommanderSlug: async () => ({ oracleId: "cmd-1", rank: 1, anyDegraded: false }),
}));
vi.mock("../../../lib/recs/ranked-list", () => ({ getRankedList: async () => ({ items: [] }) }));
vi.mock("../../../lib/collection/owned-printings", () => ({ resolveOwnedPrintings: vi.fn(), withOwnedCardArt: vi.fn() }));
vi.mock("../../../components/commanders/detail", () => ({ CommanderDetail: () => null }));
vi.mock("../../../lib/prose/read", () => ({ readCommanderProse: vi.fn() }));
vi.mock("./synergy-read", () => ({ readSynergyCards: vi.fn() }));
vi.mock("../../../lib/decks/availability-query", () => ({ loadAvailability: vi.fn() }));
vi.mock("../../../lib/decks/price-query", () => ({ loadPrices: vi.fn() }));
vi.mock("../../../lib/cards/chain-art", () => ({ withChainArt: vi.fn() }));
vi.mock("../../../lib/cards/opening-printing", () => ({ loadOpeningArt: vi.fn() }));

const { default: CommanderDetailPage } = await import("./page");

describe("the commander page in free mode", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reads the free pool under the reader's resolved switches, the env its ranking was handed", async () => {
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    // The score is stubbed empty, so the page ends at its not-found; the reads before it are the subject.
    await expect(CommanderDetailPage({
      params: Promise.resolve({ slug: "cmd" }),
      searchParams: Promise.resolve({ avail: "free" }),
    })).rejects.toThrow("NOT_FOUND");
    expect(m.loadFreePool).toHaveBeenCalledTimes(1);
    expect(m.loadFreePool.mock.calls[0][1] === m.READER).toBe(true);
    expect(m.rankFree.mock.calls[0][3] === m.READER).toBe(true);
    expect(m.scoreOneCommander.mock.calls[0][4] === m.READER).toBe(true);
  });
});
