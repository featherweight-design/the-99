// The store exists for one event React cannot see: a navigation landing back on
// the route the component already occupies. It keeps the tree mounted with
// identical props, and `useSearchParams` stays silent — so without this the lane
// sits on state the URL has moved away from, and the next interaction writes that
// stale state back into the URL.
//
// jsdom has no Navigation API, so these stub one to exercise the path browsers
// take, and cover the `popstate`-only fallback with the real event.
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type Listener = () => void;

function stubNavigation() {
  const listeners = new Set<Listener>();
  Object.defineProperty(window, "navigation", {
    configurable: true,
    value: {
      addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
    },
  });
  // What the browser does after a `pushState`, a `replaceState` or a traversal.
  return () => {
    for (const listener of listeners) listener();
  };
}

afterEach(() => {
  window.history.replaceState(null, "", "/commanders");
  Reflect.deleteProperty(window, "navigation");
  vi.resetModules();
});

// Imported per test: the store installs its subscription once per module
// instance, so each test needs a fresh one — hence `vi.resetModules()` above.
async function mountProbe() {
  const { useLiveQuery } = await import("./live-query");
  function Live() {
    return <output data-testid="q">{useLiveQuery("a=server") || "(empty)"}</output>;
  }
  render(<Live />);
  return () => screen.getByTestId("q").textContent;
}

describe("useLiveQuery", () => {
  it("reads the query as it stands, without the leading ?", async () => {
    window.history.replaceState(null, "", "/commanders?a=free");
    const shown = await mountProbe();
    expect(shown()).toBe("a=free");
  });

  it("follows a router navigation, which is the case React cannot see", async () => {
    const entryChanged = stubNavigation();
    window.history.replaceState(null, "", "/commanders?a=free");
    const shown = await mountProbe();

    act(() => {
      window.history.pushState(null, "", "/commanders");
      entryChanged();
    });

    expect(shown()).toBe("(empty)");
  });

  it("follows the rack's own mirror write", async () => {
    const entryChanged = stubNavigation();
    const shown = await mountProbe();

    act(() => {
      window.history.replaceState(null, "", "/commanders?c=r");
      entryChanged();
    });

    expect(shown()).toBe("c=r");
  });

  // The fallback, and the case the bug report actually named. jsdom fires
  // `popstate` on a task of its own, so this awaits it.
  it("follows a back navigation with no Navigation API at all", async () => {
    const shown = await mountProbe();
    act(() => {
      window.history.pushState(null, "", "/commanders?a=free");
    });

    await act(async () => {
      window.history.back();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(shown()).toBe("(empty)");
  });

  // Nothing is patched, so a router that installs its own history wrappers is
  // neither replaced by this nor tangled with it.
  it("leaves history itself alone", async () => {
    const before = window.history.pushState;
    await mountProbe();
    expect(window.history.pushState).toBe(before);
  });
});
