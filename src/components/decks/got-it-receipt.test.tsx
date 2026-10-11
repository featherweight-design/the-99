import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gotItCopy } from "../../lib/copy/i-got-it";
import type { ShortDeck } from "../../lib/collection/write";
import type { GotItWritten } from "./got-it-receipt";

const { previewRevert, revertCollectionEntry } = vi.hoisted(() => ({
  previewRevert: vi.fn(),
  revertCollectionEntry: vi.fn(),
}));
vi.mock("../../app/collection/history-actions", () => ({ previewRevert, revertCollectionEntry }));
vi.mock("../../app/collection/edit-actions", () => ({ settleCollectionWrite: vi.fn() }));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { GotItReceipt, receiptBody } = await import("./got-it-receipt");
const { TOAST_MS } = await import("../collection/edit-toast");

const c = gotItCopy.receipt;
const DECK = "11111111-1111-4111-8111-111111111111";
const ENTRY = "e0000000-0000-4000-8000-000000000001";
const ORACLE = "33333333-3333-4333-8333-333333333333";
const NAME = "Etali, Primal Conqueror";

const written = (over: Partial<GotItWritten> = {}): GotItWritten => ({
  entryId: ENTRY, facts: { tookCopy: [], stillNeeds: 0 }, quantity: 1, setCode: "mom", collectorNumber: "137", finish: "nonfoil",
  ...over,
});
const preview = (decks: ShortDeck[] = []) => ({ rows: [], entryRows: [], differs: false, decks, expected: { k: 1 } });
const atraxa: ShortDeck = { deckId: "d2", deckName: "HD Atraxa", oracleId: ORACLE, cardName: NAME, short: 1 };

function hostMock() {
  return { start: vi.fn(), end: vi.fn(), failedAway: vi.fn() };
}

function draw(w: GotItWritten = written(), name = NAME, opts: { failed?: boolean } = {}) {
  const host = hostMock();
  const onExpire = vi.fn();
  const ui = (h = host, ww = w) => (
    <>
      <button type="button" data-shopping-filter="">Shopping</button>
      <GotItReceipt key={ww.entryId} deckId={DECK} oracleId={ORACLE} cardName={name} written={ww} host={h} failed={opts.failed} onExpire={onExpire} />
    </>
  );
  const view = render(ui());
  // Disabled exactly while the host has a start with no end after it.
  const undoingNow = () => host.start.mock.calls.length > host.end.mock.calls.length;
  return { host, onExpire, undoingNow, ui, ...view };
}

const toast = () => document.querySelector<HTMLElement>("[data-toast]")!;
const undo = () => screen.getByRole("button", { name: c.undoAria(NAME) });
const tick = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("the receipt's forms", () => {
  it("clean: the card, ×N, then printing and finish, with History and Undo, as a status", () => {
    draw(written({ quantity: 2 }));
    const t = toast();
    expect(t).toHaveAttribute("role", "status");
    // Errata 2: the roles alone, never an explicit aria-live.
    expect(t).not.toHaveAttribute("aria-live");
    expect(t.textContent).toContain(c.added(NAME, 2));
    expect(t.textContent).toContain("MOM #137 · nonfoil");
    expect(screen.getByRole("link", { name: c.history })).toHaveAttribute("href", `/collection/history?entry=${ENTRY}`);
    expect(undo()).toBeInTheDocument();
    expect(receiptBody({ tookCopy: [], stillNeeds: 0 })).toBeNull();
  });

  it("claimed: names the older deck and what this one still needs", () => {
    draw(written({ facts: { tookCopy: [{ deckId: "d2", deckName: "HD Atraxa", copies: 1 }], stillNeeds: 1 } }));
    expect(toast().textContent).toContain(c.claimed("HD Atraxa", 1));
  });

  it("claimedMany: counts the older decks", () => {
    draw(written({ facts: { tookCopy: [{ deckId: "d2", deckName: "A", copies: 1 }, { deckId: "d3", deckName: "B", copies: 1 }], stillNeeds: 2 } }));
    expect(toast().textContent).toContain(c.claimedMany(2, 2));
  });

  it("partial: gives the remaining need", () => {
    draw(written({ facts: { tookCopy: [], stillNeeds: 2 } }));
    expect(toast().textContent).toContain(c.partial(2));
  });

  it("a retry that found the press applied: the clean form, with no sentence", () => {
    draw(written({ facts: null }));
    expect(toast().textContent).toBe(`${c.added(NAME, 1)}MOM #137 · nonfoil${c.history}${c.undo}`);
  });

  it("a commander row: the same receipt, named as its row prints it", () => {
    draw(written(), "Atraxa, Praetors' Voice");
    expect(toast().textContent).toContain(c.added("Atraxa, Praetors' Voice", 1));
    expect(screen.getByRole("button", { name: c.undoAria("Atraxa, Praetors' Voice") })).toBeInTheDocument();
  });

  it("sits in the deck page's toast slot: above the tab bar, bottom left of the deck pane from md", () => {
    draw();
    expect(toast().className).toContain("bottom-[calc(var(--tabbar-h,0px)+10px)]");
    expect(toast().className).toContain("md:left-[calc(var(--rail-w)+16px)]");
    expect(toast().className).toContain("md:w-[440px]");
  });
});

