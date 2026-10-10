import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectionEditCopy } from "../../lib/copy/collection-edit";

const settle = vi.fn(async () => {});
vi.mock("../../app/collection/edit-actions", () => ({ settleCollectionWrite: () => settle() }));
vi.mock("./revert-confirm", () => ({
  RevertConfirm: (p: { entryId: string; title: string; when: string; onClose: () => void; onReverted: () => void }) => (
    <div role="dialog" aria-label="revert">
      <span>{`${p.entryId}|${p.title}|${p.when}`}</span>
      <button onClick={p.onClose}>close</button>
      <button onClick={p.onReverted}>reverted</button>
    </div>
  ),
}));

const { CollectionEditToast, announceEditToast, armEditToast, TOAST_MS } = await import("./edit-toast");

const c = collectionEditCopy.copies;
const r = collectionEditCopy.remove;
const removed = { entryId: "e2", removed: true, text: r.toast("Sol Ring", 5) };

const savedEvents = vi.fn();
beforeEach(() => {
  window.addEventListener("collection-edit-saved", savedEvents);
  vi.useFakeTimers({ shouldAdvanceTime: true });
  settle.mockClear();
});
afterEach(() => {
  window.removeEventListener("collection-edit-saved", savedEvents);
  savedEvents.mockClear();
  cleanup();
  vi.useRealTimers();
});

describe("the Edit copies toast", () => {
  it("draws what the host announces, with Undo, and nothing before it", () => {
    render(<CollectionEditToast />);
    expect(screen.queryByRole("status")).toBeNull();
    act(() => announceEditToast({ entryId: "e1", removed: false, text: c.saved("Sol Ring", 6) }));
    expect(screen.getByRole("status").textContent).toContain(c.saved("Sol Ring", 6));
    expect(screen.getByRole("button", { name: c.undo })).toBeTruthy();
  });

  it("survives its announcer: it is drawn by a component the page's state change never unmounts", () => {
    const { rerender } = render(<CollectionEditToast />);
    act(() => announceEditToast(removed));
    rerender(<CollectionEditToast />);
    expect(screen.getByRole("status").textContent).toContain(r.toast("Sol Ring", 5));
  });

  it("goes away after eight seconds", async () => {
    render(<CollectionEditToast />);
    act(() => announceEditToast(removed));
    act(() => armEditToast());
    await act(async () => void vi.advanceTimersByTime(TOAST_MS + 10));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not start counting until the sheet that saved has closed", async () => {
    render(<CollectionEditToast />);
    act(() => announceEditToast(removed));
    await act(async () => void vi.advanceTimersByTime(TOAST_MS * 3));
    expect(screen.getByRole("status")).toBeTruthy(); // a slow settle cannot spend the Undo window
    act(() => armEditToast());
    await act(async () => void vi.advanceTimersByTime(TOAST_MS + 10));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not spend the Undo window while another sheet has the page inert", async () => {
    const { container } = render(<CollectionEditToast />);
    act(() => announceEditToast(removed));
    act(() => armEditToast());
    container.setAttribute("inert", "");
    await act(async () => void vi.advanceTimersByTime(TOAST_MS * 3));
    expect(screen.getByRole("status")).toBeTruthy();
    container.removeAttribute("inert");
    await act(async () => void vi.advanceTimersByTime(TOAST_MS + 500));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps saying so when an Undo went through but the list could not be refreshed", async () => {
    settle.mockRejectedValue(new Error("down"));
    render(<CollectionEditToast />);
    act(() => announceEditToast(removed));
    act(() => armEditToast());
    fireEvent.click(screen.getByRole("button", { name: r.undo }));
    await act(async () => fireEvent.click(screen.getByText("reverted")));
    expect(settle).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("status").textContent).toContain(c.undoneStale);
    expect(screen.queryByRole("button", { name: r.undo })).toBeNull();
    settle.mockReset();
    settle.mockResolvedValue(undefined);
  });

  it("keeps what is left of the window across a cancelled Undo instead of starting it over", async () => {
    render(<CollectionEditToast />);
    act(() => announceEditToast(removed));
    act(() => armEditToast());
    await act(async () => void vi.advanceTimersByTime(TOAST_MS - 2000));
    fireEvent.click(screen.getByRole("button", { name: r.undo }));
    fireEvent.click(screen.getByText("close"));
    await act(async () => void vi.advanceTimersByTime(2500));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("Undo is a revert of that entry through the revert confirmation; the toast steps aside and waits", async () => {
    render(<CollectionEditToast />);
    act(() => announceEditToast(removed));
    act(() => armEditToast());
    fireEvent.click(screen.getByRole("button", { name: r.undo }));
    expect(screen.getByText(`e2|${collectionEditCopy.history.kinds.remove}|${c.undoWhen}`)).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    await act(async () => void vi.advanceTimersByTime(TOAST_MS * 2));
    fireEvent.click(screen.getByText("close"));
    expect(screen.getByRole("status")).toBeTruthy(); // cancelled: the toast is still there
    fireEvent.click(screen.getByRole("button", { name: r.undo }));
    await act(async () => fireEvent.click(screen.getByText("reverted")));
    expect(settle).toHaveBeenCalledTimes(1);
    expect(savedEvents).toHaveBeenCalledTimes(1); // the place head re-reads its totals after an Undo
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
