// Home's arrivals banner (upcoming precons, plan PR 3): read inside the cached payload, only past the first-run
// return, only with PRECONS_ENABLED on, and handed to the dashboard as `arrivals`. Every other loader is
// stubbed; what is asserted is the element the page returns and whether the banner was read.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Fragment, type ReactElement } from "react";

const stub = vi.hoisted(() => ({
  env: {} as Record<string, string>,
  uniqueCards: 10,
  decks: [] as unknown[],
  arrivals: vi.fn(),
  receipt: vi.fn(),
  homeFriends: vi.fn(),
  inviteCount: vi.fn(),
  tourSeen: null as Date | null,
  loadFeed: vi.fn(),
  pool: vi.fn(async () => ({ collection: new Map() })),
  feedAfter: vi.fn(() => async () => {}),
  after: vi.fn(),
}));
vi.mock("next/server", async (orig) => ({ ...(await orig<object>()), after: stub.after }));
vi.mock("../lib/feed/home", async (orig) => ({ ...(await orig<object>()), loadHomeFeed: stub.loadFeed, homeFeedAfter: stub.feedAfter }));

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
vi.mock("../lib/recs/recommend", () => ({ loadCollectionPool: stub.pool }));
vi.mock("../lib/decks/availability-query", () => ({ loadAvailability: async () => new Map() }));
vi.mock("../lib/commanders/in-use", () => ({ receiptCountsByCommander: () => new Map() }));
vi.mock("../lib/home/commitments", () => ({ commitmentFigures: () => null }));
vi.mock("../lib/precons/banner", () => ({ loadArrivalsBanner: stub.arrivals }));
vi.mock("../lib/precons/pick-receipt-read", () => ({ readPickReceipt: stub.receipt }));
vi.mock("../lib/social/home-friends", () => ({ loadHomeFriends: stub.homeFriends }));
vi.mock("../lib/invites/read", () => ({ loadInviteCount: stub.inviteCount }));
vi.mock("../lib/discovery/tour", async (orig) => ({
  ...(await orig<object>()),
  readTourSeen: async () => stub.tourSeen,
}));

const { default: RawHomePage } = await import("./page");
const { Dashboard } = await import("../components/home/dashboard");
const { FirstRunChecklist } = await import("../components/home/first-run");
const { PreconPickReceipt } = await import("../components/home/precon-pick-receipt");
const { HomeTour } = await import("../components/discovery/home-tour");

// A dashboard Home always ends in the tour's mount (`?tour=1`, always on): the other tests read the page itself, so this
// hands them the element before the mount. The tour's own tests call `RawHomePage`.
const HomePage: typeof RawHomePage = async (...args) => {
  const page = (await RawHomePage(...args)) as ReactElement<{ children?: ReactElement[] }>;
  const kids = page.type === Fragment ? ([] as ReactElement[]).concat(page.props.children ?? []) : [];
  return kids.length === 2 && kids[1]?.type === HomeTour ? kids[0] : page;
};
const { PushLanding } = await import("../components/push/push-landing");

const BANNER = { lines: [{ kind: "set", code: "trc", name: "Star Trek Commander", revealed: 15 }], href: "/decks/precons?sort=newest#announced", keys: ["trc"] };
const ON = { PRECONS_ENABLED: "true" };

beforeEach(() => {
  stub.env = { ...ON };
  stub.uniqueCards = 10;
  stub.decks = [];
  stub.arrivals.mockReset();
  stub.arrivals.mockResolvedValue(BANNER);
  stub.receipt.mockReset();
  stub.homeFriends.mockReset();
  stub.inviteCount.mockReset();
  stub.loadFeed.mockReset();
  stub.pool.mockClear();
  stub.feedAfter.mockClear();
  stub.after.mockReset();
});

