// /decks hands its zero state Help me choose's switch as this reader resolves it (discovery R3 E1): the boundary
// between the page and DecksZeroActions. Every loader is stubbed; what is asserted is the element the page returns.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const stub = vi.hoisted(() => ({ env: {} as Record<string, string> }));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env as NodeJS.ProcessEnv }));
vi.mock("../../lib/cache/page-cache", () => ({
  cachePageForUser: async (_u: string, _p: string, _k: string[], load: (env: NodeJS.ProcessEnv) => Promise<{ value: unknown }>, env: NodeJS.ProcessEnv) =>
    (await load(env)).value,
}));
vi.mock("../../lib/decks/read", () => ({ listDecksWithStats: async () => [] }));
vi.mock("../../lib/decks/folders", () => ({ listFolders: async () => [] }));
vi.mock("../../lib/decks/shopping-rollup", () => ({ loadShoppingRollup: async () => ({}) }));
vi.mock("../../lib/recs/ranked-list", () => ({ getRankedList: async () => null }));
vi.mock("../../lib/home/summary", () => ({ getCollectionStats: async () => ({ totalCards: 0, uniqueCards: 0 }) }));
vi.mock("../../lib/precons/summary", () => ({ readPreconSummary: async () => null }));
const lineup = vi.hoisted(() => ({ read: vi.fn(async (): Promise<unknown> => null) }));
vi.mock("../../lib/lineup/cached", () => ({ readLineupCached: lineup.read }));
const history = vi.hoisted(() => ({ load: vi.fn(async (..._a: unknown[]): Promise<unknown> => null) }));
vi.mock("../../lib/games/history", () => ({ loadGameHistory: history.load }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

const { default: DecksPage } = await import("./page");
const { DecksView } = await import("../../components/decks/decks-view");

// The page draws the landing's mount beside the view (discovery R2·3): the view is the fragment's last child.
const visit = async (searchParams: Record<string, string> = {}) => {
  const children = ((await DecksPage({ searchParams: Promise.resolve(searchParams) })) as ReactElement<{ children: ReactElement[] }>).props.children;
  return children[children.length - 1] as ReactElement<{ helpMeChoose?: boolean; lineup?: { data: unknown; view: string; foldServer: string | null } | null; games?: { data: { games: unknown[]; next: string | null; aggregates: Record<string, unknown> } | null; failed: boolean } | null }>;
};

beforeEach(() => {
  stub.env = {};
  lineup.read.mockClear();
  history.load.mockReset();
});

describe("/decks' zero-state door (discovery R3 E1)", () => {
  it("hands the view HELP_ME_CHOOSE_ENABLED on", async () => {
    stub.env = { HELP_ME_CHOOSE_ENABLED: "true" };
    const page = await visit();
    expect(page.type).toBe(DecksView);
    expect(page.props.helpMeChoose).toBe(true);
  });

  it("hands it off for anything but the switch on", async () => {
    expect((await visit()).props.helpMeChoose).toBe(false);
    stub.env = { HELP_ME_CHOOSE_ENABLED: "off" };
    expect((await visit()).props.helpMeChoose).toBe(false);
  });
});

// Stats for your decks is unconditional (its switch is retired): the page always hands the view a lineup prop, and
// reads the Stats payload for `?view=stats` alone. Every visit here has no retired switch set.
describe("/decks' lineup prop", () => {
  it("hands a bare visit the Tiles view and reads no Stats payload", async () => {
    const page = await visit();
    expect(page.props.lineup).toEqual({ data: null, view: "tiles", foldServer: null });
    expect(lineup.read).not.toHaveBeenCalled();
  });

  it("hands ?view=stats the Stats payload it loaded", async () => {
    const payload = { stats: "loaded" };
    lineup.read.mockResolvedValueOnce(payload);
    const page = await visit({ view: "stats" });
    expect(lineup.read).toHaveBeenCalledTimes(1);
    expect(page.props.lineup).toEqual({ data: payload, view: "stats", foldServer: null });
  });
});

// The cross-deck Games view (game history, build PR 2+3): read for `?view=games` alone, per request and outside the cached
// payload, and a read that throws draws the tiles with a failed flag instead of an empty history.
describe("/decks' games prop", () => {
  const FIRST = {
    games: [{ id: "g1" }],
    next: "2026-09-19 12:00:00|11111111-1111-4111-8111-111111111111",
    aggregates: { total: 1, months: [{ month: "2026-09", games: 1 }], summary: { games: 1 }, playedAgainst: { friends: [], commanders: [] } },
  };

  it("offers the Games segment on a bare visit and reads no history", async () => {
    const page = await visit();
    expect(page.props.games).toEqual({ data: null, failed: false });
    expect(history.load).not.toHaveBeenCalled();
  });

  it("reads no history for ?view=stats either", async () => {
    await visit({ view: "stats" });
    expect(history.load).not.toHaveBeenCalled();
  });

  it("hands ?view=games the first window for the signed-in reader, without the filters' options, and draws no Stats", async () => {
    history.load.mockResolvedValueOnce(FIRST);
    const page = await visit({ view: "games" });
    expect(history.load).toHaveBeenCalledTimes(1);
    expect(history.load).toHaveBeenCalledWith("user_1");
    expect(page.props.games?.failed).toBe(false);
    expect(page.props.games?.data?.games).toEqual(FIRST.games);
    expect(page.props.games?.data?.next).toBe(FIRST.next);
    expect(page.props.games?.data?.aggregates).toEqual({ total: 1, months: FIRST.aggregates.months, summary: FIRST.aggregates.summary });
    expect(page.props.lineup).toEqual({ data: null, view: "tiles", foldServer: null });
    expect(lineup.read).not.toHaveBeenCalled();
  });

  it("says the read failed, and still draws the tiles, when it throws", async () => {
    history.load.mockRejectedValueOnce(new Error("down"));
    const page = await visit({ view: "games" });
    expect(page.props.games).toEqual({ data: null, failed: true });
  });
});
