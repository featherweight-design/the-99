// Home's arrivals banner (upcoming precons, plan PR 3): read inside the cached payload, only past the first-run
// return, only with UPCOMING_PRECONS_ENABLED on, and handed to the dashboard as `arrivals`. Every other loader is
// stubbed; what is asserted is the element the page returns and whether the banner was read.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const stub = vi.hoisted(() => ({
  env: {} as Record<string, string>,
  uniqueCards: 10,
  decks: [] as unknown[],
  arrivals: vi.fn(),
  receipt: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "user_1" }) }));
vi.mock("@clerk/nextjs", () => ({ SignInButton: () => null }));
vi.mock("../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env as NodeJS.ProcessEnv }));
vi.mock("../lib/cache/page-cache", () => ({
  cachePageForUser: async (_u: string, _p: string, _k: string[], load: (env: NodeJS.ProcessEnv) => Promise<{ value: unknown }>, env: NodeJS.ProcessEnv) =>
    (await load(env)).value,
}));
vi.mock("../lib/home/summary", () => ({
  getCollectionStats: async () => ({ totalCards: stub.uniqueCards, uniqueCards: stub.uniqueCards }),
  getCollectionLastUpdated: async () => null,
}));
vi.mock("../lib/decks/read", () => ({ listDecksWithStats: async () => stub.decks }));
vi.mock("../lib/recs/ranked-list", () => ({ getRankedList: async () => ({ items: [], degraded: false }) }));
vi.mock("../lib/decks/shopping-rollup", () => ({ loadShoppingRollup: async () => ({}) }));
vi.mock("../lib/recs/home-novelty", () => ({ loadUnplayedCounts: async () => null }));
vi.mock("../lib/recs/ready-to-build", () => ({ readySlice: () => ({ shown: [] }) }));
vi.mock("../lib/collection/owned-printings", () => ({ withOwnedCardArt: async () => [] }));
vi.mock("../lib/recs/recommend", () => ({ loadCollectionPool: async () => ({ collection: new Map() }) }));
vi.mock("../lib/decks/availability-query", () => ({ loadAvailability: async () => new Map() }));
vi.mock("../lib/commanders/in-use", () => ({ receiptCountsByCommander: () => new Map() }));
vi.mock("../lib/home/commitments", () => ({ commitmentFigures: () => null }));
vi.mock("../lib/precons/banner", () => ({ loadArrivalsBanner: stub.arrivals }));
vi.mock("../lib/precons/pick-receipt-read", () => ({ readPickReceipt: stub.receipt }));

const { default: HomePage } = await import("./page");
const { Dashboard } = await import("../components/home/dashboard");
const { FirstRunChecklist } = await import("../components/home/first-run");
const { PreconPickReceipt } = await import("../components/home/precon-pick-receipt");

const BANNER = { lines: [{ kind: "set", code: "trc", name: "Star Trek Commander", revealed: 15 }], href: "/decks/precons?sort=newest#announced", keys: ["trc"] };
const ON = { PRECONS_ENABLED: "true", UPCOMING_PRECONS_ENABLED: "true" };

beforeEach(() => {
  stub.env = { ...ON };
  stub.uniqueCards = 10;
  stub.decks = [];
  stub.arrivals.mockReset();
  stub.arrivals.mockResolvedValue(BANNER);
  stub.receipt.mockReset();
});

describe("Home's arrivals banner", () => {
  it("hands the dashboard the banner the load read, with the switch on", async () => {
    const page = (await HomePage()) as ReactElement<{ arrivals: unknown }>;
    expect(page.type).toBe(Dashboard);
    expect(page.props.arrivals).toEqual(BANNER);
    expect(stub.arrivals).toHaveBeenCalledWith("user_1", expect.any(Date));
  });

  it("neither reads nor draws it with the switch off", async () => {
    stub.env = { PRECONS_ENABLED: "true" };
    const page = (await HomePage()) as ReactElement<{ arrivals: unknown }>;
    expect(page.type).toBe(Dashboard);
    expect(page.props.arrivals).toBeNull();
    expect(stub.arrivals).not.toHaveBeenCalled();
  });

  it("neither reads nor draws it on the first-run checklist (H7)", async () => {
    stub.uniqueCards = 0;
    const page = (await HomePage()) as ReactElement;
    expect(page.type).toBe(FirstRunChecklist);
    expect(stub.arrivals).not.toHaveBeenCalled();
  });

  it("draws Home without it when the read gave nothing (empty, all seen, or failed)", async () => {
    stub.arrivals.mockResolvedValue(null);
    const page = (await HomePage()) as ReactElement<{ arrivals: unknown }>;
    expect(page.type).toBe(Dashboard);
    expect(page.props.arrivals).toBeNull();
  });
});

describe("Home's precon pick receipt (no-collection entry S5)", () => {
  const RECEIPT = { entryIds: ["e1"], names: ["Abzan Armor"], copies: 100, tokens: 10 };
  const LINE = { ...ON, COLLECTION_EDIT_ENABLED: "true", NO_COLLECTION_ENTRY_ENABLED: "true" };
  const visit = async (query: Record<string, string>) =>
    (await HomePage({ searchParams: Promise.resolve(query) })) as ReactElement<{ children: ReactElement[] }>;

  it("reads the claim from the ledger and draws the strip over the dashboard, with the line's switch on", async () => {
    stub.env = LINE;
    stub.receipt.mockResolvedValue(RECEIPT);
    const page = await visit({ precons: "e1" });
    expect(stub.receipt).toHaveBeenCalledWith("user_1", "e1");
    expect(page.props.children[0].type).toBe(PreconPickReceipt);
    expect(page.props.children[1].type).toBe(Dashboard);
  });

  it("reads no receipt with precons off, the line's switch on", async () => {
    stub.env = { ...LINE, PRECONS_ENABLED: "" };
    stub.receipt.mockResolvedValue(RECEIPT);
    const page = await visit({ precons: "e1" });
    expect(page.type).toBe(Dashboard);
    expect(stub.receipt).not.toHaveBeenCalled();
  });

  it("is exactly the shipped dashboard with the switch off, a claim or not", async () => {
    stub.receipt.mockResolvedValue(RECEIPT);
    const page = await visit({ precons: "e1" });
    expect(page.type).toBe(Dashboard);
    expect(stub.receipt).not.toHaveBeenCalled();
  });

  it("draws the dashboard alone when the claim reads as nothing or the read fails", async () => {
    stub.env = LINE;
    stub.receipt.mockResolvedValue(null);
    expect((await visit({ precons: "forged" })).type).toBe(Dashboard);
    stub.receipt.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await visit({ precons: "e1" })).type).toBe(Dashboard);
    expect((await visit({})).type).toBe(Dashboard);
  });
});

