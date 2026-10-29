// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DECK_TOAST_CLAIM, TOAST_MS } from "../collection/edit-toast";
import { DeckRefusalToast, TokenRefusalToast } from "./token-refusal-toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TokenRefusalToast", () => {
  it("is a deck-slot alert: the shipped refusal, the token's name, no action", () => {
    render(<TokenRefusalToast name="Spirit" onDone={() => {}} />);
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-toast")).toBe("deck");
    expect(alert.textContent).toBe("We couldn’t save that. The token is unchanged.Spirit token");
    expect(alert.querySelector("button, a")).toBeNull();
  });

  it("leaves after eight seconds, and not while the pointer is on it", () => {
    vi.useFakeTimers();
    const done = vi.fn();
    render(<TokenRefusalToast name="Spirit" onDone={done} />);
    const alert = screen.getByRole("alert");
    fireEvent.pointerEnter(alert);
    act(() => { vi.advanceTimersByTime(TOAST_MS * 2); });
    expect(done).not.toHaveBeenCalled();
    fireEvent.pointerLeave(alert);
    act(() => { vi.advanceTimersByTime(TOAST_MS + 500); });
    // The clock keeps asking until the owner unmounts the toast, which a mock does not.
    expect(done).toHaveBeenCalled();
  });

  it("steps aside when a receipt claims the deck slot, since that toast holds an Undo", () => {
    const done = vi.fn();
    render(<TokenRefusalToast name="Spirit" onDone={done} />);
    act(() => { window.dispatchEvent(new Event(DECK_TOAST_CLAIM)); });
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("is an alert in the deck toast stack, above a receipt, and never lifted by measuring one", () => {
    // Small items 3, item 8: the stack orders the two, so a refusal no longer measures the receipt and lifts itself.
    const receipt = document.createElement("div");
    receipt.setAttribute("data-toast", "deck");
    receipt.getBoundingClientRect = () => ({ height: 187.2 }) as DOMRect;
    document.body.appendChild(receipt);
    try {
      const { container } = render(<TokenRefusalToast name="Spirit" onDone={() => {}} />);
      const alert = screen.getByRole("alert");
      expect(container.contains(alert)).toBe(false);
      expect(alert.parentElement!.hasAttribute("data-deck-toast-stack")).toBe(true);
      expect(alert.className).toContain("order-1");
      expect(alert.style.translate).toBe("");
    } finally {
      receipt.remove();
    }
  });
});

describe("DeckRefusalToast (a card's failed removal, deck messages A1)", () => {
  it("is a deck-slot alert: the title, the card's name as the detail, no press", () => {
    render(<DeckRefusalToast title="We couldn’t remove that." detail="Sol Ring" onDone={() => {}} />);
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-toast")).toBe("deck");
    expect(alert.textContent).toBe("We couldn’t remove that.Sol Ring");
    expect(alert.querySelector("button, a")).toBeNull();
  });
});

describe("one refusal at a time, whoever owns it", () => {
  it("a newer refusal replaces an older one, in either order", () => {
    const tokenDone = vi.fn();
    const removeDone = vi.fn();
    // A token refusal first, then a removal's: the token's leaves.
    render(<TokenRefusalToast name="Spirit" onDone={tokenDone} />);
    render(<DeckRefusalToast title="We couldn’t remove that." detail="Sol Ring" onDone={removeDone} />);
    expect(tokenDone).toHaveBeenCalledTimes(1);
    expect(removeDone).not.toHaveBeenCalled();
    cleanup();
    // And the other way round.
    const tokenDone2 = vi.fn();
    const removeDone2 = vi.fn();
    render(<DeckRefusalToast title="We couldn’t remove that." detail="Sol Ring" onDone={removeDone2} />);
    render(<TokenRefusalToast name="Spirit" onDone={tokenDone2} />);
    expect(removeDone2).toHaveBeenCalledTimes(1);
    expect(tokenDone2).not.toHaveBeenCalled();
  });
});
