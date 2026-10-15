import { act, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FadingImg, HydratedImg, useHydrated } from "./hydrated-art";

// jsdom has no IntersectionObserver; this one reports each observed element as in view when told.
let observed: { el: Element; cb: IntersectionObserverCallback }[] = [];
class FakeObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    observed.push({ el, cb: this.cb });
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}
const bringIntoView = () =>
  act(() => {
    for (const { el, cb } of observed) cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], {} as IntersectionObserver);
  });

beforeEach(() => {
  observed = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});
afterEach(() => vi.unstubAllGlobals());

const SRC = "https://cards.scryfall.io/art_crop/front/a/b/ab.jpg";
const SRCSET = "https://cards.scryfall.io/large/front/a/b/ab.jpg 2x";

describe("useHydrated", () => {
  function Probe() {
    return <span data-testid="h">{String(useHydrated())}</span>;
  }

  it("is false in the server render, which is what hydration renders against", () => {
    expect(renderToString(<Probe />)).toContain("false");
  });

  it("is true once the page has rendered in the browser", () => {
    render(<Probe />);
    expect(screen.getByTestId("h").textContent).toBe("true");
  });
});

describe("HydratedImg", () => {
  it("asks for nothing in the server render unless it is eager", () => {
    expect(renderToString(<HydratedImg src={SRC} alt="" />)).not.toContain(SRC);
    expect(renderToString(<HydratedImg src={SRC} alt="" eager />)).toContain(SRC);
  });

  it("withholds a srcSet with its src, which the browser would otherwise fetch on its own", () => {
    expect(renderToString(<HydratedImg src={SRC} srcSet={SRCSET} alt="" />)).not.toContain(SRCSET);
    const { container } = render(<HydratedImg src={SRC} srcSet={SRCSET} alt="" />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("srcset")).toBeNull();
    bringIntoView();
    expect(img.getAttribute("srcset")).toBe(SRCSET);
  });

  it("asks for its art only once it nears the viewport, which no server render can be", () => {
    const { container } = render(<HydratedImg src={SRC} alt="" className="art" />);
    const img = container.querySelector("img")!;
    // Kept in the tree with its box, so the surface's layout does not move when the art arrives.
    expect(img.className).toBe("art");
    expect(img.getAttribute("src")).toBeNull();
    bringIntoView();
    expect(img.getAttribute("src")).toBe(SRC);
  });

  it("loads at once where there is no observer to wait on, rather than never", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    // The server has no observer either, and must still leave the src out.
    expect(renderToString(<HydratedImg src={SRC} alt="" />)).not.toContain(SRC);
    const { container } = render(<HydratedImg src={SRC} alt="" />);
    expect(container.querySelector("img")!.getAttribute("src")).toBe(SRC);
  });

  it("draws eager art at once, never waiting on the viewport", () => {
    const { container } = render(<HydratedImg src={SRC} alt="" eager />);
    expect(container.querySelector("img")!.getAttribute("src")).toBe(SRC);
    expect(observed).toHaveLength(0);
  });
});

