import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// The prefetch Next receives is what this component exists to set, so the mock records it.
vi.mock("next/link", () => ({
  default: ({ prefetch, href, children, ...rest }: Record<string, unknown> & { href: string; children?: React.ReactNode }) => (
    <a href={href} data-prefetch={prefetch === undefined ? "auto" : String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

const { IntentPrefetchLink } = await import("./intent-prefetch-link");

describe("IntentPrefetchLink", () => {
  it("leaves the default prefetch until a reader shows intent", () => {
    render(<IntentPrefetchLink href="/decks/d1">Deck</IntentPrefetchLink>);
    expect(screen.getByRole("link").dataset.prefetch).toBe("auto");
  });

  it.each([
    ["a pointer resting on it", (el: HTMLElement) => fireEvent.pointerEnter(el)],
    ["keyboard focus", (el: HTMLElement) => fireEvent.focus(el)],
    ["the touchstart before a tap", (el: HTMLElement) => fireEvent.touchStart(el)],
  ])("prefetches the whole page on %s", (_label, intent) => {
    render(<IntentPrefetchLink href="/decks/d1">Deck</IntentPrefetchLink>);
    intent(screen.getByRole("link"));
    expect(screen.getByRole("link").dataset.prefetch).toBe("true");
  });

  it("prefetches on sight when eager", () => {
    render(<IntentPrefetchLink href="/decks/d1" eager>Deck</IntentPrefetchLink>);
    expect(screen.getByRole("link").dataset.prefetch).toBe("true");
  });

  it("still calls the caller's own handlers", () => {
    const onFocus = vi.fn();
    render(<IntentPrefetchLink href="/decks/d1" onFocus={onFocus}>Deck</IntentPrefetchLink>);
    fireEvent.focus(screen.getByRole("link"));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});
