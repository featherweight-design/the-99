// The app icon's badge (push PR 5, G6): the Home slot's count as the bar shows it, set where the Badging API exists and
// cleared at 0. Where it is missing or refuses, nothing throws.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const h = vi.hoisted(() => ({ pathname: "/decks" }));
vi.mock("next/navigation", () => ({ usePathname: () => h.pathname }));
import { AppBadge } from "./app-badge";

type Badging = { setAppBadge?: unknown; clearAppBadge?: unknown };
const nav = navigator as Navigator & Badging;

beforeEach(() => {
  h.pathname = "/decks";
});

afterEach(() => {
  Reflect.deleteProperty(nav, "setAppBadge");
  Reflect.deleteProperty(nav, "clearAppBadge");
});

function badging() {
  const setAppBadge = vi.fn(async () => {});
  const clearAppBadge = vi.fn(async () => {});
  Object.assign(nav, { setAppBadge, clearAppBadge });
  return { setAppBadge, clearAppBadge };
}

describe("the app icon's badge", () => {
  it("carries the Home slot's count away from Home", () => {
    const { setAppBadge, clearAppBadge } = badging();
    render(<AppBadge badges={{ home: 4, friends: 2 }} />);
    expect(setAppBadge).toHaveBeenCalledWith(4);
    expect(clearAppBadge).not.toHaveBeenCalled();
  });

  it("clears at 0: no count, and on Home, where the slot drops its count", () => {
    const { setAppBadge, clearAppBadge } = badging();
    render(<AppBadge badges={{}} />);
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
    h.pathname = "/";
    render(<AppBadge badges={{ home: 4 }} />);
    expect(clearAppBadge).toHaveBeenCalledTimes(2);
    expect(setAppBadge).not.toHaveBeenCalled();
  });

  it("follows a new count from the server", () => {
    const { setAppBadge, clearAppBadge } = badging();
    const { rerender } = render(<AppBadge badges={{ home: 1 }} />);
    rerender(<AppBadge badges={{ home: 3 }} />);
    expect(setAppBadge).toHaveBeenLastCalledWith(3);
    rerender(<AppBadge badges={{}} />);
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it("does nothing and throws nothing without the Badging API, or when the call refuses or throws", async () => {
    expect(() => render(<AppBadge badges={{ home: 2 }} />)).not.toThrow();
    Object.assign(nav, { setAppBadge: vi.fn(() => Promise.reject(new Error("NotAllowedError"))) });
    expect(() => render(<AppBadge badges={{ home: 2 }} />)).not.toThrow();
    await Promise.resolve();
    Object.assign(nav, { setAppBadge: vi.fn(() => { throw new Error("sync"); }) });
    expect(() => render(<AppBadge badges={{ home: 2 }} />)).not.toThrow();
  });
});