describe("the receipt's window", () => {
  it("goes after 8 seconds", async () => {
    const { onExpire } = draw();
    await tick(TOAST_MS - 500);
    expect(onExpire).not.toHaveBeenCalled();
    await tick(600);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("holds while hovered, and counts on from where it was once the pointer leaves", async () => {
    const { onExpire } = draw();
    await tick(2000);
    fireEvent.pointerEnter(toast());
    await tick(TOAST_MS * 3);
    expect(onExpire).not.toHaveBeenCalled();
    fireEvent.pointerLeave(toast());
    await tick(TOAST_MS - 2000 - 500);
    expect(onExpire).not.toHaveBeenCalled();
    await tick(800);
    expect(onExpire).toHaveBeenCalled();
  });

  it("holds while focus is inside it", async () => {
    const { onExpire } = draw();
    act(() => screen.getByRole("link", { name: c.history }).focus());
    await tick(TOAST_MS * 3);
    expect(onExpire).not.toHaveBeenCalled();
    act(() => screen.getByRole("button", { name: "Shopping" }).focus());
    await tick(TOAST_MS + 300);
    expect(onExpire).toHaveBeenCalled();
  });

  it("a settled undo ends the focus hold but leaves a resting pointer's hold standing", async () => {
    previewRevert.mockResolvedValue(preview());
    revertCollectionEntry.mockResolvedValue({ reverted: { id: "r1" } });
    const { onExpire } = draw();
    fireEvent.pointerEnter(toast());
    act(() => undo().focus());
    await act(async () => fireEvent.click(undo()));
    expect(toast().textContent).toBe(c.undoneElsewhere(NAME));
    await tick(TOAST_MS * 3);
    expect(onExpire).not.toHaveBeenCalled();
    fireEvent.pointerLeave(toast());
    await tick(TOAST_MS + 300);
    expect(onExpire).toHaveBeenCalled();
  });

  it("entering the warning drops the hover hold: the frame unmounts with no pointerleave", async () => {
    previewRevert.mockResolvedValue(preview([atraxa]));
    const { onExpire } = draw();
    fireEvent.pointerEnter(toast());
    await act(async () => fireEvent.click(undo()));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cancel" })));
    // Cancel hands focus back to Undo; take it away, so only a hover could hold the toast now.
    await tick(50);
    act(() => screen.getByRole("button", { name: "Shopping" }).focus());
    // Back, with no pointer over it: the window counts again.
    await tick(TOAST_MS + 300);
    expect(onExpire).toHaveBeenCalled();
  });

  it("holds while an undo is in flight", async () => {
    previewRevert.mockReturnValue(new Promise(() => {}));
    const { onExpire } = draw();
    await act(async () => fireEvent.click(undo()));
    await tick(TOAST_MS * 3);
    expect(onExpire).not.toHaveBeenCalled();
  });
});

describe("Undo", () => {
  it("reads Checking decks… from the first frame, keeps focus, steps History aside, and disables the tag", async () => {
    previewRevert.mockReturnValue(new Promise(() => {}));
    const { undoingNow } = draw();
    const button = undo();
    act(() => button.focus());
    await act(async () => fireEvent.click(button));
    expect(button.textContent).toBe(c.checking);
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveFocus();
    expect(screen.queryByRole("link", { name: c.history })).toBeNull();
    // Only the toast's undo leaves the source deck out of the check (call B).
    expect(previewRevert).toHaveBeenCalledWith(ENTRY, DECK);
    expect(undoingNow()).toBe(true);
  });

  it("goes straight through when no other deck would be short: in flight, then done", async () => {
    previewRevert.mockResolvedValue(preview());
    let resolve!: (v: unknown) => void;
    revertCollectionEntry.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { undoingNow } = draw();
    await act(async () => fireEvent.click(undo()));
    expect(screen.getByRole("button", { name: c.undoing })).toBeInTheDocument();
    const [entryId, actionId, expected, confirmShort, ignore] = revertCollectionEntry.mock.calls[0];
    expect([entryId, expected, confirmShort, ignore]).toEqual([ENTRY, { k: 1 }, undefined, DECK]);
    expect(actionId).toMatch(/^[0-9a-f-]{36}$/);
    await act(async () => resolve({ reverted: { id: "r1" } }));
    // What the revert did, true whatever the list then shows.
    expect(toast().textContent).toBe(c.undoneElsewhere(NAME));
    expect(undoingNow()).toBe(false);
    // The revert action invalidated the page itself.
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).toHaveAccessibleName("Shopping");
  });

  it("a row that stayed gets the same done message", async () => {
    previewRevert.mockResolvedValue(preview());
    revertCollectionEntry.mockResolvedValue({ reverted: { id: "r1" } });
    draw(written({ facts: { tookCopy: [], stillNeeds: 1 } }));
    await act(async () => fireEvent.click(undo()));
    expect(toast().textContent).toBe(c.undoneElsewhere(NAME));
  });

  it("an entry already reverted reads as undone (audit finding 2)", async () => {
    previewRevert.mockResolvedValue({ alreadyReverted: true });
    draw();
    await act(async () => fireEvent.click(undo()));
    expect(toast().textContent).toBe(c.undoneElsewhere(NAME));
    expect(revertCollectionEntry).not.toHaveBeenCalled();
    // Nothing was written, so nothing invalidated: the list is re-read here (C7).
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("a revert answered alreadyReverted re-reads the list too", async () => {
    previewRevert.mockResolvedValue(preview());
    revertCollectionEntry.mockResolvedValue({ alreadyReverted: true });
    draw();
    await act(async () => fireEvent.click(undo()));
    expect(toast().textContent).toBe(c.undoneElsewhere(NAME));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("raises §E with the undo verb when another deck would be short, Cancel focused, then writes with it confirmed", async () => {
    previewRevert.mockResolvedValue(preview([atraxa]));
    revertCollectionEntry.mockResolvedValue({ reverted: { id: "r1" } });
    const { undoingNow } = draw();
    await act(async () => fireEvent.click(undo()));
    const dialog = screen.getByRole("dialog", { name: gotItCopy.shortWarning.titleUndo(1) });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    // The toast steps aside under the warning, its tag still disabled.
    expect(document.querySelector("[data-toast]")).toBeNull();
    expect(undoingNow()).toBe(true);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: gotItCopy.shortWarning.confirmUndo })));
    expect(revertCollectionEntry).toHaveBeenCalledWith(ENTRY, expect.any(String), { k: 1 }, [atraxa], DECK);
    expect(toast().textContent).toBe(c.undoneElsewhere(NAME));
  });

  it("cancelling the warning writes nothing and gives the toast back with Undo", async () => {
    previewRevert.mockResolvedValue(preview([atraxa]));
    const { undoingNow } = draw();
    await act(async () => fireEvent.click(undo()));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cancel" })));
    expect(revertCollectionEntry).not.toHaveBeenCalled();
    expect(undo()).toBeInTheDocument();
    expect(undoingNow()).toBe(false);
  });

  it("failed: Undo is withdrawn and the toast points to History, as an alert", async () => {
    previewRevert.mockResolvedValue(preview());
    revertCollectionEntry.mockRejectedValue(new Error("down"));
    draw();
    await act(async () => fireEvent.click(undo()));
    const t = toast();
    expect(t).toHaveAttribute("role", "alert");
    expect(t).not.toHaveAttribute("aria-live");
    expect(t.textContent).toContain(c.undoFailed);
    expect(t.textContent).toContain(c.undoFailedBody);
    expect(screen.queryByRole("button", { name: c.undoAria(NAME) })).toBeNull();
    expect(screen.getByRole("link", { name: c.openHistory })).toHaveAttribute("href", `/collection/history?entry=${ENTRY}`);
  });

  it("an entry that is gone fails the same way", async () => {
    previewRevert.mockResolvedValue({ notFound: true });
    draw();
    await act(async () => fireEvent.click(undo()));
    expect(toast()).toHaveAttribute("role", "alert");
  });

  it("outlives its toast: a newer write replaces it mid-undo, the tag stays disabled, and a failure is handed up", async () => {
    previewRevert.mockResolvedValue(preview());
    let reject!: (e: unknown) => void;
    revertCollectionEntry.mockReturnValue(new Promise((_, r) => { reject = r; }));
    const { host, undoingNow, ui, rerender } = draw();
    await act(async () => fireEvent.click(undo()));
    expect(undoingNow()).toBe(true);
    // The next write's receipt replaces this one while the revert is out.
    rerender(ui(hostMock(), written({ entryId: "e0000000-0000-4000-8000-000000000002" })));
    expect(undoingNow()).toBe(true);
    await act(async () => reject(new Error("down")));
    expect(undoingNow()).toBe(false);
    expect(host.failedAway).toHaveBeenCalledTimes(1);
  });

  it("a warning closed with its replaced toast ends the undo: nothing was written", async () => {
    previewRevert.mockResolvedValue(preview([atraxa]));
    const { undoingNow, ui, rerender } = draw();
    await act(async () => fireEvent.click(undo()));
    expect(undoingNow()).toBe(true);
    rerender(ui(hostMock(), written({ entryId: "e0000000-0000-4000-8000-000000000002" })));
    expect(undoingNow()).toBe(false);
    expect(revertCollectionEntry).not.toHaveBeenCalled();
  });

  it("drawn straight in the failed form when the provider brings a replaced receipt back", () => {
    draw(written(), NAME, { failed: true });
    expect(toast()).toHaveAttribute("role", "alert");
    expect(screen.getByRole("link", { name: c.openHistory })).toBeInTheDocument();
  });
});
