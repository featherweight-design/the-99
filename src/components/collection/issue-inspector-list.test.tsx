import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IssueInspectorList, VIRTUALIZE_THRESHOLD } from "./issue-inspector-list";

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ name: `Card ${i}`, setCode: "abc", line: i + 2, quantity: 1 }));

/** Lay each row out at `height`px: jsdom lays nothing out, so the row box is stubbed. */
function stubRowHeight(height: number) {
  const real = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.hasAttribute("data-issue-row")) {
      return { x: 0, y: 0, top: 0, left: 0, right: 300, bottom: height, width: 300, height, toJSON() {} } as DOMRect;
    }
    return real.call(this);
  });
}

const slotTops = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("[data-issue-row]")].map((row) =>
    parseFloat(row.parentElement!.style.top),
  );

afterEach(() => vi.restoreAllMocks());

describe("IssueInspectorList — virtualised rows", () => {
  it("spaces each slot by its row's MEASURED height plus the gap, not a constant", async () => {
    // A drawn row is 64-67px; the retired FixedSizeList gave every slot 46, so each row was
    // drawn over by the next. 70 is neither the old constant nor the estimate.
    stubRowHeight(70);
    const { container } = render(
      <IssueInspectorList variant="unmatched" rows={rows(VIRTUALIZE_THRESHOLD + 50)} query="" />,
    );
    await act(async () => {});
    const tops = slotTops(container);
    expect(tops.length).toBeGreaterThan(3);
    expect(tops.slice(0, 4)).toEqual([0, 76, 152, 228]);
  });

  it("re-reads a row that grows after its first measurement", async () => {
    stubRowHeight(64);
    const { container, rerender } = render(
      <IssueInspectorList variant="unmatched" rows={rows(VIRTUALIZE_THRESHOLD + 50)} query="" />,
    );
    await act(async () => {});
    expect(slotTops(container)[1]).toBe(70);
    // A filter hands the list new rows; their sizes are measured, not inherited by index.
    vi.restoreAllMocks();
    stubRowHeight(90);
    rerender(
      <IssueInspectorList variant="unmatched" rows={rows(VIRTUALIZE_THRESHOLD + 40).reverse()} query="" />,
    );
    await act(async () => {});
    expect(slotTops(container)[1]).toBe(96);
  });
});
