import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardTagList } from "./card-tag-picker";

/** A field at `rect` in a window of `innerHeight`, with an optional visual viewport (a phone's keyboard shrinks it). */
function place(rect: { top: number; bottom: number; left: number; width: number }, o: { innerHeight: number; innerWidth: number; vv?: { offsetTop: number; height: number; offsetLeft?: number; width?: number } }) {
  vi.stubGlobal("innerHeight", o.innerHeight);
  vi.stubGlobal("innerWidth", o.innerWidth);
  Object.defineProperty(window, "visualViewport", { configurable: true, value: o.vv ? { offsetLeft: 0, width: o.innerWidth, ...o.vv, addEventListener: () => {}, removeEventListener: () => {} } : null });
  const field = document.createElement("textarea");
  field.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, height: rect.bottom - rect.top, x: rect.left, y: rect.top, toJSON: () => ({}) });
  document.body.appendChild(field);
  render(
    <CardTagList
      id="t" listId="l" open query="sol" local={[]} activeIndex={0} remoteStatus="ok" scoped={false} pick={() => {}} anchor={{ current: field }}
      options={[{ oracleId: "a", name: "Sol Ring", meta: "Artifact", group: "any" }]}
    />,
  );
  return screen.getByRole("listbox");
}

afterEach(() => {
  cleanup();
  document.querySelectorAll("textarea").forEach((n) => n.remove());
  vi.unstubAllGlobals();
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
});

describe("CardTagList floating under an anchor", () => {
  it("renders on <body>, under the field, as wide as it, held to the room left in the window", () => {
    const ul = place({ top: 100, bottom: 140, left: 20, width: 300 }, { innerHeight: 800, innerWidth: 1000 });
    expect(ul.parentElement).toBe(document.body);
    expect(ul.style).toMatchObject({ position: "fixed", top: "144px", left: "20px", width: "300px", maxHeight: "648px" });
  });

  it("settles on the layout viewport's left and width when the visual viewport gives none, never NaN (and never re-sets forever)", () => {
    vi.stubGlobal("innerHeight", 800);
    vi.stubGlobal("innerWidth", 1000);
    // A partial visual viewport, as some tests and older engines give: no offsetLeft, no width.
    Object.defineProperty(window, "visualViewport", { configurable: true, value: { offsetTop: 10, height: 600, addEventListener() {}, removeEventListener() {} } });
    const field = document.createElement("textarea");
    field.getBoundingClientRect = () => ({ top: 100, bottom: 140, left: 20, right: 320, width: 300, height: 40, x: 20, y: 100, toJSON: () => ({}) });
    document.body.appendChild(field);
    render(
      <CardTagList
        id="t" listId="l" open query="sol" local={[]} activeIndex={0} remoteStatus="ok" scoped={false} pick={() => {}} anchor={{ current: field }}
        options={[{ oracleId: "a", name: "Sol Ring", meta: "Artifact", group: "any" }]}
      />,
    );
    expect(screen.getByRole("listbox").style).toMatchObject({ left: "20px", width: "300px" });
  });

  it("follows its anchor when the anchor changes size with nothing scrolled (a field growing with its words)", () => {
    const observer: { fire?: () => void } = {};
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { observer.fire = callback; }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
    });
    const rect = { top: 100, bottom: 140, left: 20, width: 300 };
    const ul = place(rect, { innerHeight: 800, innerWidth: 1000 });
    expect(ul.style.top).toBe("144px");
    // The field grew by two lines: its foot is 46px lower, and only its own size changed.
    rect.bottom = 186;
    act(() => observer.fire?.());
    expect(screen.getByRole("listbox").style.top).toBe("190px");
    cleanup();
    expect(disconnect).toHaveBeenCalled();
  });

  it("never wider than 440px or past the window's edges", () => {
    expect(place({ top: 100, bottom: 140, left: 700, width: 600 }, { innerHeight: 800, innerWidth: 800 }).style).toMatchObject({ width: "440px", left: "352px" });
  });

  it("is placed inside the visible interval when zoomed in, not the layout viewport's", () => {
    // Pinched in on the right of a 1000px page: the visible part is x 600 to 900. A 400px-wide field at x 100 is mostly off it.
    const ul = place({ top: 100, bottom: 140, left: 100, width: 400 }, { innerHeight: 800, innerWidth: 1000, vv: { offsetTop: 0, height: 800, offsetLeft: 600, width: 300 } });
    expect(ul.style).toMatchObject({ left: "608px", width: "284px" });
  });

  it("holds to the VISIBLE room above a phone's keyboard, not the layout viewport's", () => {
    // The keyboard leaves 300px visible; the field's bottom is at 140, so 300 - 144 - 8 = 148px under it.
    const ul = place({ top: 100, bottom: 140, left: 20, width: 300 }, { innerHeight: 800, innerWidth: 400, vv: { offsetTop: 0, height: 300 } });
    expect(ul.style.maxHeight).toBe("148px");
  });

  it("opens above the field when the visible room under it is a row or less and there is more above", () => {
    // Field low in a 400px visible area: 20px under it, 280px above it.
    const ul = place({ top: 300, bottom: 372, left: 20, width: 300 }, { innerHeight: 800, innerWidth: 400, vv: { offsetTop: 0, height: 400 } });
    expect(ul.style.top).toBe("auto");
    expect(ul.style.bottom).toBe("504px");
    expect(ul.style.maxHeight).toBe("288px");
  });

  it("claims no more room than is left, none at all when there is none", () => {
    // Field filling a 400px visible area: nothing under it and nothing above it.
    const ul = place({ top: 10, bottom: 390, left: 20, width: 300 }, { innerHeight: 800, innerWidth: 400, vv: { offsetTop: 0, height: 400 } });
    expect(ul.style.maxHeight).toBe("0px");
  });
});

describe("CardTagList's active option", () => {
  const options = [0, 1, 2].map((i) => ({ oracleId: `c${i}`, name: `Card ${i}`, meta: "Artifact", group: "any" as const }));
  const draw = (activeIndex: number) => (
    <CardTagList id="t" listId="l" open query="car" local={[]} activeIndex={activeIndex} remoteStatus="ok" scoped={false} pick={() => {}} options={options} />
  );

  /** jsdom lays nothing out: give the list a 100px window over three 40px options. */
  function layOut() {
    const ul = screen.getByRole("listbox");
    Object.defineProperty(ul, "clientHeight", { configurable: true, value: 100 });
    screen.getAllByRole("option").forEach((o, i) => {
      Object.defineProperty(o, "offsetTop", { configurable: true, value: i * 40 });
      Object.defineProperty(o, "offsetHeight", { configurable: true, value: 40 });
    });
    return ul;
  }

  it("is scrolled into view inside the list as the arrow keys move it, only as far as it needs", () => {
    const { rerender } = render(draw(0));
    const ul = layOut();
    rerender(draw(2));
    // Option 2 spans 80 to 120 and the window shows 0 to 100: scrolled down by 20, no more.
    expect(ul.scrollTop).toBe(20);
    rerender(draw(0));
    expect(ul.scrollTop).toBe(0);
    rerender(draw(1));
    expect(ul.scrollTop).toBe(0);
  });

  it("never moves the page", () => {
    const original = Element.prototype.scrollIntoView;
    const moved = vi.fn();
    Element.prototype.scrollIntoView = moved;
    try {
      const { rerender } = render(draw(0));
      layOut();
      rerender(draw(2));
      expect(moved).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });
});
