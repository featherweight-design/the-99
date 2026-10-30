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

// The orphan guard's inputs, as the provider hands them: a spy over the real hook.
const guard = vi.hoisted(() => ({ orphaned: [] as boolean[] }));
vi.mock("./orphan-guard", async (importOriginal) => {
  const real = await importOriginal<typeof import("./orphan-guard")>();
  return {
    useOrphanGuard: (...args: Parameters<typeof real.useOrphanGuard>) => {
      guard.orphaned.push(args[0]);
      return real.useOrphanGuard(...args);
    },
  };
});

const { default: Link } = await import("next/link");
const { NavigationPendingProvider, OVERLAY_AFTER_MS, ShellMain } = await import("./navigation-pending");
const { usePendingReport, usePendingContentScope } = await import("./pending-report");
const { OVERLAY_OUT_MS } = await import("./pending-overlay");
const { use, useEffect, useLayoutEffect, useState } = await import("react");
const { usePendingPush } = await import("./pending-push");
const { mirrorUrl } = await import("../../lib/url/mirror");
const { DeckToastStackHost } = await import("../decks/deck-toast-stack");
const { QuickAddFailedToast } = await import("../decks/quick-add-failed-toast");
const { TOAST_MS } = await import("../collection/edit-toast");
const { createPortal } = await import("react-dom");
const { COVERED_WITH_MAIN } = await import("./covered-layer");

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

  it("leaves no screen up when the run ends in the same tick the 400ms timer fires", () => {
    press("/commanders");
    // The 400ms timer and the link's pending state clearing land in one batch: the screen is drawn and its run is over.
    act(() => {
      vi.advanceTimersByTime(OVERLAY_AFTER_MS);
      state.pending.set("/commanders", false);
      rerender(<App links={LINKS} />);
    });
    act(() => vi.advanceTimersByTime(OVERLAY_OUT_MS + 50));
    expect(overlay()).toBeNull();
    expect(main().inert).toBe(false);
  });

  it("hands the orphan guard its state on every render, and never calls a run's own screen an orphan", () => {
    guard.orphaned.length = 0;
    press("/commanders");
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    expect(overlay()).not.toBeNull();
    press("/commanders", false);
    act(() => vi.advanceTimersByTime(OVERLAY_OUT_MS + 50));
    expect(overlay()).toBeNull();
    expect(guard.orphaned.length).toBeGreaterThan(3);
    expect(guard.orphaned).not.toContain(true);
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

// Collection tabs overlay fix, #1222 follow-up: a route tree that registers a content scope
// confines a same-scope navigation's busy/inert pair (and the overlay's own box) to that
// element, leaving the shell's <main> — and whatever a shared head renders above the scope —
// untouched and interactive.
describe("a registered content scope", () => {
  // The hook has to run INSIDE the provider's subtree, as `CollectionContentScope` does in the
  // app — called in the same component that creates `NavigationPendingProvider`, it would read
  // the context from above the provider instead of the one it mounts.
  function Scope({ links }: { links: string[] }) {
    const ref = usePendingContentScope((p) => p.startsWith("/collection"));
    return (
      <div ref={ref as React.Ref<HTMLDivElement>} data-testid="scope">
        {links.map((href) => (
          <Link key={href} href={href}>
            <Reporter href={href} />
          </Link>
        ))}
      </div>
    );
  }
  function ScopedApp({ links }: { links: string[] }) {
    return (
      <NavigationPendingProvider>
        <ShellMain className="">
          <Scope links={links} />
        </ShellMain>
      </NavigationPendingProvider>
    );
  }
  const scope = () => screen.getByTestId("scope");

  it("leaves main free and marks the scope instead, when neither page leaves it", () => {
    cleanup();
    state.path = "/collection";
    state.pending.clear();
    const { rerender: local } = render(<ScopedApp links={["/collection/sets", "/discover"]} />);
    state.pending.set("/collection/sets", true);
    act(() => local(<ScopedApp links={["/collection/sets", "/discover"]} />));
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    expect(overlay()).not.toBeNull();
    expect(main().hasAttribute("aria-busy")).toBe(false);
    // jsdom reads an untouched `.inert` as `undefined` rather than `false` — this run never
    // sets it on main at all, unlike the other tests here, which clear it after setting it.
    expect(main().inert).toBeFalsy();
    expect(scope().getAttribute("aria-busy")).toBe("true");
    expect(scope().inert).toBe(true);
  });

  it("falls back to main when the target leaves the scope", () => {
    cleanup();
    state.path = "/collection";
    state.pending.clear();
    const { rerender: local } = render(<ScopedApp links={["/collection/sets", "/discover"]} />);
    state.pending.set("/discover", true);
    act(() => local(<ScopedApp links={["/collection/sets", "/discover"]} />));
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    expect(overlay()).not.toBeNull();
    expect(main().getAttribute("aria-busy")).toBe("true");
    expect(scope().hasAttribute("aria-busy")).toBe(false);
  });

  it("falls back to main when the current page is already outside the scope", () => {
    cleanup();
    state.path = "/discover";
    state.pending.clear();
    const { rerender: local } = render(<ScopedApp links={["/collection/sets"]} />);
    state.pending.set("/collection/sets", true);
    act(() => local(<ScopedApp links={["/collection/sets"]} />));
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    expect(overlay()).not.toBeNull();
    expect(main().getAttribute("aria-busy")).toBe("true");
    expect(scope().hasAttribute("aria-busy")).toBe(false);
  });

  it("clears the scope's busy/inert when an already-escalated run retargets outside it", () => {
    // The rail and tab bar stay live while a confined run is up, so a press there can move the
    // same run's target from inside the scope to outside it before the run ends.
    cleanup();
    state.path = "/collection";
    state.pending.clear();
    const { rerender: local } = render(<ScopedApp links={["/collection/sets", "/discover"]} />);
    state.pending.set("/collection/sets", true);
    act(() => local(<ScopedApp links={["/collection/sets", "/discover"]} />));
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    expect(scope().getAttribute("aria-busy")).toBe("true");
    expect(main().hasAttribute("aria-busy")).toBe(false);
    state.pending.set("/discover", true);
    act(() => local(<ScopedApp links={["/collection/sets", "/discover"]} />));
    expect(scope().hasAttribute("aria-busy")).toBe(false);
    expect(scope().inert).toBe(false);
    expect(main().getAttribute("aria-busy")).toBe("true");
  });

  it("stops marking the scope once a confined run commits", () => {
    cleanup();
    state.path = "/collection";
    state.pending.clear();
    const { rerender: local } = render(<ScopedApp links={["/collection/sets"]} />);
    state.pending.set("/collection/sets", true);
    act(() => local(<ScopedApp links={["/collection/sets"]} />));
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    expect(scope().getAttribute("aria-busy")).toBe("true");
    state.path = "/collection/sets";
    state.pending.set("/collection/sets", false);
    act(() => local(<ScopedApp links={["/collection/sets"]} />));
    expect(scope().hasAttribute("aria-busy")).toBe(false);
    expect(scope().inert).toBe(false);
  });
});

// The deck toast stack is drawn by the shell outside <main> (so a toast can climb out of the page's stacking contexts),
// but it is the page's: a screen over <main> makes it inert too, so a receipt cannot start the old page's mutation over
// the loading screen, and the toast clock (which counts only while its toast can be pressed) stops with it.
describe("the page's layers outside main", () => {
  const done = vi.fn();
  function DeckApp({ links, scoped = false, toast = true }: { links: string[]; scoped?: boolean; toast?: boolean }) {
    return (
      <NavigationPendingProvider>
        <ShellMain className="">
          {scoped ? <DeckScope links={links} /> : links.map((href) => (
            <Link key={href} href={href}>
              <Reporter href={href} />
            </Link>
          ))}
          {/* A deck toast mounts from a press, after the shell (and its stack) are drawn. */}
          {toast ? <QuickAddFailedToast insideProps={{}} onRetry={() => {}} onDone={done} /> : null}
        </ShellMain>
        <DeckToastStackHost />
      </NavigationPendingProvider>
    );
  }
  function DeckScope({ links }: { links: string[] }) {
    const ref = usePendingContentScope((p) => p.startsWith("/collection"));
    return (
      <div ref={ref as React.Ref<HTMLDivElement>}>
        {links.map((href) => (
          <Link key={href} href={href}>
            <Reporter href={href} />
          </Link>
        ))}
      </div>
    );
  }
  const stack = () => document.querySelector<HTMLElement>("[data-deck-toast-stack]")!;

  it("makes the deck toast stack inert with main, holds its toast's clock, and frees both at commit", () => {
    cleanup();
    done.mockClear();
    state.path = "/decks/abc";
    state.pending.clear();
    const { rerender: local } = render(<DeckApp links={["/commanders"]} toast={false} />);
    local(<DeckApp links={["/commanders"]} />);
    // The toast is in the shell's stack, not in <main>.
    expect(stack().contains(screen.getByRole("alert"))).toBe(true);
    expect(main().contains(screen.getByRole("alert"))).toBe(false);
    state.pending.set("/commanders", true);
    act(() => local(<DeckApp links={["/commanders"]} />));
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    expect(main().inert).toBe(true);
    expect(stack().hasAttribute("inert")).toBe(true);
    // The whole window spent under the screen spends none of the toast's.
    act(() => vi.advanceTimersByTime(TOAST_MS + 1000));
    expect(done).not.toHaveBeenCalled();
    state.path = "/commanders";
    state.pending.set("/commanders", false);
    act(() => local(<DeckApp links={["/commanders"]} />));
    expect(stack().hasAttribute("inert")).toBe(false);
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(done).toHaveBeenCalled();
  });

  it("leaves the stack live when the screen covers only a registered scope", () => {
    cleanup();
    state.path = "/collection";
    state.pending.clear();
    const { rerender: local } = render(<DeckApp scoped links={["/collection/sets"]} />);
    state.pending.set("/collection/sets", true);
    act(() => local(<DeckApp scoped links={["/collection/sets"]} />));
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    expect(overlay()).not.toBeNull();
    expect(stack().hasAttribute("inert")).toBe(false);
  });
});

describe("a page's surface portalled to the body", () => {
  // The way the body-portalled surfaces mark their root (deck-card-overflow, printed-in-control, card-tag-picker): a
  // portal OUT of <main>, opened from the page before the navigation escalates.
  function PortalApp({ open }: { open: boolean }) {
    return (
      <NavigationPendingProvider>
        <ShellMain className="">
          <Link href="/commanders">
            <Reporter href="/commanders" />
          </Link>
          {open
            ? createPortal(
                <div data-testid="portalled" {...{ [COVERED_WITH_MAIN]: "" }}>
                  <button type="button">Press</button>
                </div>,
                document.body,
              )
            : null}
        </ShellMain>
      </NavigationPendingProvider>
    );
  }
  const portalled = () => screen.getByTestId("portalled");

  it("goes inert with main while the screen covers it, and is freed at commit", () => {
    cleanup();
    state.path = "/";
    state.pending.clear();
    const { rerender: local } = render(<PortalApp open />);
    expect(main().contains(portalled())).toBe(false);
    state.pending.set("/commanders", true);
    act(() => local(<PortalApp open />));
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    expect(main().inert).toBe(true);
    expect(portalled().hasAttribute("inert")).toBe(true);
    state.path = "/commanders";
    state.pending.set("/commanders", false);
    act(() => local(<PortalApp open />));
    expect(portalled().hasAttribute("inert")).toBe(false);
  });

  it("catches one that mounts while the screen is already up, and frees it at commit", async () => {
    cleanup();
    state.path = "/";
    state.pending.clear();
    const { rerender: local } = render(<PortalApp open={false} />);
    state.pending.set("/commanders", true);
    act(() => local(<PortalApp open={false} />));
    act(() => vi.advanceTimersByTime(OVERLAY_AFTER_MS));
    expect(main().inert).toBe(true);
    // Mounted under the screen (a toast whose action resolves there): the observer's records arrive as a microtask.
    await act(async () => local(<PortalApp open />));
    expect(portalled().hasAttribute("inert")).toBe(true);
    state.path = "/commanders";
    state.pending.set("/commanders", false);
    act(() => local(<PortalApp open />));
    expect(portalled().hasAttribute("inert")).toBe(false);
  });
});

describe("the URL mirrors write only on the router's committed page", () => {
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

// The deck visit (`lib/decks/visit`): the provider reports every committed path, so a Tuning
// tool's result stays across the deck's own sub-pages and resets on leaving it.
describe("NavigationPendingProvider: the deck visit", () => {
  it("keeps the visit across the deck's sub-pages and ends it on another route", async () => {
    const { resetDeckVisitForTests, visitBaseline } = await import("../../lib/decks/visit");
    const A = "11111111-1111-4111-8111-111111111111";
    const first = { okKey: "1", runId: null };
    const later = { okKey: "2", runId: null };
    const go = (path: string) => {
      state.path = path;
      act(() => rerender(<App links={LINKS} />));
    };
    resetDeckVisitForTests();
    go(`/decks/${A}`);
    visitBaseline(A, "suggested", first);
    go(`/decks/${A}/changes`);
    go(`/decks/${A}`);
    expect(visitBaseline(A, "suggested", later)).toEqual(first);
    go("/collection");
    go(`/decks/${A}`);
    expect(visitBaseline(A, "suggested", later)).toEqual(later);
  });
});

describe("the stuck-loader report (NAV_STALL_LOG_ENABLED)", () => {
  const beacon = vi.fn(() => true);
  beforeEach(() => {
    beacon.mockClear();
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
  });
  function StallApp({ stall }: { stall: { deployment: string | null } | null }) {
    return (
      <NavigationPendingProvider stall={stall}>
        <ShellMain className="">
          {LINKS.map((href) => (
            <Link key={href} href={href}>
              <Reporter href={href} />
            </Link>
          ))}
        </ShellMain>
      </NavigationPendingProvider>
    );
  }
  async function hang(stall: { deployment: string | null } | null, ms: number) {
    cleanup();
    ({ rerender } = render(<StallApp stall={stall} />));
    state.pending.set("/commanders", true);
    act(() => rerender(<StallApp stall={stall} />));
    // Two steps, so React draws the 400ms overlay before the report reads the page, as a browser would.
    act(() => vi.advanceTimersByTime(Math.min(ms, 1_000)));
    act(() => vi.advanceTimersByTime(ms - Math.min(ms, 1_000)));
  }

  it("reports a navigation still pending at 8s, once, with the overlay up", async () => {
    await hang({ deployment: "dpl_a" }, 8_000);
    expect(beacon).toHaveBeenCalledTimes(1);
    const body = JSON.parse(await (beacon.mock.calls[0] as unknown as [string, Blob])[1].text());
    expect(body).toMatchObject({ kind: "pending", from: "/", to: "/commanders", loader: "overlay", moved: false });
    act(() => vi.advanceTimersByTime(60_000));
    expect(beacon).toHaveBeenCalledTimes(1);
  });
  it("reports nothing for a navigation that lands before 8s", async () => {
    await hang({ deployment: "dpl_a" }, 7_999);
    state.pending.set("/commanders", false);
    act(() => rerender(<StallApp stall={{ deployment: "dpl_a" }} />));
    act(() => vi.advanceTimersByTime(60_000));
    expect(beacon).not.toHaveBeenCalled();
  });
  it("reports nothing while the switch is off", async () => {
    await hang(null, 60_000);
    expect(beacon).not.toHaveBeenCalled();
  });

  it("reports a page that committed into an in-page loading screen and stayed there", async () => {
    cleanup();
    window.history.replaceState(null, "", "/decks/0b49cb44-8ae2-4c19-b558-633344a2f4ed");
    const { LoadingScreen } = await import("./loading-screen");
    const { shellCopy } = await import("../../lib/copy/shell");
    render(
      <NavigationPendingProvider stall={{ deployment: null }}>
        <ShellMain className="">
          <LoadingScreen copy={shellCopy.loading.decks} />
        </ShellMain>
      </NavigationPendingProvider>,
    );
    act(() => vi.advanceTimersByTime(8_000));
    expect(beacon).toHaveBeenCalledTimes(1);
    const body = JSON.parse(await (beacon.mock.calls[0] as unknown as [string, Blob])[1].text());
    expect(body).toMatchObject({ kind: "fallback", loader: "fallback", to: "/decks/[x]", moved: true });
  });
  it("counts a loading screen no press led to as its own navigation: a second stall on the same page reports", async () => {
    cleanup();
    window.history.replaceState(null, "", "/decks/0b49cb44-8ae2-4c19-b558-633344a2f4ed");
    const { LoadingScreen } = await import("./loading-screen");
    const { shellCopy } = await import("../../lib/copy/shell");
    const draw = () =>
      render(
        <NavigationPendingProvider stall={{ deployment: null }}>
          <ShellMain className="">
            <LoadingScreen copy={shellCopy.loading.decks} />
          </ShellMain>
        </NavigationPendingProvider>,
      );
    draw();
    act(() => vi.advanceTimersByTime(8_000));
    expect(beacon).toHaveBeenCalledTimes(1);
    // A route that commits its loading boundary at once, or a change of query, reports no press.
    cleanup();
    draw();
    act(() => vi.advanceTimersByTime(8_000));
    expect(beacon).toHaveBeenCalledTimes(2);
  });
  it("reports a press that hangs pending and then in its own fallback ONCE", async () => {
    const { LoadingScreen } = await import("./loading-screen");
    const { shellCopy } = await import("../../lib/copy/shell");
    function Pressed({ landed }: { landed: boolean }) {
      return (
        <NavigationPendingProvider stall={{ deployment: null }}>
          <ShellMain className="">
            <Link href="/commanders">
              <Reporter href="/commanders" />
            </Link>
            {landed ? <LoadingScreen copy={shellCopy.loading.decks} /> : null}
          </ShellMain>
        </NavigationPendingProvider>
      );
    }
    cleanup();
    window.history.replaceState(null, "", "/");
    const view = render(<Pressed landed={false} />);
    state.pending.set("/commanders", true);
    act(() => view.rerender(<Pressed landed={false} />));
    act(() => vi.advanceTimersByTime(1_000));
    act(() => vi.advanceTimersByTime(7_000));
    expect(beacon).toHaveBeenCalledTimes(1);
    // The press commits into the destination's loading screen, which then hangs too.
    window.history.replaceState(null, "", "/commanders");
    state.path = "/commanders";
    state.pending.set("/commanders", false);
    act(() => view.rerender(<Pressed landed />));
    act(() => vi.advanceTimersByTime(60_000));
    expect(beacon).toHaveBeenCalledTimes(1);
  });
  it("leaves the pending overlay's own screen to the provider: it never reports as a fallback", async () => {
    cleanup();
    const { LoadingScreen } = await import("./loading-screen");
    const { shellCopy } = await import("../../lib/copy/shell");
    render(
      <NavigationPendingProvider stall={{ deployment: null }}>
        <LoadingScreen copy={shellCopy.loading.decks} watch={false} />
      </NavigationPendingProvider>,
    );
    act(() => vi.advanceTimersByTime(60_000));
    expect(beacon).not.toHaveBeenCalled();
  });
});
