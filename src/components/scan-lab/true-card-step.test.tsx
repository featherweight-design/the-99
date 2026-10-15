// The "What card was it?" step after a ✗ tap: a name search, one pick saves the true card onto that
// tap's row, and Skip closes it without a write.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const search = vi.fn();
const label = vi.fn();
vi.mock("../../app/lab/scan/actions", () => ({
  searchScanLabCards: (q: string) => search(q),
  labelScanLabResult: (id: string, oracle: string) => label(id, oracle),
}));

import { TrueCardStep } from "./true-card-step";

const ROW = "11111111-1111-4111-8111-111111111111";
const WHIR = { oracleId: "22222222-2222-4222-8222-222222222222", name: "Whir of Invention", flavorName: null, imageUri: null };
const FELIX = { oracleId: "33333333-3333-4333-8333-333333333333", name: "Barrowgoyf", flavorName: "Feral Felix", imageUri: null };

async function type(text: string) {
  vi.useFakeTimers();
  fireEvent.change(screen.getByRole("searchbox", { name: "Card name" }), { target: { value: text } });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  vi.useRealTimers();
}

beforeEach(() => {
  search.mockReset();
  label.mockReset();
});

describe("TrueCardStep", () => {
  it("saves the picked card onto the missed row and reports it", async () => {
    search.mockResolvedValue([WHIR]);
    label.mockResolvedValue(true);
    const onDone = vi.fn();
    render(<TrueCardStep resultId={ROW} onDone={onDone} />);
    await type("whir");
    expect(search).toHaveBeenCalledWith("whir");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Whir of Invention/ })); });
    expect(label).toHaveBeenCalledWith(ROW, WHIR.oracleId);
    expect(onDone).toHaveBeenCalledWith("Saved as Whir of Invention");
  });

  it("names a Secret Lair card by the name the player searched, with the card's own under it", async () => {
    search.mockResolvedValue([FELIX]);
    render(<TrueCardStep resultId={ROW} onDone={vi.fn()} />);
    await type("felix");
    const hit = screen.getByRole("button", { name: /Feral Felix/ });
    expect(hit.textContent).toContain("Barrowgoyf");
  });

  it("keeps the step open with a line when the save fails", async () => {
    search.mockResolvedValue([WHIR]);
    label.mockResolvedValue(false);
    const onDone = vi.fn();
    render(<TrueCardStep resultId={ROW} onDone={onDone} />);
    await type("whir");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Whir of Invention/ })); });
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText("That didn’t save. Pick it again or skip.")).toBeTruthy();
  });

  it("closes on Skip with no write", () => {
    const onDone = vi.fn();
    render(<TrueCardStep resultId={ROW} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onDone).toHaveBeenCalledWith(null);
    expect(label).not.toHaveBeenCalled();
  });
});
