import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Each fake link reads its pending state from this map, keyed by href, as `useLinkStatus` would
// from inside its own `<Link>`.
const state = vi.hoisted(() => ({ path: "/", pending: new Map<string, boolean>() }));
const routerPush = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ usePathname: () => state.path, useRouter: () => ({ push: routerPush }) }));
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
const { use, useEffect, useLayoutEffect, useState } = await import("react");
const { usePendingPush } = await import("./pending-push");
const { mirrorUrl } = await import("../../lib/url/mirror");

function Reporter({ href }: { href: string }) {
  return usePendingReport(href) ? <span data-testid={`mark ${href}`} /> : null;
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
    // Covered, so out of the keyboard's reach too, not only the pointer's.
    expect(main().inert).toBe(true);
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

  it("reads a link to the page already open as not pending, so its mark never draws", () => {
    press("/");
    expect(screen.queryByTestId("mark /")).toBeNull();
    press("/commanders");
    expect(screen.queryByTestId("mark /commanders")).not.toBeNull();
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
    expect(main().inert).toBe(false);
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

describe("the URL mirrors stand down while a navigation is pending", () => {
  // The provider reports the router's committed path. After a Back or Forward the address is the
  // destination while the router still names the page being left, and that page's mirror, even one
  // that reads the live path, must not write over the destination.
  it("blocks a mirror whose page the router has not committed to the address", () => {
    state.path = "/discover";
    act(() => rerender(<App links={LINKS} />));
    window.history.pushState(null, "", "/decks");
    const replace = vi.spyOn(window.history, "replaceState");
    try {
      mirrorUrl(`${window.location.pathname}?o=new`);
      expect(replace).not.toHaveBeenCalled();
    } finally {
      replace.mockRestore();
    }
  });

  // `lib/url/mirror` takes its pending state from this provider alone: a mirror write the router
  // adopted mid-navigation dropped the navigation on main (1f's startup diagnostic, 2026-09-29).
  it("holds a mirror write through a pressed link and makes it when the run ends on the page", () => {
    state.path = "/collection";
    act(() => rerender(<App links={LINKS} />));
    window.history.replaceState(null, "", "/collection");
    const replace = vi.spyOn(window.history, "replaceState");
    try {
      press("/commanders");
      mirrorUrl("/collection?sort=set");
      expect(replace).not.toHaveBeenCalled();
      press("/commanders", false);
      expect(replace).toHaveBeenCalledWith(null, "", "/collection?sort=set");
    } finally {
      replace.mockRestore();
    }
  });
});

describe("a code-started push", () => {
  // What a slow navigation looks like to React: the push's update suspends, so the transition it
  // runs in stays pending until the new page arrives, which here it never does.
  const never = new Promise<never>(() => {});
  const handles: { stall: (on: boolean) => void; go: (href: string) => void } = {
    stall: () => {},
    go: () => {},
  };
  function Stall({ onReady }: { onReady: (stall: (on: boolean) => void) => void }) {
    const [on, setOn] = useState(false);
    useEffect(() => onReady(setOn), [onReady]);
    if (on) use(never);
    return null;
  }
  function Starter({ onReady }: { onReady: (go: (href: string) => void) => void }) {
    const { go } = usePendingPush();
    useEffect(() => onReady(go), [onReady, go]);
    return null;
  }
  const readyStall = (stall: (on: boolean) => void) => {
    handles.stall = stall;
  };
  const readyGo = (go: (href: string) => void) => {
    handles.go = go;
  };
  function Code({ starter }: { starter: boolean }) {
    return (
      <NavigationPendingProvider>
        <ShellMain className="">
          {starter && <Starter onReady={readyGo} />}
          <Stall onReady={readyStall} />
        </ShellMain>
      </NavigationPendingProvider>
    );
  }

  it("does not drop a push asked for as the page mounts", async () => {
    // A layout effect runs before any passive one, as a click replayed during hydration can: the
    // push must still navigate rather than find no runner and vanish.
    cleanup();
    routerPush.mockReset();
    function Early() {
      const { go } = usePendingPush();
      useLayoutEffect(() => go("/discover"), [go]);
      return null;
    }
    await act(async () => {
      render(
        <NavigationPendingProvider>
          <ShellMain className="">
            <Early />
          </ShellMain>
        </NavigationPendingProvider>,
      );
    });
    expect(routerPush).toHaveBeenCalledWith("/discover");
  });

  it("reaches the route's screen at 400ms, and keeps it after the component that started it unmounts", async () => {
    cleanup();
    routerPush.mockImplementation(() => handles.stall(true));
    const view = render(<Code starter />);
    await act(async () => handles.go("/commanders"));
    expect(routerPush).toHaveBeenCalledWith("/commanders");
    await act(async () => vi.advanceTimersByTime(OVERLAY_AFTER_MS - 1));
    expect(overlay()).toBeNull();
    await act(async () => vi.advanceTimersByTime(1));
    expect(overlay()?.textContent).toContain("Consulting the council");
    // Home's first run swaps out the replace flow that pressed confirm while the receipt loads.
    await act(async () => view.rerender(<Code starter={false} />));
    await act(async () => vi.advanceTimersByTime(1000));
    expect(overlay()?.textContent).toContain("Consulting the council");
    expect(overlay()?.className).not.toContain("pointer-events-none");
  });
});
