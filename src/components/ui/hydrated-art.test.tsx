import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HydratedImg, useHydrated } from "./hydrated-art";

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

  it("draws eager art at once, never waiting on the viewport", () => {
    const { container } = render(<HydratedImg src={SRC} alt="" eager />);
    expect(container.querySelector("img")!.getAttribute("src")).toBe(SRC);
    expect(observed).toHaveLength(0);
  });
});
