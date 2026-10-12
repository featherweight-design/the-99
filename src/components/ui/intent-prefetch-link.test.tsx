import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// Link's own prefetch is left at its default, so the mock records the prop to prove it is never set.
vi.mock("next/link", () => ({
  default: ({ prefetch, href, children, ...rest }: Record<string, unknown> & { href: string; children?: React.ReactNode }) => (
    <a href={href} data-prefetch={prefetch === undefined ? "default" : String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));
const prefetch = vi.fn();
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime");
const { IntentPrefetchLink: Bare } = await import("./intent-prefetch-link");
const router = { prefetch } as never;
// The link under an app router, as every page renders it.
function IntentPrefetchLink(props: React.ComponentProps<typeof Bare>) {
  return (
    <AppRouterContext.Provider value={router}>
      <Bare {...props} />
    </AppRouterContext.Provider>
  );
}

beforeEach(() => prefetch.mockClear());

describe("IntentPrefetchLink", () => {
  it("prefetches nothing extra until a reader shows intent, and leaves Link's own prefetch alone", () => {
    render(<IntentPrefetchLink href="/decks/d1">Deck</IntentPrefetchLink>);
    expect(prefetch).not.toHaveBeenCalled();
    expect(screen.getByRole("link").dataset.prefetch).toBe("default");
  });

  it.each([
    ["a pointer resting on it", (el: HTMLElement) => fireEvent.pointerEnter(el)],
    ["keyboard focus", (el: HTMLElement) => fireEvent.focus(el)],
    ["the touchstart before a tap", (el: HTMLElement) => fireEvent.touchStart(el)],
  ])("prefetches the whole page at once on %s", (_label, intent) => {
    render(<IntentPrefetchLink href="/decks/d1">Deck</IntentPrefetchLink>);
    intent(screen.getByRole("link"));
    expect(prefetch).toHaveBeenCalledWith("/decks/d1", { kind: "full" });
  });

  it("asks once, however much intent follows", () => {
    render(<IntentPrefetchLink href="/decks/d1">Deck</IntentPrefetchLink>);
    const link = screen.getByRole("link");
    fireEvent.pointerEnter(link);
    fireEvent.focus(link);
    fireEvent.touchStart(link);
    expect(prefetch).toHaveBeenCalledTimes(1);
  });

  it("prefetches on sight when eager", () => {
    render(<IntentPrefetchLink href="/decks/d1" eager>Deck</IntentPrefetchLink>);
    expect(prefetch).toHaveBeenCalledWith("/decks/d1", { kind: "full" });
  });

  it("is a plain link with no router to prefetch into, as the About specimens draw it", () => {
    render(<Bare href="/decks/d1" eager>Deck</Bare>);
    fireEvent.pointerEnter(screen.getByRole("link"));
    expect(prefetch).not.toHaveBeenCalled();
  });

  it("still calls the caller's own handlers", () => {
    const onFocus = vi.fn();
    render(<IntentPrefetchLink href="/decks/d1" onFocus={onFocus}>Deck</IntentPrefetchLink>);
    fireEvent.focus(screen.getByRole("link"));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});
