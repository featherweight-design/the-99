// The Games view's two server actions (game history, build PR 2+3): the first window for a press on `Games`, and the next
// window for `Show 50 more`. The viewer is the session's, never an argument; a cursor the read did not write is refused as
// the failed state rather than answered with the first window again; later windows carry no aggregates.
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: "user_1" as string | null,
  load: vi.fn<(viewerId: string, opts?: { cursor?: string | null; filter?: unknown }) => Promise<unknown>>(),
}));
vi.mock("../../lib/auth", () => ({
  requireUserId: async () => {
    if (!state.user) throw new Error("unauthenticated");
    return state.user;
  },
}));
vi.mock("../../lib/games/history", () => ({ loadGameHistory: (viewerId: string, opts?: { cursor?: string | null; filter?: unknown }) => state.load(viewerId, opts) }));

const { loadMoreGamesAction, readGameHistory } = await import("./game-history-actions");

const CURSOR = "2026-09-19 12:00:00.123456|11111111-1111-4111-8111-111111111111";
const FIRST = {
  games: [{ id: "g1" }],
  next: CURSOR,
  aggregates: {
    total: 60,
    months: [{ month: "2026-09", games: 60 }],
    summary: { games: 60 },
    playedAgainst: { friends: [{ publicId: "p1" }], commanders: [] },
  },
};

beforeEach(() => {
  state.user = "user_1";
  state.load.mockReset();
});

describe("readGameHistory", () => {
  it("reads the first window for the session's user, with the filters' options, and names the filter it was read under", async () => {
    state.load.mockResolvedValue(FIRST);
    const res = await readGameHistory();
    expect(state.load).toHaveBeenCalledTimes(1);
    expect(state.load).toHaveBeenCalledWith("user_1", { filter: {} });
    expect(res).toEqual({ filter: {}, games: FIRST.games, next: CURSOR, aggregates: FIRST.aggregates });
  });

  it("reads under a filter the caller sent, keeping a string for each of the four fields and nothing else", async () => {
    state.load.mockResolvedValue(FIRST);
    const res = await readGameHistory({ deckId: "d", result: "win", viewerId: "someone_else" } as never);
    expect(state.load).toHaveBeenCalledWith("user_1", { filter: { deckId: "d", result: "win" } });
    expect(res?.filter).toEqual({ deckId: "d", result: "win" });
  });

  it("answers null when the read fails, which the view says in its toast", async () => {
    state.load.mockRejectedValue(new Error("down"));
    expect(await readGameHistory()).toBeNull();
  });

  it("refuses a signed-out caller before reading anything", async () => {
    state.user = null;
    await expect(readGameHistory()).rejects.toThrow("unauthenticated");
    expect(state.load).not.toHaveBeenCalled();
  });
});

describe("loadMoreGamesAction", () => {
  it("reads the window after the cursor for the session's user, with no aggregates", async () => {
    state.load.mockResolvedValue({ games: [{ id: "g51" }], next: null, aggregates: null });
    const res = await loadMoreGamesAction(CURSOR);
    expect(state.load).toHaveBeenCalledWith("user_1", { cursor: CURSOR, filter: {} });
    expect(res).toEqual({ ok: true, games: [{ id: "g51" }], next: null });
    expect(res).not.toHaveProperty("aggregates");
  });

  it("reads the later window under the filter the first was read with", async () => {
    state.load.mockResolvedValue({ games: [], next: null, aggregates: null });
    await loadMoreGamesAction(CURSOR, { friend: "f1" });
    expect(state.load).toHaveBeenCalledWith("user_1", { cursor: CURSOR, filter: { friend: "f1" } });
  });

  it("refuses a cursor the read did not write, instead of answering with the first window", async () => {
    for (const bad of ["", "garbage", "2026-13-45 99:99:99|11111111-1111-4111-8111-111111111111", `${CURSOR.split("|")[0]}|not-a-uuid`]) {
      expect(await loadMoreGamesAction(bad)).toEqual({ ok: false });
    }
    expect(state.load).not.toHaveBeenCalled();
  });

  it("answers the failed state when the read throws, never the error", async () => {
    state.load.mockRejectedValue(new Error("down"));
    expect(await loadMoreGamesAction(CURSOR)).toEqual({ ok: false });
  });

  it("is the session's: a signed-out caller reads nothing", async () => {
    state.user = null;
    await expect(loadMoreGamesAction(CURSOR)).rejects.toThrow("unauthenticated");
    expect(state.load).not.toHaveBeenCalled();
  });
});
