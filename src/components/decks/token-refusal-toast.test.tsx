// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DECK_TOAST_CLAIM, TOAST_MS } from "../collection/edit-toast";
import { TokenRefusalToast } from "./token-refusal-toast";

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

  it("sits above a deck toast that is already up, and in the slot itself when none is", () => {
    const { container } = render(<TokenRefusalToast name="Spirit" onDone={() => {}} />);
    expect(container.querySelector("[data-toast=deck]")!.className).not.toContain("114px");
    cleanup();
    const receipt = document.createElement("div");
    receipt.setAttribute("data-toast", "deck");
    document.body.appendChild(receipt);
    try {
      render(<TokenRefusalToast name="Spirit" onDone={() => {}} />);
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("bottom-[calc(var(--tabbar-h,0px)+114px)]");
      expect(alert.className).toContain("md:bottom-[120px]");
    } finally {
      receipt.remove();
    }
  });
});
