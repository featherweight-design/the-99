import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ResultLine } from "./result-line";

describe("ResultLine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("draws the sentence immediately", () => {
    render(<ResultLine line="41 decks" />);
    expect(screen.getByText("41 decks")).toBeTruthy();
  });

  it("stays silent on arrival, so the chassis does not read its own count out", () => {
    const { container } = render(<ResultLine line="41 decks" />);
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector("[role='status']")?.textContent).toBe("");
  });

  it("announces a change late, so four keystrokes are one count", () => {
    const { rerender, container } = render(<ResultLine line="41 decks" />);
    rerender(<ResultLine line="12 of 41 decks" />);
    // Still silent before the debounce elapses.
    act(() => vi.advanceTimersByTime(299));
    expect(container.querySelector("[role='status']")?.textContent).toBe("");
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector("[role='status']")?.textContent).toBe("12 of 41 decks");
  });

  it("is the one live region, and it is atomic", () => {
    const { container } = render(<ResultLine line="41 decks" />);
    const regions = container.querySelectorAll("[aria-live]");
    expect(regions).toHaveLength(1);
    expect(regions[0].getAttribute("aria-atomic")).toBe("true");
    // The visible line must not be read a second time by the same reader.
    expect(screen.getByText("41 decks").getAttribute("aria-hidden")).toBe("true");
  });
});
