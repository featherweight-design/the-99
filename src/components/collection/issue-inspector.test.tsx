import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UploadPreview } from "../../app/collection/actions";
import { stubViewport } from "../../test-utils/stub-viewport";
import { IssueInspector } from "./issue-inspector";

const preview = (unmatched: number, errors: number): UploadPreview => ({
  uploadId: "u1",
  matchedCardCount: 10,
  unmatchedRows: Array.from({ length: unmatched }, (_, i) => ({
    name: `Card ${i}`,
    setCode: "abc",
    line: i + 2,
    quantity: 1,
  })),
  skippedByDesignCount: 0,
  parseErrors: Array.from({ length: errors }, (_, i) => ({
    line: 900 + i,
    reason: `Bad row ${i}`,
  })),
  currentCollectionCount: 0,
  filename: "collection.csv",
  rowCount: 400,
});

const drag = (el: Element, distance: number) => {
  fireEvent.pointerDown(el, { clientY: 0, pointerId: 1 });
  fireEvent.pointerMove(el, { clientY: distance, pointerId: 1 });
  fireEvent.pointerUp(el, { clientY: distance, pointerId: 1 });
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("IssueInspector — phone", () => {
  it("opens as the bottom sheet in the collection filter sheet's vocabulary", () => {
    stubViewport(390);
    render(<IssueInspector preview={preview(5, 2)} initialTab="unmatched" onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("rounded-t-[22px]");
    expect(dialog.className).toContain("bg-[color:var(--surface-inset)]");
    expect(dialog.className).toContain("max-h-[86vh]");
    // Not the desktop modal's box.
    expect(dialog.className).not.toContain("md:w-[660px]");
  });

  it("starts a drag from the title block, and 80px dismisses", () => {
    stubViewport(390);
    const onClose = vi.fn();
    render(<IssueInspector preview={preview(5, 2)} initialTab="unmatched" onClose={onClose} />);
    drag(screen.getByRole("heading", { name: "Import issues" }), 80);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("never moves the sheet from the tabs, the filter or the list", () => {
    stubViewport(390);
    const onClose = vi.fn();
    render(<IssueInspector preview={preview(5, 2)} initialTab="unmatched" onClose={onClose} />);
    drag(screen.getByRole("tab", { name: /Unmatched/ }), 200);
    drag(screen.getByRole("textbox"), 200);
    drag(screen.getByText("Card 0"), 200);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("holds at the 86vh cap through a tab switch and a filter when a tab is virtualised", () => {
    // A tab past the virtualisation threshold holds at the cap without
    // measuring. The measured branch is the pair of cases below.
    stubViewport(390);
    vi.useFakeTimers();
    render(<IssueInspector preview={preview(214, 31)} initialTab="unmatched" onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    const held = `${Math.floor(window.innerHeight * 0.86)}px`;
    expect(dialog.style.height).toBe(held);
    fireEvent.click(screen.getByRole("tab", { name: /Parse errors/ }));
    expect(dialog.style.height).toBe(held);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "zzz" } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText(/No names match/)).toBeInTheDocument();
    expect(dialog.style.height).toBe(held);
  });

  // The MEASURED branch, which the case above cannot reach. jsdom lays nothing
  // out, so the layout is stubbed from the DOM as it stands: each listed row is
  // 50px, the panel is 100px of chrome plus its visible list, and the measuring
  // copy is its own rows. A hook that measured again after a tab switch or a
  // filter would then read a different height (200px on the 2-row tab, 100px
  // with no list at all) where a held one keeps 350.
  function stubLayout() {
    const ROW = 50;
    const visibleRows = (root: Element) =>
      [...root.querySelectorAll("[data-issue-list]")].filter((l) => !l.closest("[data-issue-measure]"))[0]
        ?.querySelectorAll("li").length ?? 0;
    const heightOf = (el: Element): number | null => {
      if (el.getAttribute("role") === "dialog") return 100 + ROW * visibleRows(el);
      if (el.hasAttribute("data-issue-measure")) return ROW * el.querySelectorAll("li").length;
      if (el.hasAttribute("data-issue-list")) return ROW * el.querySelectorAll("li").length;
      return null;
    };
    const rect = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const h = heightOf(this);
      return h === null ? rect.call(this) : ({ top: 0, bottom: h, height: h, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON() {} } as DOMRect);
    });
    for (const prop of ["clientHeight", "scrollHeight"] as const) {
      vi.spyOn(Element.prototype, prop, "get").mockImplementation(function (this: Element) {
        return heightOf(this) ?? 0;
      });
    }
  }

  it("measures once from the longer tab, then holds through a tab switch and a filter", () => {
    stubViewport(390);
    stubLayout();
    vi.useFakeTimers();
    render(<IssueInspector preview={preview(5, 2)} initialTab="unmatched" onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    // 100 of chrome + the 5-row tab's 250.
    expect(dialog.style.height).toBe("350px");
    fireEvent.click(screen.getByRole("tab", { name: /Parse errors/ }));
    expect(dialog.style.height).toBe("350px");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "zzz" } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText(/No names match/)).toBeInTheDocument();
    expect(dialog.style.height).toBe("350px");
  });

  it("takes the longer tab even when it is not the one on screen", () => {
    stubViewport(390);
    stubLayout();
    render(<IssueInspector preview={preview(2, 5)} initialTab="unmatched" onClose={() => {}} />);
    // Opened on the 2-row tab: 100 + the OTHER tab's 5 rows, read off the measuring copy.
    expect(screen.getByRole("dialog").style.height).toBe("350px");
  });

  it("gives the count 72px on the phone and 150 from md", () => {
    stubViewport(390);
    render(<IssueInspector preview={preview(5, 2)} initialTab="unmatched" onClose={() => {}} />);
    const count = screen.getByText(/5 of 5/);
    expect(count.className).toContain("min-w-[72px]");
    expect(count.className).toContain("md:min-w-[150px]");
  });

  it("draws the no-match title in the display face at 17px, 19px from md", () => {
    stubViewport(390);
    vi.useFakeTimers();
    render(<IssueInspector preview={preview(5, 2)} initialTab="unmatched" onClose={() => {}} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "zzz" } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    const title = screen.getByText(/No names match/);
    expect(title.className).toContain("font-display");
    expect(title.className).toContain("text-[17px]");
    expect(title.className).toContain("md:text-[19px]");
    expect(title.className).not.toContain("text-[16px]");
  });
});

describe("IssueInspector — desktop", () => {
  it("keeps the 660×640 modal, with no sheet and no drag", () => {
    stubViewport(1300);
    render(<IssueInspector preview={preview(5, 2)} initialTab="unmatched" onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("md:w-[660px]");
    expect(dialog.className).toContain("md:h-[640px]");
    expect(document.querySelector("[data-sheet-drag]")).toBeNull();
    expect(dialog.getAttribute("style") ?? "").not.toContain("height");
  });
});
