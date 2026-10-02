import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mirrorUrl, setNavigationPending } from "./mirror";

let replace: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  window.history.replaceState(null, "", "/collection?sort=name");
  replace = vi.spyOn(window.history, "replaceState");
});
afterEach(() => {
  setNavigationPending(false);
  replace.mockRestore();
});

describe("mirrorUrl", () => {
  it("writes a URL that differs from the live one", () => {
    mirrorUrl("/collection?sort=quantity");
    expect(replace).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("?sort=quantity");
  });

  // Rule 1: the write Next's router adopted over a pending push was the page's own current URL.
  it("makes no write when the URL it would write is the live one", () => {
    mirrorUrl("/collection?sort=name");
    mirrorUrl(new URL("/collection?sort=name", window.location.href));
    expect(replace).not.toHaveBeenCalled();
  });

  it("resolves a relative query against the live path", () => {
    mirrorUrl("?sort=name");
    expect(replace).not.toHaveBeenCalled();
    mirrorUrl("?sort=set");
    expect(window.location.pathname + window.location.search).toBe("/collection?sort=set");
  });

  it("passes the history state it is given through", () => {
    const state = { kept: true };
    mirrorUrl("/collection?sort=set", state);
    expect(replace).toHaveBeenCalledWith(state, "", "/collection?sort=set");
  });

  // Rule 2: a mirror never moves the page. After a Back or Forward the address is already the
  // destination, so a late write from the page being left must not put its own path back.
  it("makes no write naming a path other than the live one", () => {
    window.history.pushState(null, "", "/decks");
    mirrorUrl("/collection?sort=set");
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/decks");
  });

  // Rule 3: a legitimate write racing a tap stands down while the navigation is pending.
  it("makes no write while a navigation is pending", () => {
    setNavigationPending(true);
    mirrorUrl("/collection?sort=set");
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?sort=name");
  });

  it("makes the last held write when the navigation ends on the same path", () => {
    setNavigationPending(true);
    mirrorUrl("/collection?sort=set");
    mirrorUrl("/collection?sort=quantity");
    setNavigationPending(false);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("?sort=quantity");
  });

  it("drops the held write when the navigation left the path", () => {
    setNavigationPending(true);
    mirrorUrl("/collection?sort=set");
    window.history.pushState(null, "", "/decks");
    setNavigationPending(false);
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/decks");
  });
});
