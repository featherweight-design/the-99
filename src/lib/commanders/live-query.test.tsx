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

// The fallback installs a wrapper per module instance, and each test imports a
// fresh one — so the pristine methods are put back between them, the way a real
// document only ever has one store.
const pristine = {
  pushState: window.history.pushState,
  replaceState: window.history.replaceState,
};

afterEach(() => {
  window.history.pushState = pristine.pushState;
  window.history.replaceState = pristine.replaceState;
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

  // The fallback path, which is what a browser without the Navigation API takes.
  // `popstate` alone would miss this: browsers emit none for a same-document
  // push, and that is exactly what the nav link's reset is.
  it("follows a same-document push with no Navigation API", async () => {
    window.history.replaceState(null, "", "/commanders?a=free");
    const shown = await mountProbe();

    act(() => {
      window.history.pushState(null, "", "/commanders");
    });

    expect(shown()).toBe("(empty)");
  });

  // And it delegates: whatever was installed before still runs, and still
  // returns what it returned.
  it("leaves the write it wraps working", async () => {
    await mountProbe();
    act(() => {
      window.history.replaceState({ marker: 1 }, "", "/commanders?q=krenko");
    });
    expect(window.location.search).toBe("?q=krenko");
    expect(window.history.state).toEqual({ marker: 1 });
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

  // Where the platform can answer, nothing is patched at all — so a router that
  // installs its own history wrappers is neither replaced by this nor tangled
  // with it.
  it("leaves history alone when the Navigation API is there", async () => {
    stubNavigation();
    const before = window.history.pushState;
    await mountProbe();
    expect(window.history.pushState).toBe(before);
  });
});
