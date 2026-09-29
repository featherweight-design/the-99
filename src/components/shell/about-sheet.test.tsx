import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
let pathname = "/decks";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

import { AboutSheet, sheetTitles } from "./about-sheet";

const entries = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `e${i}`, title: `Entry ${i}` }));

beforeAll(() => {
  // jsdom has no ResizeObserver; the reserve effect needs one to construct.
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  push.mockClear();
  pathname = "/decks";
});

afterEach(() => {
  document.documentElement.style.removeProperty("--about-sheet-h");
});

describe("sheetTitles (N1, N2)", () => {
  it("lists every title up to four", () => {
    expect(sheetTitles(1)).toEqual({ shown: 1, more: 0 });
    expect(sheetTitles(4)).toEqual({ shown: 4, more: 0 });
  });
  it("lists three and the rest at five or more, never 'and 1 more'", () => {
    expect(sheetTitles(5)).toEqual({ shown: 3, more: 2 });
    expect(sheetTitles(39)).toEqual({ shown: 3, more: 36 });
    for (let n = 0; n < 60; n++) expect(sheetTitles(n).more).not.toBe(1);
  });
});

describe("AboutSheet", () => {
  it("names the count and every title, with no link in the card", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(2) }} />);
    const region = screen.getByRole("region", { name: "New in About" });
    expect(region.textContent).toContain("2 new in About");
    expect(region.textContent).toContain("Entry 0");
    expect(region.textContent).toContain("Entry 1");
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("lists three and 'and N more' at five", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(5) }} />);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["Entry 0", "Entry 1", "Entry 2", "and 2 more"]);
  });

  it("Show me closes the sheet and goes to /about with no hash (N6)", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    fireEvent.click(screen.getByRole("button", { name: "Show me" }));
    expect(push).toHaveBeenCalledWith("/about");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("Later closes it and navigates nowhere (N7)", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByRole("region")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("Escape inside closes it (N7)", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Later" }), { key: "Escape" });
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("survives a layout re-render that hands it none", () => {
    // router.refresh() and a revalidating Server Action re-render Shell on a
    // request that carries no header; the card must not vanish unread.
    const { rerender } = render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    rerender(<AboutSheet state={{ kind: "none" }} />);
    expect(screen.getByRole("region", { name: "New in About" })).toBeTruthy();
  });

  it("draws nothing when first mounted with none", () => {
    render(<AboutSheet state={{ kind: "none" }} />);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("stays closed after the reader reaches /about another way and leaves", () => {
    // The account menu is a client navigation: the sheet stays mounted, so being
    // on /about has to close it, not merely hide it for as long as they are there.
    const { rerender } = render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    pathname = "/about";
    rerender(<AboutSheet state={{ kind: "none" }} />);
    pathname = "/decks";
    rerender(<AboutSheet state={{ kind: "none" }} />);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("draws nothing on /about (N9)", () => {
    pathname = "/about";
    render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("introduces the page on a first run, listing nothing (N3)", () => {
    render(<AboutSheet state={{ kind: "firstRun" }} />);
    const region = screen.getByRole("region", { name: /^About The\s99$/ });
    expect(region.textContent).toContain("What The\u00a099 does");
    expect(region.textContent).not.toMatch(/new in About/);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("is not modal and does not take focus (N4, N10)", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    expect(document.querySelector("[aria-modal]")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it("announces its heading once through a polite live region, after mount (N10)", async () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(3) }} />);
    const live = document.querySelector("[aria-live='polite']");
    // Empty at mount: text present when a live region appears is not spoken.
    expect(live?.textContent).toBe("");
    await waitFor(() => expect(live?.textContent).toBe("3 new in About"));
  });

  it("still draws, and still reserves, where ResizeObserver does not exist", () => {
    const saved = globalThis.ResizeObserver;
    // @ts-expect-error: removing the API is the case under test
    delete globalThis.ResizeObserver;
    try {
      render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
      expect(screen.getByRole("region", { name: "New in About" })).toBeTruthy();
      expect(document.documentElement.style.getPropertyValue("--about-sheet-h")).toMatch(/px$/);
    } finally {
      globalThis.ResizeObserver = saved;
    }
  });

  it("reserves its height at the page foot while open, and releases it on close (N5)", () => {
    render(<AboutSheet state={{ kind: "behind", entries: entries(1) }} />);
    expect(document.documentElement.style.getPropertyValue("--about-sheet-h")).toMatch(/px$/);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Later" }));
    });
    expect(document.documentElement.style.getPropertyValue("--about-sheet-h")).toBe("");
  });
});

describe("the sheet's copy binds The 99 (copy review, 2026-09-25)", () => {
  it("never lets a line break orphan '99'", async () => {
    const { aboutSheetCopy } = await import("../../lib/copy/about");
    for (const s of [aboutSheetCopy.where, aboutSheetCopy.firstRunHeading, aboutSheetCopy.regionLabelFirstRun]) {
      expect(s).toContain("The\u00a099");
      expect(s).not.toMatch(/The 99/);
    }
  });
});

describe("the appendix's one line", () => {
  it("is drawn under the titles when the proxy added it, and not otherwise", () => {
    const { container, unmount } = render(<AboutSheet state={{ kind: "behind", entries: entries(2), appendix: true }} />);
    expect(container.querySelectorAll("[data-appendix-line]")).toHaveLength(1);
    unmount();
    const plain = render(<AboutSheet state={{ kind: "behind", entries: entries(2) }} />);
    expect(plain.container.querySelector("[data-appendix-line]")).toBeNull();
  });
});
