import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryRow } from "../../db/schema";

const preview = vi.fn();
const revert = vi.fn();
vi.mock("../../app/collection/history-actions", () => ({
  previewRevert: (...a: unknown[]) => preview(...a),
  revertCollectionEntry: (...a: unknown[]) => revert(...a),
}));

const { RevertConfirm, revertLines } = await import("./revert-confirm");

const st = (q: number) => ({ quantity: q, scryfallId: null, condition: null });
const row = (name: string, before: number | null, after: number | null, set = "lea"): HistoryRow => ({
  oracleId: name, setCode: set, collectorNumber: "1", finish: "nonfoil", name,
  before: before === null ? null : st(before), after: after === null ? null : st(after),
});
const deck = (id: string, name: string) => ({ deckId: id, deckName: name, oracleId: "o", cardName: "Sol Ring", short: 1 });

// The entry added Sol Ring 1 -> 3 and Arcane Signet 0 -> 1. Today Sol Ring is 3 (as left) and the
// signet was already removed (0).
const ENTRY = [row("Sol Ring", 1, 3), row("Arcane Signet", null, 1)];
const matches = { rows: [row("Sol Ring", 3, 1), row("Arcane Signet", 1, null)], entryRows: ENTRY, differs: false, decks: [], expected: { a: 1 } };

function open(onClose = vi.fn(), onReverted = vi.fn()) {
  render(<RevertConfirm entryId="e1" title="Sol Ring and 1 more" when="9 Oct, 14:02" onClose={onClose} onReverted={onReverted} />);
  return { onClose, onReverted };
}

// Find first, then act: a findBy inside act() never resolves.
async function pressRevert() {
  const b = await screen.findByRole("button", { name: "Revert" });
  await act(async () => fireEvent.click(b));
}

beforeEach(() => {
  preview.mockReset();
  revert.mockReset();
});

describe("revertLines", () => {
  it("keeps a row the revert has nothing to do on, reading Already back, and says why a moved row moved", () => {
    const lines = revertLines({
      entryRows: ENTRY,
      // Sol Ring is 5 today (the entry left 3): Then 1, Now 5. The signet is not in today's rows.
      rows: [row("Sol Ring", 5, 1)],
    });
    expect(lines).toEqual([
      expect.objectContaining({ name: "Sol Ring", then: 1, now: 5, reason: "Changed since" }),
      expect.objectContaining({ name: "Arcane Signet", then: 0, now: 0, reason: "Already back" }),
    ]);
  });

  it("gives no reason to a row that is the exact inverse of the entry", () => {
    expect(revertLines({ entryRows: [row("Sol Ring", 1, 3)], rows: [row("Sol Ring", 3, 1)] })[0].reason).toBeNull();
  });
});

describe("revertLines · details", () => {
  it("says a revert that restores only a printing or condition does something, though the counts match", () => {
    const entry = row("Sol Ring", 2, 2);
    entry.before = { quantity: 2, scryfallId: "p1", condition: "NM" };
    entry.after = { quantity: 2, scryfallId: "p2", condition: "NM" };
    const today = row("Sol Ring", 2, 2);
    today.before = { quantity: 2, scryfallId: "p2", condition: "NM" };
    today.after = { quantity: 2, scryfallId: "p1", condition: "NM" };
    expect(revertLines({ entryRows: [entry], rows: [today] })[0].reason).toBe("Printing or condition");
  });
});