describe("deferred art's arrival", () => {
  // jsdom loads nothing, so each case says whether the image has settled when its source is set.
  // A settled image is a loaded one unless `broken`: a complete image with no width never loaded.
  const settled = (complete: boolean, broken = false) => {
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(broken ? 0 : 488);
    return vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(complete);
  };
  afterEach(() => vi.restoreAllMocks());

  it("holds a deferred img pending until it loads, then fades it in once", () => {
    settled(false);
    const { container } = render(<HydratedImg src={SRC} alt="" />);
    const img = container.querySelector("img")!;
    // No mark before its source is asked for: nothing hides art the page has not asked for yet.
    expect(img.dataset.arrival).toBeUndefined();
    bringIntoView();
    expect(img.dataset.arrival).toBe("pending");
    act(() => void img.dispatchEvent(new Event("load")));
    expect(img.dataset.arrival).toBe("in");
  });

  it("releases a broken image rather than hiding it behind a fade that never ends", () => {
    settled(false);
    const { container } = render(<HydratedImg src={SRC} alt="" />);
    const img = container.querySelector("img")!;
    bringIntoView();
    act(() => void img.dispatchEvent(new Event("error")));
    expect(img.dataset.arrival).toBe("failed");
  });

  it("marks art that broke before it was armed as failed, never as loaded", () => {
    settled(true, true);
    const { container } = render(<HydratedImg src={SRC} alt="" />);
    bringIntoView();
    expect(container.querySelector("img")!.dataset.arrival).toBe("failed");
  });

  it("draws art that has already settled (cached, or already broken) at once, with no fade", () => {
    settled(true);
    const { container } = render(<HydratedImg src={SRC} alt="" />);
    bringIntoView();
    expect(container.querySelector("img")!.dataset.arrival).toBe("done");
  });

  it("fades eager art too when it is still loading as the page hydrates", () => {
    settled(false);
    const { container } = render(<HydratedImg src={SRC} alt="" eager />);
    const img = container.querySelector("img")!;
    expect(img.dataset.arrival).toBe("pending");
    act(() => void img.dispatchEvent(new Event("load")));
    expect(img.dataset.arrival).toBe("in");
  });

  it("leaves eager art alone when it painted before the page hydrated", () => {
    settled(true);
    const { container } = render(<HydratedImg src={SRC} alt="" eager />);
    expect(container.querySelector("img")!.dataset.arrival).toBe("done");
  });

  it("fades a plain lazily loaded img in the same way", () => {
    settled(false);
    const { container } = render(<FadingImg src={SRC} alt="" loading="lazy" />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe(SRC);
    expect(img.dataset.arrival).toBe("pending");
    act(() => void img.dispatchEvent(new Event("load")));
    expect(img.dataset.arrival).toBe("in");
  });

  it("fades a new source in afresh, and drops the mark when its source goes", () => {
    settled(false);
    const { container, rerender } = render(<HydratedImg src={SRC} alt="" />);
    const img = container.querySelector("img")!;
    bringIntoView();
    act(() => void img.dispatchEvent(new Event("load")));
    expect(img.dataset.arrival).toBe("in");
    rerender(<HydratedImg src={`${SRC}?v=2`} alt="" />);
    expect(img.dataset.arrival).toBe("pending");
    // Its source taken away (a card with no art any more): the mark goes with it, so nothing is held.
    rerender(<HydratedImg src={undefined} alt="" />);
    expect(img.dataset.arrival).toBeUndefined();
  });
});

// The marks above do nothing on their own: the fade is the stylesheet's, so its contract is pinned too.
describe("the arrival's CSS", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const motionBlock = (selector: string) => {
    const at = css.indexOf(selector);
    const open = css.lastIndexOf("@media", at);
    const span = at > 0 ? css.slice(open, at) : "";
    // The selector must sit inside that block, not after one that closed before it.
    return /\n\}/.test(span) ? "" : span;
  };
  it("fades from transparent to the element's own opacity", () => {
    expect(css).toMatch(/@keyframes art-in \{\s*from \{ opacity: 0; \}\s*\}/);
  });
  it("holds pending art transparent and fades `in` on the fade length and the shared curve, with no beat, only where motion is welcome", () => {
    expect(css).toMatch(/\[data-arrival="pending"\]\[data-arrival\] \{ opacity: 0 !important; \}/);
    expect(css).toMatch(/\[data-arrival="in"\] \{ animation: art-in var\(--motion-fade\) var\(--motion-ease\); \}/);
    expect(motionBlock('[data-arrival="pending"]')).toMatch(/^@media \(prefers-reduced-motion: no-preference\) \{/);
    expect(motionBlock('[data-arrival="in"]')).toMatch(/^@media \(prefers-reduced-motion: no-preference\) \{/);
  });
});
