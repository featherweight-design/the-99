// The Games segment on /decks (game history R1c, build PR 2+3): Decks · Games · Stats, `?view=games`, a first press that
// reads in place and holds the window, and a failed first read that leaves the tiles drawn with the shared toast.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GamesPayload } from "../../lib/games/history-wire";
import { gameHistoryCopy } from "../../lib/copy/game-history";

const read = vi.hoisted(() => ({ stats: vi.fn(), games: vi.fn() }));
vi.mock("../../app/decks/lineup-actions", () => ({ readLineupStats: () => read.stats() }));
vi.mock("../../app/decks/game-history-actions", () => ({ readGameHistory: () => read.games(), loadMoreGamesAction: async () => ({ ok: false }) }));
vi.mock("../../app/decks/folder-actions", () => ({
  createFolderAction: async () => ({ ok: false }),
  moveDeckAction: async () => true,
  renameFolderAction: async () => ({ ok: false }),
  deleteFolderAction: async () => true,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/decks",
}));
vi.mock("../../app/moments-actions", () => ({ spendMomentAction: async () => {} }));

import { DecksView } from "./decks-view";
import type { DeckListItem } from "../../lib/decks/read";

const NOW = "2026-10-11T12:00:00.000Z";
const DECK = {
  id: "d1", name: "HD - Gishath", commanderName: "Gishath", commanderColorIdentity: ["W", "R", "G"], commanderImageUri: null,
  commanderArtCropUri: null, partnerName: null, partnerColorIdentity: null, folderId: null, folderName: null, statusPill: "Complete",
  bracket: null, built: 99, ownedCount: 99, toBuyCount: 0, unresolvedCount: 0, pendingChanges: 0, versionNumber: null,
  lastPlayedAt: null, lastEditedAt: new Date(NOW), lastCommittedAt: null, inUseElsewhere: 0, proxiedCount: 0, createdAt: new Date(NOW),
} as unknown as DeckListItem;
const SHOPPING = { total: { copies: 0, cents: 0, pricedCopies: 0 }, byDeck: new Map() } as never;
const LINEUP = { data: null, view: "tiles" as const, foldServer: null };
const DECK_GAMES = { id: "d1", name: "HD - Gishath", identity: ["W", "R", "G"], commanderName: "Gishath", partnerName: null, commanderPrintedName: null, commanderImageUri: null, commanderArtCropUri: null };
const PAYLOAD: GamesPayload = {
  games: [{ id: "g1", playedAt: new Date("2026-10-10T12:00:00Z"), result: "win", podSize: 4, versionNumber: null, note: null, worked: [], hurt: [], deck: DECK_GAMES, opponents: [] }],
  next: null,
  aggregates: {
    total: 1, months: [{ month: "2026-10", games: 1 }],
    summary: { games: 1, wins: 1, losses: 0, draws: 0, decks: 1, podMin: 4, podMax: 4, firstPlayedAt: new Date("2026-10-10T12:00:00Z"), lastPlayedAt: new Date("2026-10-10T12:00:00Z"), mostPlayed: null, friendWonLosses: null },
  },
};

const draw = (games: Parameters<typeof DecksView>[0]["games"], lineup: Parameters<typeof DecksView>[0]["lineup"] = LINEUP) =>
  render(<DecksView decks={[DECK]} folders={[]} shopping={SHOPPING} buildable={0} cards={0} now={NOW} lineup={lineup} games={games} />);
const tabs = () => screen.getAllByRole("tab").map((t) => t.textContent);

beforeEach(() => {
  read.stats.mockReset();
  read.games.mockReset();
  window.history.replaceState(null, "", "/decks");
});

