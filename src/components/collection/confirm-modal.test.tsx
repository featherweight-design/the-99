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

  // The replace is already running and can't be undone, so dismissing the
  // dialog would only hide it.
  it("refuses Escape while the replace is in flight", () => {
    const { onClose } = renderModal({ pending: true });
    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("focuses the confirm input on open", () => {
    renderModal();
    expect(document.activeElement).toBe(screen.getByLabelText(/to confirm/i));
  });

  it("arms the confirm button only once the token matches", () => {
    renderModal();
    const confirm = screen.getByRole("button", { name: /Replace 40 cards/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: "REPLACE" },
    });
    expect(confirm).toBeEnabled();
  });
});
