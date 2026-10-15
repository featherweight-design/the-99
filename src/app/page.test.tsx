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

const { default: HomePage } = await import("./page");
const { Dashboard } = await import("../components/home/dashboard");
const { FirstRunChecklist } = await import("../components/home/first-run");

const BANNER = { lines: [{ kind: "set", code: "trc", name: "Star Trek Commander", revealed: 15 }], href: "/decks/precons?sort=newest#announced", keys: ["trc"] };
const ON = { PRECONS_ENABLED: "true", UPCOMING_PRECONS_ENABLED: "true" };

beforeEach(() => {
  stub.env = { ...ON };
  stub.uniqueCards = 10;
  stub.decks = [];
  stub.arrivals.mockReset();
  stub.arrivals.mockResolvedValue(BANNER);
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
