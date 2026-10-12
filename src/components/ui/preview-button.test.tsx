import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { PreviewButton } from "./preview-button";

// The provider previews only where a pointer can hover.
beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: query === "(hover: hover)", media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }),
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const box = () => screen.queryByTestId("hover-preview");

describe("PreviewButton", () => {
  it("previews its own art when the pointer rests on it, and passes the press through", () => {
    const onClick = vi.fn();
    render(
      <HoverPreviewProvider>
        <PreviewButton imageUri="https://img.test/a.jpg" onClick={onClick}>Sol Ring</PreviewButton>
      </HoverPreviewProvider>,
    );
    const button = screen.getByRole("button", { name: "Sol Ring" });
    fireEvent.mouseEnter(button, { clientX: 10, clientY: 10 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(box()?.getAttribute("style")).toContain("https://img.test/a.jpg");
    fireEvent.mouseLeave(button);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(box()).toBeNull();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("previews nothing for a card with no art, and draws as a plain button outside a provider", () => {
    render(
      <>
        <HoverPreviewProvider><PreviewButton imageUri={null}>No art</PreviewButton></HoverPreviewProvider>
        <PreviewButton imageUri="https://img.test/b.jpg">Alone</PreviewButton>
      </>,
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: "No art" }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(box()).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Alone" }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(box()).toBeNull();
  });
});