describe("Home's arrivals banner", () => {
  it("hands the dashboard the banner the load read, with the switch on", async () => {
    const page = (await HomePage()) as ReactElement<{ arrivals: unknown }>;
    expect(page.type).toBe(Dashboard);
    expect(page.props.arrivals).toEqual(BANNER);
    expect(stub.arrivals).toHaveBeenCalledWith("user_1", expect.any(Date));
  });

  it("neither reads nor draws it with Precons off", async () => {
    stub.env = {};
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
  const LINE = { ...ON, COLLECTION_EDIT_ENABLED: "true" };
  const visit = async (query: Record<string, string>) =>
    (await HomePage({ searchParams: Promise.resolve(query) })) as ReactElement<{ children: ReactElement[] }>;

  it("reads the claim from the ledger and draws the strip over the dashboard, with collection editing on", async () => {
    stub.env = LINE;
    stub.receipt.mockResolvedValue(RECEIPT);
    const page = await visit({ precons: "e1" });
    expect(stub.receipt).toHaveBeenCalledWith("user_1", "e1");
    expect(page.props.children[0].type).toBe(PreconPickReceipt);
    expect(page.props.children[1].type).toBe(Dashboard);
  });

  it("reads no receipt with precons off, collection editing on", async () => {
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
  const LINE = { COLLECTION_EDIT_ENABLED: "true" };
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

  it("hands first run no group with collection editing off", async () => {
    stub.uniqueCards = 0;
    const offs: Record<string, string>[] = [{ PRECONS_ENABLED: "true" }, {}];
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

describe("The first-run checklist's Friends row (Discovery R3·3)", () => {
  const FRIENDS = {
    you: null,
    friends: [{ publicId: "pub-colin", displayName: "Colin", commander: null }],
    links: [{ token: "t1", createdAt: new Date("2026-10-16T00:00:00Z"), expiresAt: new Date("2026-10-23T00:00:00Z") }],
  };
  type Row = { friends: unknown[]; links: unknown[]; now: string; invites: unknown } | null;
  const visit = async () => (await HomePage({ searchParams: Promise.resolve({}) })) as ReactElement<{ friends?: Row }>;

  it("hands first run the friends and links read per request, with SOCIAL_FRIENDS_ENABLED on", async () => {
    stub.uniqueCards = 0;
    stub.env = { SOCIAL_FRIENDS_ENABLED: "true" };
    stub.homeFriends.mockResolvedValue(FRIENDS);
    const page = await visit();
    expect(page.type).toBe(FirstRunChecklist);
    expect(stub.homeFriends).toHaveBeenCalledWith("user_1", expect.any(Date));
    expect(page.props.friends).toMatchObject({ friends: FRIENDS.friends, links: FRIENDS.links, invites: null });
    expect(typeof page.props.friends?.now).toBe("string");
    // Invites off: no count is read, and the row's press makes a link.
    expect(stub.inviteCount).not.toHaveBeenCalled();
  });

  it("hands first run the invite count with SOCIAL_INVITES_ENABLED on (addendum G4), and none when it cannot be read", async () => {
    stub.uniqueCards = 0;
    stub.env = { SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_INVITES_ENABLED: "true" };
    stub.homeFriends.mockResolvedValue(FRIENDS);
    const count = { left: 3, waiting: 0, liveQr: false, qrUntil: null, out: false };
    stub.inviteCount.mockResolvedValue(count);
    expect((await visit()).props.friends?.invites).toBe(count);
    stub.inviteCount.mockRejectedValue(new Error("down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await visit()).props.friends?.invites).toBeNull();
    warn.mockRestore();
  });

  it("draws no row with the switch off, and reads nothing", async () => {
    stub.uniqueCards = 0;
    stub.env = {};
    const page = await visit();
    expect(page.type).toBe(FirstRunChecklist);
    expect(page.props.friends).toBeNull();
    expect(stub.homeFriends).not.toHaveBeenCalled();
  });

  it("draws no row when the read fails", async () => {
    stub.uniqueCards = 0;
    stub.env = { SOCIAL_FRIENDS_ENABLED: "true" };
    stub.homeFriends.mockRejectedValue(new Error("down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const page = await visit();
    err.mockRestore();
    expect(page.type).toBe(FirstRunChecklist);
    expect(page.props.friends).toBeNull();
  });
});

describe("The tour taken again (Discovery R3·2)", () => {
  type Tourish = ReactElement<{ tour?: boolean; children?: ReactElement[] }>;
  const visit = async () => (await RawHomePage({ searchParams: Promise.resolve({ tour: "1" }) })) as Tourish;
  const tourIn = (page: Tourish) =>
    ([] as ReactElement[]).concat(page.props.children ?? []).find((c) => c?.type === HomeTour) as ReactElement<{ due: boolean; mode: string; precons: boolean }> | undefined;

  beforeEach(() => {
    stub.tourSeen = new Date("2026-10-16T00:00:00Z");
  });

  it("mounts the dashboard's tour, never due", async () => {
    const page = await visit();
    const tour = tourIn(page);
    expect(tour?.props).toEqual({ due: false, mode: "dashboard", precons: false });
  });

  it("lets a first-run Home whose tour is spent take it again", async () => {
    stub.uniqueCards = 0;
    stub.decks = [];
    const page = await visit();
    expect(page.type).toBe(FirstRunChecklist);
    expect(page.props.tour).toBe(false);
  });
});

describe("Home's feed visit writes (menu and Home PR 6)", () => {
  it("schedules the seen write after a feed that loaded", async () => {
    stub.env = { ...ON, HOME_FEED_ENABLED: "true" };
    stub.loadFeed.mockResolvedValue({ chosen: true, items: [], lead: null, total: 0 });
    await HomePage();
    expect(stub.after).toHaveBeenCalledTimes(1);
  });

  it("schedules none when the feed could not be read: the cursor must not clear what was never drawn", async () => {
    stub.env = { ...ON, HOME_FEED_ENABLED: "true" };
    stub.loadFeed.mockRejectedValue(new Error("catalog lookup failed"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await HomePage();
    err.mockRestore();
    expect(stub.after).not.toHaveBeenCalled();
  });

  it("schedules none with the feed off", async () => {
    await HomePage();
    expect(stub.after).not.toHaveBeenCalled();
  });

  it("loads the collection's scoring pool only when Ready to build is drawn, which the feed replaces", async () => {
    await HomePage();
    expect(stub.pool).toHaveBeenCalledTimes(1);
    stub.pool.mockClear();
    stub.env = { ...ON, HOME_FEED_ENABLED: "true" };
    stub.loadFeed.mockResolvedValue({ chosen: true, items: [], lead: null, total: 0 });
    await HomePage();
    expect(stub.pool).not.toHaveBeenCalled();
  });
});

describe("Home with push (push PR 5)", () => {
  const PUSH = { ...ON, HOME_FEED_ENABLED: "true", PUSH_ENABLED: "true" };
  const FEED = { chosen: true, items: [], lead: null, unseen: 0, on: [] };

  it("hands the dashboard push when the switch is on and the feed was read", async () => {
    stub.env = { ...PUSH };
    stub.loadFeed.mockResolvedValue(FEED);
    const page = (await HomePage()) as ReactElement<{ pushVisit?: string | null }>;
    expect(page.type).toBe(Dashboard);
    expect(page.props.pushVisit).toEqual(expect.any(String));
  });

  it("hands it no push with the switch off, with the feed off, or after a failed feed read", async () => {
    stub.loadFeed.mockResolvedValue(FEED);
    stub.env = { ...PUSH, PUSH_ENABLED: "" };
    expect(((await HomePage()) as ReactElement<{ pushVisit?: string | null }>).props.pushVisit).toBeNull();
    stub.env = { ...ON, PUSH_ENABLED: "true" };
    expect(((await HomePage()) as ReactElement<{ pushVisit?: string | null }>).props.pushVisit).toBeNull();
    stub.env = { ...PUSH };
    stub.loadFeed.mockRejectedValue(new Error("feed read failed"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const page = (await HomePage()) as ReactElement<{ pushVisit?: string | null }>;
    err.mockRestore();
    expect(page.props.pushVisit).toBeNull();
  });

  it("mounts the landing beside a first-run checklist with push on, and nothing with it off", async () => {
    stub.uniqueCards = 0;
    stub.env = { ...PUSH };
    const on = (await HomePage()) as ReactElement<{ children: ReactElement[] }>;
    expect(on.props.children.map((c) => c.type)).toEqual([FirstRunChecklist, PushLanding]);
    stub.env = { ...PUSH, PUSH_ENABLED: "" };
    expect(((await HomePage()) as ReactElement).type).toBe(FirstRunChecklist);
  });
});
