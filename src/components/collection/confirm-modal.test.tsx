import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmModal } from "./confirm-modal";
import type { UploadPreview } from "../../app/collection/actions";

const preview = {
  filename: "collection.csv",
  matchedCardCount: 120,
  currentCollectionCount: 40,
} as UploadPreview;

function renderModal(overrides?: { pending?: boolean; onClose?: () => void }) {
  const onClose = overrides?.onClose ?? vi.fn();
  render(
    <ConfirmModal
      preview={preview}
      pending={overrides?.pending ?? false}
      error={null}
      onClose={onClose}
      onConfirm={vi.fn()}
    />,
  );
  return { onClose };
}

function pressEscape() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
}

describe("ConfirmModal", () => {
  it("closes on Escape while idle", () => {
    const { onClose } = renderModal();
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The replace is already running, so dismissing the dialog would only hide it.
  it("refuses Escape while the replace is in flight", () => {
    const { onClose } = renderModal({ pending: true });
    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens with focus on Keep current, the answer that changes nothing (D9)", () => {
    renderModal();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Keep current" }));
  });

  // Continue and this button are the two deliberate presses; there is no typed third.
  it("asks for no typed token, and its button is live from the start", () => {
    renderModal();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Replace with 120 cards" })).toBeEnabled();
  });

  // The button names what the player GETS: the matched 120, never the 40 they have now.
  it("draws the now → after pair from the two counts", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/Now\s*40/);
    expect(dialog).toHaveTextContent(/After\s*120/);
    expect(dialog).toHaveTextContent("from collection.csv");
    expect(dialog).not.toHaveTextContent(/can.t be undone/i);
  });

  // Replace disables the button that has focus; without the dialog taking it, focus falls to the
  // body and Tab leaves the dialog for the length of the write.
  it("keeps focus inside the dialog once the replace is running", () => {
    const props = { preview, error: null, onClose: vi.fn(), onConfirm: vi.fn() };
    const { rerender } = render(<ConfirmModal {...props} pending={false} />);
    rerender(<ConfirmModal {...props} pending />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("holds both buttons while the replace runs, and says so on the primary", () => {
    renderModal({ pending: true });
    expect(screen.getByRole("button", { name: "Keep current" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Replacing…" })).toBeDisabled();
  });

  it("says one card, never one cards", () => {
    render(
      <ConfirmModal
        preview={{ ...preview, matchedCardCount: 1, currentCollectionCount: 1 }}
        pending={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Replace with 1 card" })).toBeInTheDocument();
  });

  it("confirms on one press", () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal preview={preview} pending={false} error={null} onClose={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Replace with 120 cards" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