describe("DecksView: Games on /decks", () => {
  it("draws Decks · Games · Stats, in that order, when the page offers the Games view", () => {
    draw({ data: null, failed: false });
    expect(tabs()).toEqual(["Decks", "Games", "Stats"]);
    expect(screen.getByRole("tab", { name: "Decks" }).getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector("[data-decks-games]")).toBeNull();
  });

  it("draws Decks · Stats alone without a Games view, as before", () => {
    draw(null);
    expect(tabs()).toEqual(["Decks", "Stats"]);
  });

  it("draws the Games view for ?view=games, with Games selected and the tiles gone", () => {
    window.history.replaceState(null, "", "/decks?view=games");
    draw({ data: PAYLOAD, failed: false });
    expect(document.querySelector("[data-decks-games]")).not.toBeNull();
    expect(screen.getByRole("tab", { name: "Games" }).getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector("[data-shelf-line], [data-shelf-trigger]")).toBeNull();
    expect(read.games).not.toHaveBeenCalled();
  });

  it("reads Games on the first press, flips in place, writes ?view=games, and holds the window for the visit", async () => {
    read.games.mockResolvedValue(PAYLOAD);
    draw({ data: null, failed: false });
    fireEvent.click(screen.getByRole("tab", { name: "Games" }));
    await waitFor(() => expect(document.querySelector("[data-decks-games]")).not.toBeNull());
    expect(window.location.search).toBe("?view=games");
    fireEvent.click(screen.getByRole("tab", { name: "Decks" }));
    expect(window.location.search).toBe("");
    expect(document.querySelector("[data-decks-games]")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Games" }));
    expect(document.querySelector("[data-decks-games]")).not.toBeNull();
    expect(read.games).toHaveBeenCalledTimes(1);
    // Games reads no Stats.
    expect(read.stats).not.toHaveBeenCalled();
  });

  it("marks the Games segment busy while the first read runs, leaving Decks selected and Stats alone", async () => {
    let land: (d: GamesPayload) => void = () => {};
    read.games.mockReturnValue(new Promise<GamesPayload>((r) => { land = r; }));
    draw({ data: null, failed: false });
    fireEvent.click(screen.getByRole("tab", { name: "Games" }));
    expect(screen.getByRole("tab", { name: /Games/ }).getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("tab", { name: "Stats" }).getAttribute("aria-busy")).toBeNull();
    expect(screen.getByRole("tab", { name: "Decks" }).getAttribute("aria-selected")).toBe("true");
    await act(async () => land(PAYLOAD));
    expect(document.querySelector("[data-decks-games]")).not.toBeNull();
    expect(screen.getByRole("tab", { name: "Games" }).getAttribute("aria-busy")).toBeNull();
  });

  it("leaves the tiles drawn and says so when the first read fails, and Try again asks again", async () => {
    read.games.mockResolvedValue(null);
    draw({ data: null, failed: false });
    fireEvent.click(screen.getByRole("tab", { name: "Games" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(gameHistoryCopy.failed);
    expect(document.querySelector("[data-decks-games]")).toBeNull();
    expect(screen.getByRole("tab", { name: "Decks" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: /HD - Gishath/, expanded: false })).toBeInTheDocument();
    read.games.mockResolvedValue(PAYLOAD);
    fireEvent.click(screen.getByRole("button", { name: gameHistoryCopy.retry }));
    await waitFor(() => expect(document.querySelector("[data-decks-games]")).not.toBeNull());
    expect(read.games).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says so too when the read throws", async () => {
    read.games.mockRejectedValue(new Error("down"));
    draw({ data: null, failed: false });
    fireEvent.click(screen.getByRole("tab", { name: "Games" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(gameHistoryCopy.failed);
  });

  it("draws the tiles and the toast for a page whose own read failed (?view=games)", () => {
    window.history.replaceState(null, "", "/decks?view=games");
    draw({ data: null, failed: true });
    expect(screen.getByRole("alert")).toHaveTextContent(gameHistoryCopy.failed);
    expect(screen.getByRole("button", { name: /HD - Gishath/, expanded: false })).toBeInTheDocument();
    expect(document.querySelector("[data-decks-games]")).toBeNull();
  });

  it("goes back to Decks when the address bar loses ?view=games", async () => {
    window.history.replaceState(null, "", "/decks?view=games");
    draw({ data: PAYLOAD, failed: false });
    expect(document.querySelector("[data-decks-games]")).not.toBeNull();
    act(() => { window.history.pushState(null, "", "/decks"); window.dispatchEvent(new PopStateEvent("popstate")); });
    await waitFor(() => expect(document.querySelector("[data-decks-games]")).toBeNull());
  });
});
