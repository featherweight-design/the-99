// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const undoPartnerAdd = vi.fn();
vi.mock("../../lib/commander-change/actions", () => ({ undoPartnerAdd: (...a: unknown[]) => undoPartnerAdd(...a) }));
const { PartnerAddUndoToast } = await import("./partner-add-undo-toast");

afterEach(() => { cleanup(); undoPartnerAdd.mockReset(); });

const props = {
  deckId: "d", stays: "s", partner: "p", cut: "c",
  names: { stays: "Tymna", partner: "Thrasios", cut: "Forest" }, onDone: () => {},
};

describe("PartnerAddUndoToast", () => {
  it("is a status receipt: the join, what left, one Undo", () => {
    render(<PartnerAddUndoToast {...props} />);
    const toast = screen.getByRole("status");
    expect(toast.textContent).toContain("Thrasios joins Tymna.");
    expect(toast.textContent).toContain("Forest left the deck.");
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("writes the undo with the ids it was given, then says the single leads alone", async () => {
    undoPartnerAdd.mockResolvedValue({ ok: true });
    render(<PartnerAddUndoToast {...props} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Undo" })); });
    expect(undoPartnerAdd).toHaveBeenCalledWith("d", "s", "p", "c");
    expect(screen.getByRole("status").textContent).toContain("Tymna leads alone again.");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("turns into the refusal alert, with no Undo, when the write is refused", async () => {
    undoPartnerAdd.mockResolvedValue({ ok: false, reason: "changed" });
    render(<PartnerAddUndoToast {...props} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Undo" })); });
    expect(screen.getByRole("alert").textContent).toContain("We couldn’t undo that.");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("claims nothing when the answer is lost", async () => {
    undoPartnerAdd.mockRejectedValue(new Error("network"));
    render(<PartnerAddUndoToast {...props} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Undo" })); });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByText(/leads alone again/)).toBeNull();
  });

  it("presses once: a second press during the write does nothing", async () => {
    let release: (v: unknown) => void = () => {};
    undoPartnerAdd.mockReturnValue(new Promise((r) => { release = r; }));
    render(<PartnerAddUndoToast {...props} />);
    const press = screen.getByRole("button", { name: "Undo" });
    fireEvent.click(press);
    fireEvent.click(press);
    expect(undoPartnerAdd).toHaveBeenCalledTimes(1);
    await act(async () => { release({ ok: true }); });
  });
});
