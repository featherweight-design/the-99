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
  Object.defineProperty(document.documentElement, "scrollHeight", { value: 5000, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
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

  // iOS's rubber band past the bottom reads beyond the scrollable range; its rebound is not the reader scrolling up.
  it("does not take the bottom's rubber-band rebound as upward travel", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 2000, configurable: true });
    render(<Probe />);
    await act(async () => vi.advanceTimersByTime(400));
    await scrollTo(600);
    await scrollTo(1200);
    await scrollTo(1240);
    await scrollTo(1200);
    expect(header().dataset.mode).toBe("away");
  });

  it("moves the heads under it on its own slide: 160ms ease-in away, 200ms on the sheet curve back", async () => {
    render(<Probe />);
    await act(async () => vi.advanceTimersByTime(400));
    const root = document.documentElement.style;
    await scrollTo(400);
    await scrollTo(600);
    expect(root.getPropertyValue("--header-ms")).toBe("160ms");
    expect(root.getPropertyValue("--header-ease")).toBe("cubic-bezier(0.4, 0, 1, 1)");
    await scrollTo(580);
    expect(root.getPropertyValue("--header-ms")).toBe("200ms");
    expect(root.getPropertyValue("--header-ease")).toBe("var(--motion-ease-out)");
  });

  it("brings an away header back on the entrance's timing when a keyboard reader tabs into it", async () => {
    function Tabbed() {
      const ref = useRef<HTMLElement>(null);
      const { mode } = useQuickReturn(ref);
      return (
        <header ref={ref} data-mode={mode}>
          <button>Account</button>
        </header>
      );
    }
    const { getByText } = render(<Tabbed />);
    await act(async () => vi.advanceTimersByTime(400));
    await scrollTo(400);
    await scrollTo(600);
    expect(document.documentElement.style.getPropertyValue("--header-ms")).toBe("160ms");
    await act(async () => {
      getByText("Account").focus();
      vi.advanceTimersToNextFrame();
    });
    expect(header().dataset.mode).toBe("shown");
    expect(document.documentElement.style.getPropertyValue("--header-ms")).toBe("200ms");
    expect(document.documentElement.style.getPropertyValue("--header-offset")).toBe("79px");
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

describe("a link to the fragment already in the address bar", () => {
  // It scrolls with no `hashchange`, so the press itself marks the jump as the app's.
  it("does not bring the header back with its upward jump", async () => {
    function Page() {
      const ref = useRef<HTMLElement>(null);
      const { mode } = useQuickReturn(ref);
      return (
        <>
          <header ref={ref} data-mode={mode} />
          <main>
            <a href="#entry">Appendix</a>
          </main>
        </>
      );
    }
    const { getByText } = render(<Page />);
    await act(async () => vi.advanceTimersByTime(400));
    await scrollTo(400);
    await scrollTo(600);
    getByText("Appendix").addEventListener("click", (e) => e.preventDefault());
    await act(async () => {
      getByText("Appendix").click();
    });
    await scrollTo(300);
    expect(header().dataset.mode).toBe("away");
  });
});

describe("a focused field that unmounts", () => {
  // No `focusout` fires for it, so the attribute is read from the focus itself on the next frame.
  it("does not leave the header held away", async () => {
    function Editor({ show }: { show: boolean }) {
      const ref = useRef<HTMLElement>(null);
      const { mode } = useQuickReturn(ref);
      return (
        <>
          <header ref={ref} data-mode={mode} />
          <main>{show ? <textarea aria-label="Note" autoFocus /> : null}</main>
        </>
      );
    }
    const { rerender } = render(<Editor show />);
    await act(async () => vi.advanceTimersByTime(400));
    await scrollTo(400);
    expect(document.documentElement.hasAttribute("data-field-focus")).toBe(true);
    rerender(<Editor show={false} />);
    await scrollTo(600);
    expect(document.documentElement.hasAttribute("data-field-focus")).toBe(false);
    await scrollTo(580);
    expect(header().dataset.mode).toBe("shown");
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
