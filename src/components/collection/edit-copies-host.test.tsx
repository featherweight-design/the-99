import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import type { EditResult } from "./edit-copies-sheet";

const settle = vi.fn(async () => {});
vi.mock("../../app/collection/edit-actions", () => ({ settleCollectionWrite: () => settle() }));

let sheetClose: (r: EditResult) => void = () => {};
vi.mock("./add-cards-sheet", () => ({
  AddCardsSheet: (p: { mode: string; card: { name: string }; onClose: (r: EditResult) => void }) => {
    sheetClose = p.onClose;
    return <div role="dialog" aria-label={`${p.mode} ${p.card.name}`} />;
  },
}));
vi.mock("./revert-confirm", () => ({
  RevertConfirm: (p: { entryId: string; title: string; when: string; onClose: () => void; onReverted: () => void }) => (
    <div role="dialog" aria-label="revert">
      <span>{`${p.entryId}|${p.title}|${p.when}`}</span>
      <button onClick={p.onClose}>close</button>
      <button onClick={p.onReverted}>reverted</button>
    </div>
  ),
}));

const { EditCopiesHost, TOAST_MS } = await import("./edit-copies-host");

const c = collectionEditCopy.copies;
const r = collectionEditCopy.remove;
const card = { oracleId: "o", name: "Sol Ring", imageUri: null };
const onReopen = vi.fn();
const onDone = vi.fn();

function mount() {
  render(<EditCopiesHost card={card} onReopen={onReopen} onDone={onDone} />);
}
const close = (res: EditResult) => act(async () => sheetClose(res));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  settle.mockClear();
  onReopen.mockClear();
  onDone.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the Edit copies host", () => {
  it("opens the sheet in edit mode for the card", () => {
    mount();
    expect(screen.getByRole("dialog", { name: "edit Sol Ring" })).toBeTruthy();
  });

  it("hands the card straight back, with no write settled and no toast, when the sheet closes unsaved", async () => {
    mount();
    await close({ saved: null });
    expect(onReopen).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(settle).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("settles the write BEFORE the card is read again, then offers Undo on a toast", async () => {
    mount();
    const order: string[] = [];
    settle.mockImplementationOnce(async () => void order.push("settle"));
    onReopen.mockImplementationOnce(() => void order.push("reopen"));
    await close({ saved: { entryId: "e1", removed: false, total: 6, copiesRemoved: 5 } });
    expect(order).toEqual(["settle", "reopen"]);
    expect(screen.getByRole("status").textContent).toContain(c.saved("Sol Ring", 6));
    expect(screen.getByRole("button", { name: c.undo })).toBeTruthy();
  });

  it("does not reopen a card it removed, and its toast names the copies", async () => {
    mount();
    await close({ saved: { entryId: "e2", removed: true, total: 0, copiesRemoved: 5 } });
    expect(onReopen).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain(r.toast("Sol Ring", 5));
  });

  it("goes away after eight seconds", async () => {
    mount();
    await close({ saved: { entryId: "e2", removed: true, total: 0, copiesRemoved: 5 } });
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => void vi.advanceTimersByTime(TOAST_MS + 10));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("Undo is a revert of that entry through the revert confirmation, and the toast waits while it is decided", async () => {
    mount();
    await close({ saved: { entryId: "e2", removed: true, total: 0, copiesRemoved: 5 } });
    fireEvent.click(screen.getByRole("button", { name: r.undo }));
    expect(screen.getByText(`e2|${collectionEditCopy.history.kinds.remove}|${c.undoWhen}`)).toBeTruthy();
    // The toast steps aside, or it would cover the confirmation's buttons on a phone.
    expect(screen.queryByRole("status")).toBeNull();
    await act(async () => void vi.advanceTimersByTime(TOAST_MS * 2));
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("close"));
    expect(screen.getByRole("status")).toBeTruthy(); // cancelled: the toast is still there
    fireEvent.click(screen.getByRole("button", { name: r.undo }));
    await act(async () => fireEvent.click(screen.getByText("reverted")));
    expect(settle).toHaveBeenCalledTimes(2);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