describe("Home's ways in at zero cards (no-collection entry S1, S12)", () => {
  const LINE = { COLLECTION_EDIT_ENABLED: "true", NO_COLLECTION_ENTRY_ENABLED: "true" };
  const visit = async () =>
    (await HomePage({ searchParams: Promise.resolve({}) })) as ReactElement<{
      ways?: { precons: boolean } | null;
      noCards?: boolean;
    }>;

  it("hands first run the ways group, with Precons I own only under PRECONS_ENABLED", async () => {
    stub.uniqueCards = 0;
    stub.env = { ...LINE, PRECONS_ENABLED: "true" };
    let page = await visit();
    expect(page.type).toBe(FirstRunChecklist);
    expect(page.props.ways).toEqual({ precons: true });
    stub.env = { ...LINE };
    page = await visit();
    expect(page.props.ways).toEqual({ precons: false });
  });

  it("hands first run no group with the line's switch off, editing on or not", async () => {
    stub.uniqueCards = 0;
    const offs: Record<string, string>[] = [{ COLLECTION_EDIT_ENABLED: "true", PRECONS_ENABLED: "true" }, { NO_COLLECTION_ENTRY_ENABLED: "true" }];
    for (const env of offs) {
      stub.env = env;
      const page = await visit();
      expect(page.type).toBe(FirstRunChecklist);
      expect(page.props.ways).toBeNull();
    }
  });

  it("marks the dashboard as having no cards when the account has decks and none, with the switch on", async () => {
    stub.uniqueCards = 0;
    stub.decks = [{ id: "d1" }];
    stub.env = { ...LINE };
    expect((await visit()).props.noCards).toBe(true);
    stub.env = {};
    expect((await visit()).props.noCards).toBe(false);
    stub.env = { ...LINE };
    stub.uniqueCards = 4;
    expect((await visit()).props.noCards).toBe(false);
  });
});

describe("Home's No decks yet door (discovery R3 E1)", () => {
  it("hands the dashboard HELP_ME_CHOOSE_ENABLED as this reader resolves it", async () => {
    stub.env = { ...ON, HELP_ME_CHOOSE_ENABLED: "true" };
    const on = (await HomePage()) as ReactElement<{ helpMeChoose?: boolean }>;
    expect(on.type).toBe(Dashboard);
    expect(on.props.helpMeChoose).toBe(true);
    stub.env = { ...ON };
    const off = (await HomePage()) as ReactElement<{ helpMeChoose?: boolean }>;
    expect(off.props.helpMeChoose).toBe(false);
  });
});
