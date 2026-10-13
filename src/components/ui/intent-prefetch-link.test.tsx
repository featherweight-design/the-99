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

// Whether the focus a test fires came from the keyboard. jsdom computes no `:focus-visible`.
let keyboard = true;
beforeEach(() => {
  prefetch.mockClear();
  keyboard = true;
  vi.restoreAllMocks();
  const matches = Element.prototype.matches;
  vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, sel: string) {
    return sel === ":focus-visible" ? keyboard : matches.call(this, sel);
  });
});

describe("IntentPrefetchLink", () => {
  it("prefetches nothing extra until a reader shows intent, and leaves Link's own prefetch alone", () => {
    render(<IntentPrefetchLink href="/decks/d1">Deck</IntentPrefetchLink>);
    expect(prefetch).not.toHaveBeenCalled();
    expect(screen.getByRole("link").dataset.prefetch).toBe("default");
  });

  it.each([
    ["a mouse resting on it", (el: HTMLElement) => fireEvent.pointerEnter(el, { pointerType: "mouse" })],
    ["a pen resting on it", (el: HTMLElement) => fireEvent.pointerEnter(el, { pointerType: "pen" })],
    ["keyboard focus", (el: HTMLElement) => fireEvent.focus(el)],
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
    fireEvent.pointerEnter(link, { pointerType: "mouse" });
    expect(prefetch).toHaveBeenCalledTimes(1);
  });

  // A tap's navigation does not reuse a prefetch it overtakes, so a touchstart prefetch fetched the
  // page twice and made the tap slower (#1557, measured on staging).
  it("does not prefetch on a tap: not its pointerenter, its touchstart or the focus it brings", () => {
    keyboard = false;
    render(<IntentPrefetchLink href="/decks/d1">Deck</IntentPrefetchLink>);
    const link = screen.getByRole("link");
    fireEvent.pointerEnter(link, { pointerType: "touch" });
    fireEvent.touchStart(link);
    fireEvent.focus(link);
    expect(prefetch).not.toHaveBeenCalled();
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

  it("runs a caller's callback-ref cleanup, and nulls a plain one, on unmount", () => {
    const release = vi.fn();
    const object = { current: null as HTMLAnchorElement | null };
    const { unmount } = render(
      <>
        <IntentPrefetchLink href="/decks/d1" ref={(node) => () => release(node)}>One</IntentPrefetchLink>
        <IntentPrefetchLink href="/decks/d2" ref={object}>Two</IntentPrefetchLink>
      </>,
    );
    expect(object.current?.getAttribute("href")).toBe("/decks/d2");
    unmount();
    expect(release).toHaveBeenCalledWith(expect.objectContaining({ tagName: "A" }));
    expect(object.current).toBeNull();
  });

  it("still calls the caller's own handlers", () => {
    const onFocus = vi.fn();
    render(<IntentPrefetchLink href="/decks/d1" onFocus={onFocus}>Deck</IntentPrefetchLink>);
    fireEvent.focus(screen.getByRole("link"));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it("prefetches on sight when eager, unless the reader is saving data", () => {
    Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true });
    try {
      render(<IntentPrefetchLink href="/decks/d1" eager>Deck</IntentPrefetchLink>);
      expect(prefetch).not.toHaveBeenCalled();
    } finally {
      delete (navigator as { connection?: unknown }).connection;
    }
  });
});

// The /decks grid's form: a phone, the tile on screen, then an idle moment, and only then.
describe("IntentPrefetchLink eager on a phone, in view", () => {
  let phone = true;
  let observed: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
  let idle: (() => void) | null = null;
  beforeEach(() => {
    phone = true;
    observed = null;
    idle = null;
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q === "(width < 40rem)" && phone }));
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          observed = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => {
      idle = cb;
      return 1;
    });
    vi.stubGlobal("cancelIdleCallback", () => {});
    return () => vi.unstubAllGlobals();
  });

  const tile = () => render(<IntentPrefetchLink href="/decks/d1" eager="phone-in-view" />);

  it("waits for the tile to come into view, then for an idle moment", () => {
    tile();
    expect(prefetch).not.toHaveBeenCalled();
    observed!([{ isIntersecting: false }]);
    expect(idle).toBeNull();
    observed!([{ isIntersecting: true }]);
    expect(prefetch).not.toHaveBeenCalled();
    idle!();
    expect(prefetch).toHaveBeenCalledWith("/decks/d1", { kind: "full" });
  });

  it("reports a prefetch only when it starts, and once", () => {
    const started = vi.fn();
    render(<IntentPrefetchLink href="/decks/d1" eager="phone-in-view" onPrefetch={started} />);
    observed!([{ isIntersecting: true }]);
    expect(started).not.toHaveBeenCalled();
    idle!();
    expect(started).toHaveBeenCalledTimes(1);
  });

  it("checks the width again when the idle moment comes", () => {
    tile();
    observed!([{ isIntersecting: true }]);
    phone = false;
    idle!();
    expect(prefetch).not.toHaveBeenCalled();
  });

  it("drops a waiting prefetch once the tile is pressed", () => {
    tile();
    observed!([{ isIntersecting: true }]);
    fireEvent.click(screen.getByRole("link"));
    idle!();
    expect(prefetch).not.toHaveBeenCalled();
  });

  it("does nothing on a wider screen", () => {
    phone = false;
    tile();
    expect(observed).toBeNull();
    expect(prefetch).not.toHaveBeenCalled();
  });

  it("does nothing on a 2g connection", () => {
    Object.defineProperty(navigator, "connection", { value: { effectiveType: "slow-2g" }, configurable: true });
    try {
      tile();
      expect(observed).toBeNull();
    } finally {
      delete (navigator as { connection?: unknown }).connection;
    }
  });

  it("drops a scheduled prefetch when the tile unmounts first", () => {
    const { unmount } = tile();
    observed!([{ isIntersecting: true }]);
    const cancel = vi.fn();
    vi.stubGlobal("cancelIdleCallback", cancel);
    unmount();
    expect(cancel).toHaveBeenCalledWith(1);
  });
});
