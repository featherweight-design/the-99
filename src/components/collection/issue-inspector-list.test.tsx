import { act, fireEvent, render } from "@testing-library/react";
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

  it("keeps a measured row's size when a filter moves it to another index", async () => {
    // Rendered rows are measured again on every render, so a store keyed by
    // INDEX and one keyed by ROW agree about everything on screen. They part
    // over rows a filter moved OFF screen, whose sizes still set the offsets of
    // every row below them. So: ten tall rows measured on open, then a new
    // order that pushes them past the rendered window, then a scroll to just
    // below them. The first short row's slot must sit under ten TALL rows.
    const TALL = 90;
    const SHORT = 50;
    const byName = (name: string) => (name.startsWith("Tall") ? TALL : SHORT);
    const real = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const box = (h: number) =>
        ({ x: 0, y: 0, top: 0, left: 0, right: 300, bottom: h, width: 300, height: h, toJSON() {} }) as DOMRect;
      if (this.hasAttribute("data-issue-row")) return box(byName(this.textContent ?? ""));
      if (this.hasAttribute("data-issue-list")) return box(300); // the list's viewport
      return real.call(this);
    });
    const row = (name: string, line: number) => ({ name, setCode: "abc", line, quantity: 1 });
    const talls = Array.from({ length: 10 }, (_, i) => row(`Tall ${i}`, 1000 + i));
    const shorts = Array.from({ length: 180 }, (_, i) => row(`Short ${i}`, 2000 + i));
    const fresh = Array.from({ length: 20 }, (_, i) => row(`Fresh ${i}`, 3000 + i));

    // Open: the talls lead, and a 300px window plus its overscan measures all ten.
    const { container, rerender } = render(
      <IssueInspectorList variant="unmatched" rows={[...talls, ...shorts]} query="" />,
    );
    await act(async () => {});
    const names = () => [...container.querySelectorAll("[data-issue-row]")].map((r) => r.textContent ?? "");
    expect(names().filter((n) => n.startsWith("Tall"))).toHaveLength(10);

    // A filter puts twenty unmeasured rows first: the talls move to indexes
    // 20–29, out of the rendered window. At those indexes an index-keyed store
    // holds whatever sat there on open (short rows, mostly never measured).
    rerender(<IssueInspectorList variant="unmatched" rows={[...fresh, ...talls, ...shorts]} query="" />);
    await act(async () => {});
    expect(names().some((n) => n.startsWith("Tall"))).toBe(false);

    // Twenty fresh rows: the rendered ones measured (50 + 6), the rest estimated
    // (70). Then the ten talls at 96 each. That is where Short 0 starts.
    const renderedFresh = names().filter((n) => n.startsWith("Fresh")).length;
    const expectedTop = renderedFresh * 56 + (20 - renderedFresh) * 70 + 10 * (TALL + 6);
    const outer = container.querySelector("[data-issue-list]")!.firstElementChild as HTMLElement;
    Object.defineProperty(outer, "clientHeight", { configurable: true, value: 300 });
    Object.defineProperty(outer, "scrollHeight", { configurable: true, value: 100_000 });
    outer.scrollTop = expectedTop + 10;
    fireEvent.scroll(outer, { target: { scrollTop: expectedTop + 10 } });
    await act(async () => {});
    const short0 = [...container.querySelectorAll<HTMLElement>("[data-issue-row]")].find(
      (r) => r.textContent?.startsWith("Short 0"),
    );
    expect(short0, "Short 0 is not in the rendered window").toBeDefined();
    expect(parseFloat(short0!.parentElement!.style.top)).toBe(expectedTop);
  });
});
