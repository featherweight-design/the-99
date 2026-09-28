import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Each fake link reads its pending state from this map, keyed by href, as `useLinkStatus` would
// from inside its own `<Link>`.
const state = vi.hoisted(() => ({ path: "/", pending: new Map<string, boolean>() }));
vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
vi.mock("next/link", async () => {
  const { useContext, createContext } = await import("react");
  const Href = createContext("");
  return {
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <Href.Provider value={href}>{children}</Href.Provider>
    ),
    useLinkStatus: () => ({ pending: state.pending.get(useContext(Href)) ?? false }),
  };
});

const { default: Link } = await import("next/link");
const { NavigationPendingProvider, OVERLAY_AFTER_MS, ShellMain } = await import("./navigation-pending");
const { usePendingReport } = await import("./pending-report");
const { OVERLAY_OUT_MS } = await import("./pending-overlay");

function Reporter({ href }: { href: string }) {
  usePendingReport(href);
  return null;
}

function App({ links }: { links: string[] }) {
  return (
    <NavigationPendingProvider>
      <ShellMain className="">
        {links.map((href) => (
          <Link key={href} href={href}>
            <Reporter href={href} />
          </Link>
        ))}
      </ShellMain>
    </NavigationPendingProvider>
  );
}

const LINKS = ["/commanders", "/discover", "/decks/abc", "/"];
let rerender: (ui: React.ReactElement) => void;

function press(href: string, pending = true) {
  state.pending.set(href, pending);
  act(() => rerender(<App links={LINKS} />));
}
const overlay = () => screen.queryByTestId("pending-overlay");
const main = () => document.querySelector("main")!;

beforeEach(() => {
  vi.useFakeTimers();
  state.path = "/";
  state.pending.clear();
  ({ rerender } = render(<App links={LINKS} />));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("NavigationPendingProvider", () => {
  it("draws nothing at 399ms and the route's screen at 400ms, with the shell's main busy", () => {
    press("/commanders");
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS - 1));
    expect(overlay()).toBeNull();
    expect(main().hasAttribute("aria-busy")).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(overlay()?.textContent).toContain("Consulting the council");
    expect(main().getAttribute("aria-busy")).toBe("true");
    // A sibling of <main>, never inside it: the screen is a live region.
    expect(main().contains(overlay())).toBe(false);
  });

  it("never shows a screen for a kept route", () => {
    press("/decks/abc");
    act(() => vi.advanceTimersByTime(2000));
    expect(overlay()).toBeNull();
  });

  it("waits its own 400ms, and shows nothing for a kept route, when pressed while a screen fades out", () => {
    press("/commanders");
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    state.path = "/commanders";
    press("/commanders", false);
    expect(overlay()?.className).toContain("pointer-events-none");
    // Pressed within the fade: a kept route.
    press("/decks/abc");
    act(() => vi.advanceTimersByTime(2000));
    expect(overlay()).toBeNull();
    press("/decks/abc", false);
    // A fresh run into an overlay route waits the full 400ms again.
    press("/discover");
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS - 1));
    expect(overlay()).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(overlay()?.textContent).toContain("Casting a wider net");
  });

  it("escalates at once when a run past 400ms moves from a kept route to an overlay route", () => {
    press("/decks/abc");
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    expect(overlay()).toBeNull();
    state.pending.set("/decks/abc", false);
    press("/discover");
    expect(overlay()?.textContent).toContain("Casting a wider net");
  });

  it("never starts a run for a link to the page already open", () => {
    press("/");
    act(() => vi.advanceTimersByTime(2000));
    expect(overlay()).toBeNull();
  });

  it("keeps the first press's clock and takes the last press's words", () => {
    press("/commanders");
    act(() => vi.advanceTimersByTime(300));
    // Only the last-pressed link stays pending.
    state.pending.set("/commanders", false);
    press("/discover");
    act(() => vi.advanceTimersByTime(100));
    expect(overlay()?.textContent).toContain("Casting a wider net");
  });

  it("lets pointer events through at commit, fades out and unmounts", () => {
    press("/commanders");
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    state.path = "/commanders";
    press("/commanders", false);
    expect(overlay()?.className).toContain("pointer-events-none");
    expect(main().hasAttribute("aria-busy")).toBe(false);
    act(() => vi.advanceTimersByTime(OVERLAY_OUT_MS));
    expect(overlay()).toBeNull();
  });

  it("ends a run when the page lands, even while the pressed link still reads pending", () => {
    press("/commanders");
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    state.path = "/commanders";
    act(() => rerender(<App links={LINKS} />));
    act(() => vi.advanceTimersByTime(OVERLAY_OUT_MS));
    expect(overlay()).toBeNull();
  });
});
