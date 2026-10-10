import { act, cleanup, render, screen } from "@testing-library/react";
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
const announce = vi.fn();
const arm = vi.fn();
vi.mock("./edit-toast", () => ({ announceEditToast: (t: unknown) => announce(t), armEditToast: () => arm() }));

const { EditCopiesHost } = await import("./edit-copies-host");

const c = collectionEditCopy.copies;
const r = collectionEditCopy.remove;
const card = { oracleId: "o", name: "Sol Ring", imageUri: null };
const onReopen = vi.fn();
const onDone = vi.fn();

const mount = () => render(<EditCopiesHost card={card} onReopen={onReopen} onDone={onDone} />);
const close = (res: EditResult) => act(async () => sheetClose(res));

beforeEach(() => {
  for (const f of [settle, onReopen, onDone, announce, arm]) f.mockClear();
  settle.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("the Edit copies host", () => {
  it("opens the sheet in edit mode for the card", () => {
    mount();
    expect(screen.getByRole("dialog", { name: "edit Sol Ring" })).toBeTruthy();
  });

  it("hands the card straight back, settling nothing and announcing nothing, when the sheet closes unsaved", async () => {
    mount();
    await close({ saved: null });
    expect(onReopen).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(settle).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
  });

  it("announces the toast BEFORE the write is settled, and settles before the card is read again", async () => {
    mount();
    const order: string[] = [];
    announce.mockImplementationOnce(() => void order.push("toast"));
    settle.mockImplementationOnce(async () => void order.push("settle"));
    onReopen.mockImplementationOnce(() => void order.push("reopen"));
    await close({ saved: { entryId: "e1", removed: false, total: 6, copiesRemoved: 5 } });
    expect(order).toEqual(["toast", "settle", "reopen"]);
    expect(arm).toHaveBeenCalledTimes(1); // the countdown starts once the sheet has closed
    expect(announce).toHaveBeenCalledWith({ entryId: "e1", removed: false, text: c.saved("Sol Ring", 6) });
  });

  it("does not reopen a card it removed, and its toast names the copies", async () => {
    mount();
    await close({ saved: { entryId: "e2", removed: true, total: 0, copiesRemoved: 5 } });
    expect(onReopen).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith({ entryId: "e2", removed: true, text: r.toast("Sol Ring", 5) });
  });

  it("retries a failing settle, and does not reopen the card over stale readers when it never lands", async () => {
    mount();
    settle.mockRejectedValue(new Error("down"));
    await close({ saved: { entryId: "e1", removed: false, total: 6, copiesRemoved: 5 } });
    expect(settle).toHaveBeenCalledTimes(3);
    expect(onReopen).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalled(); // the write DID commit
    expect(onDone).toHaveBeenCalled();
  });
});
