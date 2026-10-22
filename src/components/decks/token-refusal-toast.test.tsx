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

  it("sits above a receipt already in the slot by that receipt's own height, and not above another refusal", () => {
    const { container } = render(<TokenRefusalToast name="Spirit" onDone={() => {}} />);
    expect(container.querySelector<HTMLElement>("[data-toast=deck]")!.style.translate).toBe("");
    cleanup();
    // A receipt whose body wraps is taller than any fixed offset: the lift is what it measures, plus a gap.
    const receipt = document.createElement("div");
    receipt.setAttribute("data-toast", "deck");
    receipt.getBoundingClientRect = () => ({ height: 187.2 }) as DOMRect;
    document.body.appendChild(receipt);
    try {
      render(<TokenRefusalToast name="Spirit" onDone={() => {}} />);
      expect(screen.getByRole("alert").style.translate).toBe("0 -198px");
    } finally {
      receipt.remove();
    }
    cleanup();
    // Another refusal in the slot is the one being replaced, never a receipt to sit above.
    const other = document.createElement("div");
    other.setAttribute("data-toast", "deck");
    other.setAttribute("data-toast-kind", "token-refusal");
    other.getBoundingClientRect = () => ({ height: 90 }) as DOMRect;
    document.body.appendChild(other);
    try {
      render(<TokenRefusalToast name="Spirit" onDone={() => {}} />);
      expect(screen.getByRole("alert").style.translate).toBe("");
    } finally {
      other.remove();
    }
  });

  it("follows a receipt that grows while the refusal is up", () => {
    let notify: () => void = () => {};
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class { constructor(cb: () => void) { notify = cb; } observe() {} disconnect() {} } as unknown as typeof ResizeObserver;
    let height = 90;
    const receipt = document.createElement("div");
    receipt.setAttribute("data-toast", "deck");
    receipt.getBoundingClientRect = () => ({ height }) as DOMRect;
    document.body.appendChild(receipt);
    try {
      render(<TokenRefusalToast name="Spirit" onDone={() => {}} />);
      expect(screen.getByRole("alert").style.translate).toBe("0 -100px");
      height = 150; // the window narrowed and the receipt's body wrapped onto another line
      act(() => notify());
      expect(screen.getByRole("alert").style.translate).toBe("0 -160px");
    } finally {
      receipt.remove();
      globalThis.ResizeObserver = original;
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
