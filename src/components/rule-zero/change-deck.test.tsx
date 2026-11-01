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

describe("Change deck's press", () => {
  it("keeps its drawn 36px and takes a 44px coarse-pointer hit", async () => {
    await open();
    expect(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck })).toHaveClass("min-h-[36px]", "pointer-coarse:after:h-[max(44px,100%)]");
  });
});

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
});

function wideViewport(matches: boolean) {
  const was = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({ matches, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
  return () => Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: was });
}

describe("the seated slot (revisions 2 + 3)", () => {
  it("gives every read row a 38px slot before its chip, filled only for the seated deck", async () => {
    await open();
    const rows = within(screen.getByRole("list", { name: s.decksList })).getAllByRole("button");
    const slotOf = (row: HTMLElement) => row.querySelector<HTMLElement>(".w-\\[38px\\]");
    const seated = slotOf(rows[0])!;
    const other = slotOf(rows[1])!;
    expect(seated.textContent).toBe(s.seatedTag);
    expect(other.textContent).toBe("");
    // The slot is the chip's previous sibling, so the tag sits left of the chip and every chip ends on one edge.
    for (const slot of [seated, other]) expect(slot.nextElementSibling?.textContent).toMatch(/Optimized|Upgraded|Core|Exhibition|cEDH|Ultra/i);
    // The chip is the row's last child, so the tag cannot trail it.
    for (const [slot, row] of [[seated, rows[0]], [other, rows[1]]] as const) expect(slot.nextElementSibling).toBe(row.lastElementChild);
    // An unready row has no chip and no slot.
    expect(slotOf(rows[2])).toBeNull();
  });
});

describe("Change deck from md (a modal)", () => {
  it("opens a dialog at once on the press, loading, then holds the list", async () => {
    const restore = wideViewport(true);
    try {
      let resolve!: (v: DeckChoice[]) => void;
      m.load.mockReturnValue(new Promise<DeckChoice[]>((r) => (resolve = r)));
      render(
        <SwapContext.Provider value={{ offer: [], middle: null, busy: false, swap: m.swap }}>
          <ChangeDeck tableId="t1" />
        </SwapContext.Provider>,
      );
      await act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck })));
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText(s.sheetTitle)).toBeTruthy();
      expect(within(dialog).getByText(s.sheetSub)).toBeTruthy();
      expect(within(dialog).getByText(s.finding)).toBeTruthy();
      expect(within(dialog).queryByRole("list")).toBeNull();
      await act(async () => resolve(CHOICES));
      expect(within(screen.getByRole("dialog")).getByRole("list", { name: s.decksList })).toBeTruthy();
      expect(screen.queryByText(s.finding)).toBeNull();
    } finally {
      restore();
    }
  });

  it("says a failed load inside the modal with Try again, and the retry loads the list", async () => {
    const restore = wideViewport(true);
    try {
      m.load.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(CHOICES);
      render(
        <SwapContext.Provider value={{ offer: [], middle: null, busy: false, swap: m.swap }}>
          <ChangeDeck tableId="t1" />
        </SwapContext.Provider>,
      );
      await act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck })));
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("alert").textContent).toBe(s.loadFailed);
      await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: s.retry })));
      expect(m.load).toHaveBeenCalledTimes(2);
      expect(within(screen.getByRole("dialog")).getByRole("list", { name: s.decksList })).toBeTruthy();
      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      restore();
    }
  });

  it("closes on a pick and swaps, and closes without a swap on the seated row", async () => {
    const restore = wideViewport(true);
    try {
      m.load.mockResolvedValue(CHOICES);
      render(
        <SwapContext.Provider value={{ offer: [], middle: null, busy: false, swap: m.swap }}>
          <ChangeDeck tableId="t1" />
        </SwapContext.Provider>,
      );
      const open = () => act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck })));
      await open();
      fireEvent.click(screen.getByText("Sai Thopters").closest("button")!);
      expect(m.swap).toHaveBeenCalledWith("s");
      expect(screen.queryByRole("dialog")).toBeNull();
      await open();
      fireEvent.click(screen.getByText("Zimone Combo").closest("button")!);
      expect(m.swap).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).toBeNull();
    } finally {
      restore();
    }
  });

  it("opens nothing, and closes the loading modal, when the seat grant has lapsed", async () => {
    const restore = wideViewport(true);
    try {
      m.load.mockResolvedValue(null);
      render(<ChangeDeck tableId="t1" />);
      await act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck })));
      expect(screen.queryByRole("dialog")).toBeNull();
    } finally {
      restore();
    }
  });
});

// A viewport whose width class can change while the component is mounted.
function flippableViewport(initial: boolean) {
  const was = window.matchMedia;
  let matches = initial;
  const listeners = new Set<() => void>();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      get matches() { return matches; },
      media: query,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }),
  });
  return {
    set: (next: boolean) => { matches = next; act(() => listeners.forEach((fn) => fn())); },
    restore: () => Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: was }),
  };
}

describe("Change deck's races", () => {
  it("ignores a late answer after the modal was closed", async () => {
    const vp = flippableViewport(true);
    try {
      let resolve!: (v: DeckChoice[]) => void;
      m.load.mockReturnValue(new Promise<DeckChoice[]>((r) => (resolve = r)));
      render(<ChangeDeck tableId="t1" />);
      await act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck })));
      await act(async () => fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: s.close })));
      expect(screen.queryByRole("dialog")).toBeNull();
      await act(async () => resolve(CHOICES));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("list", { name: s.decksList })).toBeNull();
    } finally {
      vp.restore();
    }
  });

  it("does not open the phone sheet from a modal press when the viewport narrows mid-load", async () => {
    const vp = flippableViewport(true);
    try {
      let resolve!: (v: DeckChoice[]) => void;
      m.load.mockReturnValue(new Promise<DeckChoice[]>((r) => (resolve = r)));
      render(<ChangeDeck tableId="t1" />);
      await act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck })));
      expect(screen.getByRole("dialog")).toBeTruthy();
      vp.set(false);
      expect(screen.queryByRole("dialog")).toBeNull();
      await act(async () => resolve(CHOICES));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("list", { name: s.decksList })).toBeNull();
    } finally {
      vp.restore();
    }
  });
});

describe("Change deck below md (the sheet, as shipped)", () => {
  it("loads first, then opens the sheet, with no loading modal", async () => {
    let resolve!: (v: DeckChoice[]) => void;
    m.load.mockReturnValue(new Promise<DeckChoice[]>((r) => (resolve = r)));
    render(<ChangeDeck tableId="t1" />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck })));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText(s.finding)).toBeNull();
    expect(screen.getByRole("button", { name: ruleZeroCopy.seat.changeDeck }).getAttribute("aria-busy")).toBe("true");
    await act(async () => resolve(CHOICES));
    expect(screen.getByRole("list", { name: s.decksList })).toBeTruthy();
  });
});