describe("RevertConfirm", () => {
  it("says it is checking, then draws the lede and Then and Now for every row the entry changed", async () => {
    preview.mockResolvedValue(matches);
    open();
    expect(screen.getByRole("status").textContent).toMatch(/Checking what this would change/);
    expect(screen.getByRole("button", { name: "Revert" })).toBeDisabled();
    expect(await screen.findByText("From 9 Oct, 14:02. Reverting this changes 3 copies.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Revert “Sol Ring and 1 more”?" })).toBeTruthy();
    expect(screen.getByText("Arcane Signet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Revert" })).toBeEnabled();
  });

  it("when today differs it says so, hides no row and offers Revert what's left", async () => {
    preview.mockResolvedValue({ ...matches, differs: true, rows: [row("Sol Ring", 5, 1)] });
    open();
    expect(await screen.findByText(/This does less than the original/)).toBeTruthy();
    expect(screen.getByText("Already back")).toBeTruthy();
    expect(screen.getByText("Changed since")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Revert what's left" })).toBeTruthy();
  });

  it("offers only Close when there is nothing left to undo", async () => {
    preview.mockResolvedValue({ ...matches, differs: true, rows: [] });
    open();
    expect(await screen.findByText(/Nothing left to undo/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Revert/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("reverts with the preview's expected counts, and a retry after a failure reuses the same action id", async () => {
    preview.mockResolvedValue(matches);
    revert.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce({ reverted: { id: "r1" } });
    const { onReverted } = open();
    await pressRevert();
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't load that|Nothing was changed/);
    expect(onReverted).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Revert" })));
    expect(revert).toHaveBeenCalledTimes(2);
    expect(revert.mock.calls[0][1]).toBe(revert.mock.calls[1][1]);
    expect(revert.mock.calls[0][2]).toEqual({ a: 1 });
    expect(onReverted).toHaveBeenCalledTimes(1);
  });

  it("asks about the decks inside the same dialog, then resends exactly those decks", async () => {
    const decks = [deck("d1", "Atraxa")];
    preview.mockResolvedValue({ ...matches, decks });
    revert.mockResolvedValue({ reverted: { id: "r1" } });
    const { onReverted } = open();
    await pressRevert();
    expect(revert).not.toHaveBeenCalled();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Reverting leaves a deck short" })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Revert anyway" })));
    expect(revert).toHaveBeenCalledWith("e1", expect.any(String), { a: 1 }, decks);
    expect(onReverted).toHaveBeenCalled();
  });

  it("redraws the warning with a notice and `new` when the decks moved, and writes nothing", async () => {
    preview.mockResolvedValue({ ...matches, decks: [deck("d1", "Atraxa")] });
    revert.mockResolvedValue({ wouldShort: [deck("d1", "Atraxa"), deck("d2", "Korvold")] });
    const { onReverted } = open();
    await pressRevert();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Revert anyway" })));
    expect(screen.getByRole("status").textContent).toMatch(/This changed while you were deciding/);
    expect(screen.getByRole("heading", { name: "Reverting leaves 2 decks short" })).toBeTruthy();
    expect(screen.getAllByText("new")).toHaveLength(1);
    expect(onReverted).not.toHaveBeenCalled();
  });

  it("leads with what it restores, not 0 copies, when the revert moves no copies", async () => {
    const entry = row("Sol Ring", 2, 2);
    entry.before = { quantity: 2, scryfallId: "p1", condition: null };
    entry.after = { quantity: 2, scryfallId: "p2", condition: null };
    const today = row("Sol Ring", 2, 2);
    today.before = { quantity: 2, scryfallId: "p2", condition: null };
    today.after = { quantity: 2, scryfallId: "p1", condition: null };
    preview.mockResolvedValue({ ...matches, entryRows: [entry], rows: [today] });
    open();
    expect(await screen.findByText("From 9 Oct, 14:02. Reverting this restores the printing or condition of 1 card.")).toBeTruthy();
  });

  it("says the answer changed when the first confirm is answered with decks the preview did not name", async () => {
    preview.mockResolvedValue(matches);
    revert.mockResolvedValue({ wouldShort: [deck("d1", "Atraxa")] });
    open();
    await pressRevert();
    expect(await screen.findByText(/This changed while you were deciding/)).toBeTruthy();
    expect(screen.getAllByText("new")).toHaveLength(1);
  });

  it("takes focus into the dialog while the write is in flight", async () => {
    preview.mockResolvedValue(matches);
    revert.mockReturnValue(new Promise(() => {}));
    open();
    await pressRevert();
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("names a card the catalog dropped and writes nothing", async () => {
    preview.mockResolvedValue(matches);
    revert.mockResolvedValue({ missingCard: ["Sol Ring"] });
    const { onReverted } = open();
    await pressRevert();
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/Sol Ring has been removed from the card catalog/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "We couldn't revert this" })).toBeTruthy();
    expect(onReverted).not.toHaveBeenCalled();
  });

  it("reads again with a notice when the collection moved since the confirmation was drawn", async () => {
    preview.mockResolvedValue(matches);
    revert.mockResolvedValue({ stale: true });
    open();
    await pressRevert();
    expect(await screen.findByText(/This changed while you were deciding/)).toBeTruthy();
    expect(preview).toHaveBeenCalledTimes(2);
  });

  it("says an already-undone change is gone, with nothing to confirm", async () => {
    preview.mockResolvedValue({ alreadyReverted: true });
    open();
    expect((await screen.findByRole("alert")).textContent).toMatch(/already been undone/);
    expect(screen.queryByRole("button", { name: "Revert" })).toBeNull();
  });
});
