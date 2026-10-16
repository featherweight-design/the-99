// The hook that runs quick return: it reads the scroll once a frame, publishes the header's height and the offset
// sticky heads ride under, keeps the field-focus attribute, and slides only between away and back.
import { act, render } from "@testing-library/react";
import { StrictMode, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPageField, slidesInto, useQuickReturn } from "./use-quick-return";

const nav = vi.hoisted(() => ({ path: "/collection" }));
const resize = vi.hoisted(() => ({ height: 79, fire: () => {} }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));

function Probe() {
  const ref = useRef<HTMLElement>(null);
  const { mode, slides } = useQuickReturn(ref);
  return (
    <>
      <header ref={ref} data-mode={mode} data-slides={String(slides)} />
      <main>
        <input aria-label="Add a card" />
        <input type="checkbox" aria-label="Owned" />
      </main>
    </>
  );
}

const header = () => document.querySelector("header")!;
async function scrollTo(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  await act(async () => {
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersToNextFrame();
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "Date"] });
  resize.height = 79;
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => resize.height });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(cb: () => void) {
        resize.fire = cb;
      }
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useQuickReturn", () => {
  it("publishes the header's height, and the offset only while the header is back", async () => {
    render(<Probe />);
    // Past the navigation's settle window, so the scrolls below are the reader's.
    await act(async () => vi.advanceTimersByTime(400));
    expect(document.documentElement.style.getPropertyValue("--header-h")).toBe("79px");
    await scrollTo(400);
    await scrollTo(600);
    expect(header().dataset.mode).toBe("away");
    expect(document.documentElement.style.getPropertyValue("--header-offset")).toBe("0px");
    await scrollTo(580);
    expect(header().dataset.mode).toBe("shown");
    expect(header().dataset.slides).toBe("true");
    expect(document.documentElement.style.getPropertyValue("--header-offset")).toBe("79px");
  });

  // StrictMode mounts, cleans up and mounts again: a frame id left behind by the cleanup read as one already scheduled,
  // and the header never moved again (found on the contact sheet).
  it("still reads the scroll after StrictMode's remount", async () => {
    render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    await act(async () => vi.advanceTimersByTime(400));
    await scrollTo(400);
    await scrollTo(600);
    await scrollTo(580);
    expect(header().dataset.mode).toBe("shown");
  });

  // A phone turned past `md` hides the header: its offset must go with it, not wait for the next scroll.
  it("moves the offset when the header's height changes, without a scroll", async () => {
    render(<Probe />);
    await act(async () => vi.advanceTimersByTime(400));
    await scrollTo(400);
    await scrollTo(600);
    await scrollTo(580);
    expect(document.documentElement.style.getPropertyValue("--header-offset")).toBe("79px");
    resize.height = 0;
    await act(async () => {
      resize.fire();
      vi.advanceTimersToNextFrame();
    });
    expect(document.documentElement.style.getPropertyValue("--header-offset")).toBe("0px");
  });

  it("does not slide when it leaves the page by scrolling past it", async () => {
    render(<Probe />);
    await act(async () => vi.advanceTimersByTime(400));
    await scrollTo(400);
    expect(header().dataset.mode).toBe("away");
    expect(header().dataset.slides).toBe("false");
  });

  it("ignores the scroll right after a navigation", async () => {
    render(<Probe />);
    await scrollTo(400);
    await scrollTo(600);
    await scrollTo(300);
    expect(header().dataset.mode).not.toBe("shown");
  });

  it("holds a returned header away while a text field in the page has focus", async () => {
    const { getByLabelText } = render(<Probe />);
    await act(async () => vi.advanceTimersByTime(400));
    await scrollTo(400);
    await scrollTo(600);
    await scrollTo(580);
    expect(header().dataset.mode).toBe("shown");
    await act(async () => {
      getByLabelText("Add a card").focus();
      vi.advanceTimersToNextFrame();
    });
    expect(document.documentElement.hasAttribute("data-field-focus")).toBe(true);
    expect(header().dataset.mode).toBe("away");
    await scrollTo(400);
    expect(header().dataset.mode).toBe("away");
    await act(async () => {
      getByLabelText("Add a card").blur();
      vi.advanceTimersToNextFrame();
    });
    expect(document.documentElement.hasAttribute("data-field-focus")).toBe(false);
  });
});

describe("isPageField", () => {
  it("is a text field in the page, not a checkbox and not the shell's own", () => {
    document.body.innerHTML = `<input id="out"><main><input id="t"><input id="c" type="checkbox"><textarea id="a"></textarea><button id="b"></button></main>`;
    const by = (id: string) => document.getElementById(id);
    expect(isPageField(by("t"))).toBe(true);
    expect(isPageField(by("a"))).toBe(true);
    expect(isPageField(by("c"))).toBe(false);
    expect(isPageField(by("b"))).toBe(false);
    expect(isPageField(by("out"))).toBe(false);
  });
});

describe("slidesInto", () => {
  it("slides back, and away only from back", () => {
    expect(slidesInto("shown", { mode: "away", slides: false })).toBe(true);
    expect(slidesInto("away", { mode: "shown", slides: true })).toBe(true);
    expect(slidesInto("away", { mode: "page", slides: false })).toBe(false);
    expect(slidesInto("page", { mode: "shown", slides: true })).toBe(false);
  });
});
