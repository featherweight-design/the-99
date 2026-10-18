// Change deck (Rule 0 plan PR 7b; boards S3, W3): every own deck, the seated one first, then nearest the table, then
// the ones not in the read; a press seats it through the swap; the seated row closes; a short deck is pressable.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ load: vi.fn(), swap: vi.fn() }));
vi.mock("../../app/friends/table/actions", () => ({ loadDeckChoicesAction: m.load }));

import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { orderChoices, type DeckChoice } from "../../lib/social/rule-zero-table";
import { ChangeDeck } from "./change-deck";
import { SwapContext } from "./swap";

const s = ruleZeroCopy.swap;
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const choice = (deckId: string, name: string, o: Partial<DeckChoice> = {}): DeckChoice => ({
  deckId, name, commanderName: `${name} commander`, artCropUri: null, seated: false, ready: { permits: [3], answered: null }, cards: 100, ...o,
});
const CHOICES = [
  choice("z", "Zimone Combo", { seated: true, ready: { permits: [4], answered: null } }),
  choice("s", "Sai Thopters"),
  choice("t", "Temur Pile", { ready: null, cards: 94 }),
];

function open() {
  m.load.mockResolvedValue(CHOICES);
  render(
    <SwapContext.Provider value={{ offer: [], middle: null, busy: false, swap: m.swap }}>
      <ChangeDeck tableId="t1" />
    </SwapContext.Provider>,
  );
  return act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck })));
}

describe("Change deck's order (D1)", () => {
  it("puts the seated deck first, then the read decks nearest the middle, then the rest by G8", () => {
    const row = (id: string, o: { seated?: boolean; distance?: number | null; lastPlayed?: number; lastEdited?: number }) => ({
      id, seated: false, distance: null, lastPlayed: -Infinity, lastEdited: 0, ...o,
    });
    const ordered = orderChoices([
      row("unread-old", { lastEdited: 1 }),
      row("far", { distance: 1, lastPlayed: 9 }),
      row("seated", { seated: true, distance: 2 }),
      row("near-old", { distance: 0, lastPlayed: 1 }),
      row("near-new", { distance: 0, lastPlayed: 5 }),
      row("unread-played", { lastPlayed: 3 }),
    ]);
    expect(ordered.map((r) => r.id)).toEqual(["seated", "near-new", "near-old", "far", "unread-played", "unread-old"]);
  });
});

describe("Change deck (S3, W3)", () => {
  it("lists every own deck as read, the seated one marked, a short one as not read yet", async () => {
    await open();
    expect(m.load).toHaveBeenCalledWith("t1");
    const list = screen.getByRole("list", { name: s.decksList });
    const rows = within(list).getAllByRole("button");
    expect(rows.map((r) => r.textContent?.replace(/\s+/g, " "))).toEqual([
      expect.stringContaining("Zimone Combo"),
      expect.stringContaining("Sai Thopters"),
      expect.stringContaining(s.notRead(94)),
    ]);
    expect(rows[0].getAttribute("aria-pressed")).toBe("true");
    expect(rows[0].textContent).toContain(s.seatedTag);
  });

  it("seats a pressed deck through the swap, a short one too, and the seated row only closes", async () => {
    const reopen = () => act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck })));
    await open();
    fireEvent.click(screen.getByText("Sai Thopters").closest("button")!);
    expect(m.swap).toHaveBeenCalledWith("s");
    expect(screen.queryByRole("list", { name: s.decksList })).toBeNull();
    await reopen();
    fireEvent.click(screen.getAllByText("Temur Pile")[0].closest("button")!);
    expect(m.swap).toHaveBeenLastCalledWith("t");
    await reopen();
    fireEvent.click(screen.getAllByText("Zimone Combo")[0].closest("button")!);
    expect(m.swap).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("list", { name: s.decksList })).toBeNull();
  });

  it("opens nothing when the seat grant has lapsed", async () => {
    m.load.mockResolvedValue(null);
    render(<ChangeDeck tableId="t1" />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck })));
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("Change deck's failures and focus", () => {
  it("says a list that did not arrive aloud, apart from a lapsed grant, and a retry clears it", async () => {
    m.load.mockRejectedValueOnce(new Error("network"));
    render(<ChangeDeck tableId="t1" />);
    const link = screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck });
    await act(async () => fireEvent.click(link));
    expect(screen.getByRole("alert").textContent).toBe(s.loadFailed);
    m.load.mockResolvedValueOnce(null);
    await act(async () => fireEvent.click(link));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("moves focus to the first row once the desktop panel is placed", async () => {
    const was = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({ matches: true, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
    });
    try {
      await open();
      const dialog = screen.getByRole("dialog");
      expect(document.activeElement).toBe(within(dialog).getAllByRole("button")[0]);
    } finally {
      Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: was });
    }
  });
});
