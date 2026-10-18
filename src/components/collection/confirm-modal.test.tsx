import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { ShortDeck } from "../../lib/collection/write";
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

  // A failed FIRST import reopens this dialog (#1097); with no previous collection, the replace
  // body's way back would be false.
  it("tells a failed first import what it imports, never how to go back", () => {
    render(
      <ConfirmModal
        preview={{ ...preview, currentCollectionCount: 0 }}
        pending={false}
        error="Confirm failed"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("This imports the 120 cards in collection.csv as your collection.");
    expect(dialog).not.toHaveTextContent(/previous list/);
    expect(screen.getByRole("button", { name: "Import 120 cards" })).toBeInTheDocument();
  });

  // With collection editing on (`checking`), History keeps the replace and can revert it, so the
  // way back is a revert; with it off there is no History, and replacing again is the only road.
  it("points to History's Revert as the way back when collection editing is on", () => {
    render(<ConfirmModal preview={preview} pending={false} error={null} onClose={vi.fn()} onConfirm={vi.fn()} checking />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/revert this from History/);
    expect(dialog).not.toHaveTextContent(/previous list/);
  });

  it("keeps the replace-again way back when collection editing is off", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/replace it again with your previous list/);
    expect(dialog).not.toHaveTextContent(/History/);
  });

  it("confirms on one press", () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal preview={preview} pending={false} error={null} onClose={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Replace with 120 cards" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  // Sync's shortage dialog opens STRAIGHT onto the warning (Confirm X1). The warning's Cancel focuses itself in its
  // own (child) effect, before the dialog hook's: the dialog must still return focus to the control that opened it,
  // and keep Cancel, never the first deck link, as the first focus.
  describe("opened straight onto the warning", () => {
    const decks: ShortDeck[] = [
      { deckId: "d1", deckName: "Tithe and Tax", oracleId: "o1", cardName: "Smothering Tithe", short: 1 },
      { deckId: "d2", deckName: "Sram Auras", oracleId: "o2", cardName: "Sol Ring", short: 1 },
    ];
    afterEach(() => vi.restoreAllMocks());

    function Host({ decksNow = decks }: { decksNow?: ShortDeck[] }) {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Sync collection</button>
          {open && (
            <ConfirmModal
              preview={preview}
              pending={false}
              error={null}
              onClose={() => setOpen(false)}
              onConfirm={vi.fn()}
              warning={{ decks: decksNow, changed: false, fresh: new Set(), onConfirm: vi.fn(), source: "sync" }}
            />
          )}
        </>
      );
    }

    it("returns focus to the control that opened it, never the removed Cancel", () => {
      render(<Host />);
      const trigger = screen.getByRole("button", { name: "Sync collection" });
      trigger.focus();
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it("lands first focus on Cancel even where every control has a box (a browser's layout)", () => {
      // jsdom draws no boxes, so the dialog hook's first-visible fallback finds nothing and hides the order problem.
      // A box on every element is what a browser gives it: the fallback then reaches the first deck link.
      vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
      render(<Host />);
      const trigger = screen.getByRole("button", { name: "Sync collection" });
      trigger.focus();
      fireEvent.click(trigger);
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    });

    it("takes Cancel again when a refused confirm redraws the warning with other decks (E6)", () => {
      const { rerender } = render(<Host />);
      const trigger = screen.getByRole("button", { name: "Sync collection" });
      trigger.focus();
      fireEvent.click(trigger);
      trigger.focus();
      rerender(<Host decksNow={[decks[0]]} />);
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    });
  });
});

// The modal rule: the box is capped in dvh and never scrolls itself; the body is its one scroller, `min-h-0` so it
// can shrink; the title and the buttons sit outside it, so a short viewport or an open keyboard never hides them.
describe("ConfirmModal's capped column", () => {
  function scrollerOf(dialog: HTMLElement) {
    const scrollers = [...dialog.querySelectorAll<HTMLElement>(".overflow-y-auto")];
    expect(scrollers).toHaveLength(1);
    return scrollers[0];
  }

  function expectCappedBox(dialog: HTMLElement) {
    const cls = dialog.className.split(/\s+/);
    expect(cls).toEqual(expect.arrayContaining(["flex", "flex-col", "overflow-hidden", "max-h-[88dvh]"]));
    expect(cls).not.toContain("overflow-y-auto");
  }

  it("scrolls the confirm's body between a pinned title and pinned buttons", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expectCappedBox(dialog);
    const body = scrollerOf(dialog);
    expect(body.className.split(/\s+/)).toEqual(expect.arrayContaining(["min-h-0", "flex-1"]));
    expect(body).toHaveTextContent("Now");
    // It holds no control, so it is a tab stop of its own: the focus trap must reach it to scroll the clipped rest.
    expect(body.getAttribute("tabindex")).toBe("0");
    const title = screen.getByRole("heading");
    expect(body.contains(title)).toBe(false);
    expect(title.className).toContain("flex-none");
    for (const name of ["Keep current", "Replace with 120 cards"]) {
      const button = screen.getByRole("button", { name });
      expect(body.contains(button)).toBe(false);
      expect(button.parentElement!.className).toContain("flex-none");
    }
  });

  it("scrolls the warning's notice, explanation and deck list in one body between a pinned title and buttons", () => {
    render(
      <ConfirmModal
        preview={preview}
        pending={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        warning={{
          decks: [{ deckId: "d1", deckName: "Tithe and Tax", oracleId: "o1", cardName: "Smothering Tithe", short: 1 }],
          changed: true,
          fresh: new Set(),
          onConfirm: vi.fn(),
          source: "sync",
        }}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expectCappedBox(dialog);
    // Exactly one scroller (asserted by scrollerOf), and it is the one that shrinks.
    const body = scrollerOf(dialog);
    expect(body.className.split(/\s+/)).toEqual(expect.arrayContaining(["min-h-0", "flex-1", "overscroll-contain"]));
    // Only the title and the actions are pinned; on a short viewport the changed notice and the
    // explanation would otherwise crowd the list out of the cap.
    const title = screen.getByRole("heading");
    expect(body.contains(title)).toBe(false);
    expect(title.className).toContain("flex-none");
    for (const name of ["Cancel", "Sync anyway"]) {
      const button = screen.getByRole("button", { name });
      expect(body.contains(button)).toBe(false);
      expect(button.parentElement!.className).toContain("flex-none");
    }
    expect(body.contains(screen.getByRole("status"))).toBe(true);
    expect(body.contains(screen.getByText(/^Nothing about these decks changes/))).toBe(true);
    expect(body.contains(screen.getByRole("list"))).toBe(true);
    // The warning's root is told to fill the capped column, or its list never meets the cap.
    const fill = dialog.querySelector<HTMLElement>(":scope > .flex-1")!;
    expect(fill.className.split(/\s+/)).toEqual(expect.arrayContaining(["min-h-0", "*:min-h-0", "*:flex-1"]));
  });
});
