// Admin PR 6f-1: a commander page in free mode ranks and scores under the reader's resolved switches (the role
// basis follows `LABEL_ROLE_COUNTS_ENABLED`), so the page's resolved env must be the one that reaches both. The
// free pool is read once. The handed env is checked by identity, as a boolean.
// Hide a commander: free mode re-ranks only the shown rows, and a hidden commander draws the canonical mode.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  READER: {} as unknown as NodeJS.ProcessEnv,
  loadFreePool: vi.fn<(...args: unknown[]) => Promise<{ oracleId: string }[]>>(async () => [{ oracleId: "card-1" }]),
  rankFree: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ ok: true, items: [{ oracleId: "cmd-1" }] })),
  scoreOneCommander: vi.fn<(...args: unknown[]) => Promise<null>>(async () => null),
  resolveCommanderSlug: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  loadHiddenIds: vi.fn<(...args: unknown[]) => Promise<string[]>>(),
  getRankedList: vi.fn<(...args: unknown[]) => Promise<{ items: { oracleId: string }[] }>>(),
}));

const shown = { oracleId: "cmd-1", rank: 1, hidden: false, anyDegraded: false };

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  // Distinct from the not-found the stubbed score ends at, so a test can tell the two apart.
  redirect: () => { throw new Error("REDIRECT"); },
}));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => m.READER }));
vi.mock("../../../lib/recs/recommend", () => ({ scoreOneCommander: m.scoreOneCommander }));
vi.mock("../../../lib/recs/free-ranking", () => ({ loadFreePool: m.loadFreePool, rankFree: m.rankFree }));
vi.mock("../../../lib/discovery/resolve-slug", () => ({
  resolveCommanderSlug: m.resolveCommanderSlug,
  rankAmongShown: vi.fn(),
}));
// The free mode reads the hidden ids to leave them out of its re-rank: a database read, mocked here.
vi.mock("../../../lib/commanders/hidden", () => ({ loadHiddenIds: m.loadHiddenIds }));
vi.mock("../../../lib/recs/ranked-list", () => ({ getRankedList: m.getRankedList }));
// The page's hidden-ids read is guarded against schema lag. The store itself reaches the database, so its
// predicate is restated here: the two Postgres codes that mean the schema is behind the code.
vi.mock("../../../lib/recs/store", () => ({
  isSchemaLagError: (err: unknown) =>
    typeof err === "object" && err !== null && ["42P01", "42703"].includes((err as { code?: string }).code ?? ""),
}));
vi.mock("../../../lib/collection/owned-printings", () => ({ resolveOwnedPrintings: vi.fn(), withOwnedCardArt: vi.fn() }));
vi.mock("../../../components/commanders/detail", () => ({ CommanderDetail: () => null }));
vi.mock("../../../lib/prose/read", () => ({ readCommanderProse: vi.fn() }));
vi.mock("./synergy-read", () => ({ readSynergyCards: vi.fn() }));
vi.mock("../../../lib/decks/availability-query", () => ({ loadAvailability: vi.fn() }));
vi.mock("../../../lib/decks/price-query", () => ({ loadPrices: vi.fn() }));
vi.mock("../../../lib/cards/chain-art", () => ({ withChainArt: vi.fn() }));
vi.mock("../../../lib/cards/opening-printing", () => ({ loadOpeningArt: vi.fn() }));

const { default: CommanderDetailPage } = await import("./page");

const open = (avail?: string) =>
  CommanderDetailPage({
    params: Promise.resolve({ slug: "cmd" }),
    searchParams: Promise.resolve(avail ? { avail } : {}),
  });

beforeEach(() => {
  m.loadFreePool.mockClear();
  m.rankFree.mockClear();
  m.scoreOneCommander.mockClear();
  m.resolveCommanderSlug.mockReset().mockResolvedValue(shown);
  m.loadHiddenIds.mockReset().mockResolvedValue([]);
  m.getRankedList.mockReset().mockResolvedValue({ items: [] });
});

describe("the commander page in free mode", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ranks and scores under the reader's resolved switches, reading the free pool once", async () => {
    // The score is stubbed empty, so the page ends at its not-found; the reads before it are the subject.
    await expect(CommanderDetailPage({
      params: Promise.resolve({ slug: "cmd" }),
      searchParams: Promise.resolve({ avail: "free" }),
    })).rejects.toThrow("NOT_FOUND");
    expect(m.loadFreePool).toHaveBeenCalledTimes(1);
    expect(m.loadFreePool.mock.calls[0]).toEqual(["user_1"]);
    expect(m.rankFree.mock.calls[0][3] === m.READER).toBe(true);
    expect(m.scoreOneCommander.mock.calls[0][4] === m.READER).toBe(true);
  });

  // The ranked list still holds hidden rows; the list the reader clicked from does not, so the free
  // re-rank is handed only the shown rows.
  it("drops the hidden ids before the free ranking", async () => {
    m.getRankedList.mockResolvedValue({ items: [{ oracleId: "hid-1" }, { oracleId: "cmd-1" }, { oracleId: "cmd-2" }] });
    m.loadHiddenIds.mockResolvedValue(["hid-1"]);
    await expect(open("free")).rejects.toThrow("NOT_FOUND");
    expect(m.rankFree).toHaveBeenCalledTimes(1);
    expect(m.rankFree.mock.calls[0][1]).toEqual([{ oracleId: "cmd-1" }, { oracleId: "cmd-2" }]);
  });

  // A deploy ahead of its migration reads as no hidden rows, not as a failed page.
  it("treats a schema-lag failure of the hidden read as none hidden", async () => {
    m.getRankedList.mockResolvedValue({ items: [{ oracleId: "cmd-1" }] });
    m.loadHiddenIds.mockRejectedValue(Object.assign(new Error("relation does not exist"), { code: "42P01" }));
    await expect(open("free")).rejects.toThrow("NOT_FOUND");
    expect(m.rankFree.mock.calls[0][1]).toEqual([{ oracleId: "cmd-1" }]);
  });

  it("still throws any other failure of the hidden read", async () => {
    m.loadHiddenIds.mockRejectedValue(new Error("db down"));
    await expect(open("free")).rejects.toThrow("db down");
    expect(m.rankFree).not.toHaveBeenCalled();
  });

  // A hidden commander has no free rank to pair a free score with, so the page draws the canonical mode.
  // Rendered, not redirected: a Hide pressed on a `?avail=free` page re-renders this route in the
  // action's response, where a redirect would navigate away.
  it("draws a hidden commander requested in free mode canonically, without redirecting", async () => {
    m.resolveCommanderSlug.mockResolvedValue({ ...shown, rank: null, hidden: true });
    await expect(open("free")).rejects.toThrow("NOT_FOUND");
    expect(m.rankFree).not.toHaveBeenCalled();
    expect(m.loadFreePool).not.toHaveBeenCalled();
    expect(m.loadHiddenIds).not.toHaveBeenCalled();
    expect(m.scoreOneCommander).toHaveBeenCalledTimes(1);
    // No free pool: the canonical score.
    expect(m.scoreOneCommander.mock.calls[0][3]).toBeUndefined();
  });
});
