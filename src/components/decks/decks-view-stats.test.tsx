import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { LineupData } from "../../lib/lineup/types";

const read = vi.hoisted(() => ({ stats: vi.fn() }));
vi.mock("../../app/decks/lineup-actions", () => ({ readLineupStats: () => read.stats() }));
vi.mock("../../app/decks/folder-actions", () => ({
  createFolderAction: async () => ({ ok: false }),
  moveDeckAction: async () => true,
  renameFolderAction: async () => ({ ok: false }),
  deleteFolderAction: async () => true,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

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
const STATS: LineupData = { decks: [{ id: "d1", name: "HD - Gishath", identity: ["W", "R", "G"], brew: true, bracket: null, games: [], build: null, basis: "Gishath" }], pricesAsOf: null, shared: null, cardCounts: { all: 0, finished: 0 }, collection: null };

const draw = (lineup: Parameters<typeof DecksView>[0]["lineup"]) =>
  render(<DecksView decks={[DECK]} folders={[]} shopping={SHOPPING} buildable={0} cards={0} now={NOW} lineup={lineup} />);

beforeEach(() => {
  read.stats.mockReset();
  window.history.replaceState(null, "", "/decks");
  localStorage.clear();
});

describe("DecksView: Stats on /decks", () => {
  it("draws no switch and no Stats with the switch off, whatever the URL says (P0)", () => {
    window.history.replaceState(null, "", "/decks?view=stats");
    draw(null);
    expect(screen.queryByRole("tablist", { name: "Show decks as" })).toBeNull();
    expect(document.querySelector("[data-decks-stats]")).toBeNull();
  });

  it("draws Tiles · Stats with Tiles selected beside the shelves (P1)", () => {
    draw({ data: null, view: "tiles", foldServer: null });
    const tabs = screen.getByRole("tablist", { name: "Show decks as" });
    expect(screen.getByRole("tab", { name: "Tiles" }).getAttribute("aria-selected")).toBe("true");
    expect(tabs).toBeTruthy();
    expect(document.querySelector("[data-decks-stats]")).toBeNull();
  });

  it("reads Stats on the first press, flips in place, writes ?view=stats and remembers the choice", async () => {
    read.stats.mockResolvedValue(STATS);
    draw({ data: null, view: "tiles", foldServer: null });
    fireEvent.click(screen.getByRole("tab", { name: "Stats" }));
    await waitFor(() => expect(document.querySelector("[data-decks-stats]")).not.toBeNull());
    expect(window.location.search).toBe("?view=stats");
    expect(localStorage.getItem("the99:decks:view")).toBe("stats");
    expect(document.querySelector("[data-shelf-line], [data-shelf-trigger]")).toBeNull();
    // Back to Tiles and on to Stats again reads nothing: the payload is held for the visit.
    fireEvent.click(screen.getByRole("tab", { name: "Tiles" }));
    expect(window.location.search).toBe("");
    fireEvent.click(screen.getByRole("tab", { name: "Stats" }));
    expect(document.querySelector("[data-decks-stats]")).not.toBeNull();
    expect(read.stats).toHaveBeenCalledTimes(1);
  });

  it("opens Stats from a tile's menu with that deck chosen in This deck among yours, open and focused", async () => {
    const build = (ramp: number) => ({ manaValue: 3, lands: 36, ramp, draw: 9, removal: 8, valueCents: 10_000 });
    const second = { ...DECK, id: "d2", name: "HD - Brago", commanderName: "Brago", lastPlayedAt: new Date(NOW) } as unknown as DeckListItem;
    read.stats.mockResolvedValue({
      ...STATS,
      decks: [
        { ...STATS.decks[0], build: build(10) },
        { id: "d2", name: "HD - Brago", identity: ["W", "U"], brew: false, bracket: null, games: [], build: build(12), basis: "Brago" },
      ],
    });
    render(<DecksView decks={[DECK, second]} folders={[]} shopping={SHOPPING} buildable={0} cards={0} now={NOW} lineup={{ data: null, view: "tiles", foldServer: null }} />);
    fireEvent.click(screen.getByRole("button", { name: /HD - Gishath/, expanded: false }));
    fireEvent.click(screen.getByRole("button", { name: "See it among your decks" }));
    await waitFor(() => expect(document.querySelector("[data-decks-stats]")).not.toBeNull());
    const among = document.querySelector('[data-stats-card="among"]') as HTMLElement;
    expect((among.querySelector("select") as HTMLSelectElement).value).toBe("d1");
    expect(document.activeElement).toBe(among.querySelector(":scope > button"));
    expect(window.location.search).toBe("?view=stats");
  });

  it("opens nothing and focuses the first card when there is no deck to compare", async () => {
    read.stats.mockResolvedValue(STATS);
    draw({ data: null, view: "tiles", foldServer: null });
    fireEvent.click(screen.getByRole("button", { name: /HD - Gishath/, expanded: false }));
    fireEvent.click(screen.getByRole("button", { name: "See it among your decks" }));
    await waitFor(() => expect(document.querySelector("[data-decks-stats]")).not.toBeNull());
    expect(document.querySelector('[data-stats-card="among"]')).toBeNull();
    expect(localStorage.getItem("the99:decks:stats:open") ?? "").not.toContain("among");
    expect(document.activeElement).toBe(document.querySelector("[data-stats-card] > button"));
  });

  it("draws no Stats row in a tile's menu with the switch off", () => {
    draw(null);
    fireEvent.click(screen.getByRole("button", { name: /HD - Gishath/, expanded: false }));
    expect(screen.queryByRole("button", { name: "See it among your decks" })).toBeNull();
  });

  it("remembers nothing when the first read fails, so the next visit is not sent to Stats", async () => {
    read.stats.mockRejectedValue(new Error("down"));
    draw({ data: null, view: "tiles", foldServer: null });
    fireEvent.click(screen.getByRole("tab", { name: "Stats" }));
    await waitFor(() => expect(read.stats).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector("[data-decks-stats]")).toBeNull();
    expect(localStorage.getItem("the99:decks:view")).toBeNull();
    expect(window.location.search).toBe("");
  });

  it("makes the switch one tab stop naming its panel, and an arrow moves to Stats", async () => {
    read.stats.mockResolvedValue(STATS);
    draw({ data: null, view: "tiles", foldServer: null });
    const tiles = screen.getByRole("tab", { name: "Tiles" });
    expect([tiles.tabIndex, screen.getByRole("tab", { name: "Stats" }).tabIndex]).toEqual([0, -1]);
    expect(document.getElementById(tiles.getAttribute("aria-controls")!)?.getAttribute("role")).toBe("tabpanel");
    fireEvent.keyDown(tiles, { key: "ArrowRight" });
    await waitFor(() => expect(document.querySelector("[data-decks-stats]")).not.toBeNull());
    const stats = screen.getByRole("tab", { name: "Stats" });
    expect(document.getElementById(stats.getAttribute("aria-controls")!)?.getAttribute("role")).toBe("tabpanel");
  });

  it("draws Stats when the server drew it, from ?view=stats or the remembered choice", () => {
    draw({ data: STATS, view: "stats", foldServer: null });
    expect(screen.getByRole("tab", { name: "Stats" }).getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector("[data-decks-stats]")).not.toBeNull();
  });
});
