import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARRIVAL_CAP_MS, ARRIVAL_FIRST_CAP_MS, ARRIVAL_STAGGER_MS, ArrivalQueue } from "./arrival-queue";

// A grid laid out by hand: each piece of art has the top edge of its row.
function grid(rows: number, cols: number) {
  const tops = new Map<HTMLElement, number>();
  const cells: HTMLElement[][] = [];
  for (let r = 0; r < rows; r++) {
    cells.push([]);
    for (let c = 0; c < cols; c++) {
      const el = document.createElement("div");
      // An id apiece: toEqual compares DOM nodes by structure, and empty divs would all match.
      el.id = `r${r}c${c}`;
      tops.set(el, r * 300);
      cells[r].push(el);
    }
  }
  return { cells, topOf: (el: HTMLElement) => tops.get(el) ?? 0 };
}

describe("ArrivalQueue", () => {
  let now = 0;
  beforeEach(() => {
    now = 0;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());
  const advance = (ms: number) => {
    now += ms;
    vi.advanceTimersByTime(ms);
  };

  // Rows sit 300px apart: a 300px viewport holds the first row only.
  function setup(rows: number, cols: number, viewport = 300) {
    const g = grid(rows, cols);
    const q = new ArrivalQueue(() => now, g.topOf, () => viewport, () => true);
    const released: HTMLElement[] = [];
    for (const row of g.cells) for (const el of row) q.join(el, () => released.push(el));
    return { q, cells: g.cells, released };
  }

  it("releases a row only when every piece in it has landed, all together", () => {
    const { q, cells, released } = setup(1, 3);
    q.landed(cells[0][0]);
    q.landed(cells[0][1]);
    expect(released).toEqual([]);
    q.landed(cells[0][2]);
    expect(released).toEqual(cells[0]);
  });

  it("reads tops a few pixels apart as one row: a grid's tiles can differ by a subpixel or two", () => {
    const tops = [100, 103, 99];
    const els = tops.map(() => document.createElement("div"));
    const q = new ArrivalQueue(() => now, (el) => tops[els.indexOf(el as HTMLDivElement)], () => 300, () => true);
    const released: number[] = [];
    els.forEach((el, i) => q.join(el, () => released.push(i)));
    q.landed(els[0]);
    q.landed(els[1]);
    expect(released).toEqual([]);
    q.landed(els[2]);
    // One release, all three at once (indices, not elements: empty divs compare equal).
    expect([...released].sort()).toEqual([0, 1, 2]);
  });

  it("goes top to bottom: a row that landed first waits for the row above it", () => {
    const { q, cells, released } = setup(2, 2);
    cells[1].forEach((el) => q.landed(el));
    advance(20);
    expect(released).toEqual([]);
    cells[0].forEach((el) => q.landed(el));
    expect(released).toEqual(cells[0]);
    // The next row follows a stagger behind.
    advance(ARRIVAL_STAGGER_MS - 1);
    expect(released).toEqual(cells[0]);
    advance(1);
    expect(released).toEqual([...cells[0], ...cells[1]]);
  });

  it("never holds landed art past the cap waiting on a slow piece above it", () => {
    const { q, cells, released } = setup(2, 2);
    q.landed(cells[0][0]);
    cells[1].forEach((el) => q.landed(el));
    // The first row's landed piece goes at the first row's cap, the row below at its own.
    advance(ARRIVAL_FIRST_CAP_MS);
    expect(released).toEqual([cells[0][0]]);
    advance(ARRIVAL_CAP_MS - ARRIVAL_FIRST_CAP_MS - 1);
    expect(released).toEqual([cells[0][0]]);
    advance(1);
    // Everything that landed has gone by the cap; the slow piece waits only for itself.
    expect(released).toEqual(expect.arrayContaining([cells[0][0], ...cells[1]]));
    expect(released).not.toContain(cells[0][1]);
    q.landed(cells[0][1]);
    // A stagger behind the release just made, at most.
    advance(ARRIVAL_STAGGER_MS);
    expect(released).toContain(cells[0][1]);
    expect(q.size).toBe(0);
  });

  it("holds a first-screen row waiting on the row above for the tighter cap, and a row below the fold for the full one", () => {
    const { q, cells, released } = setup(3, 1, 600);
    // Rows 2 and 3 land, row 1 is slow. Row 2 is on screen, row 3 is not.
    q.landed(cells[1][0]);
    q.landed(cells[2][0]);
    advance(ARRIVAL_FIRST_CAP_MS);
    expect(released).toEqual([cells[1][0]]);
    advance(ARRIVAL_CAP_MS - ARRIVAL_FIRST_CAP_MS);
    expect(released).toEqual([cells[1][0], cells[2][0]]);
  });

  it("holds the first row for the tighter cap only, still as one row's release", () => {
    const { q, cells, released } = setup(1, 3);
    q.landed(cells[0][0]);
    q.landed(cells[0][1]);
    advance(ARRIVAL_FIRST_CAP_MS - 1);
    expect(released).toEqual([]);
    advance(1);
    expect(released).toEqual([cells[0][0], cells[0][1]]);
  });

  it("never staggers a burst of whole rows past their cap", () => {
    // Five rows on one tall screen land at once: the stagger would put the fifth 200ms out.
    const { q, cells, released } = setup(5, 1, 2000);
    cells.forEach(([el]) => q.landed(el));
    expect(released).toEqual([cells[0][0]]);
    advance(ARRIVAL_STAGGER_MS);
    expect(released).toHaveLength(2);
    advance(ARRIVAL_FIRST_CAP_MS - ARRIVAL_STAGGER_MS);
    expect(released).toHaveLength(5);
  });

  it("queues no art without a layout box, so a hidden copy never makes a false first row", () => {
    const g = grid(2, 1);
    const hidden = document.createElement("div");
    hidden.id = "hidden";
    const q = new ArrivalQueue(() => now, (el) => (el === hidden ? 0 : g.topOf(el) + 100), () => 300, (el) => el !== hidden);
    const released: HTMLElement[] = [];
    expect(q.join(hidden, () => released.push(hidden))).toBe(false);
    for (const [el] of g.cells) expect(q.join(el, () => released.push(el))).toBe(true);
    q.landed(g.cells[0][0]);
    expect(released).toEqual([g.cells[0][0]]);
    expect(q.size).toBe(1);
  });

  it("stops waiting on a piece that left", () => {
    const { q, cells, released } = setup(2, 1);
    q.landed(cells[1][0]);
    q.leave(cells[0][0]);
    expect(released).toEqual([cells[1][0]]);
  });

  it("releases nothing once disposed", () => {
    const { q, cells, released } = setup(2, 1);
    q.landed(cells[1][0]);
    q.dispose();
    advance(ARRIVAL_CAP_MS * 2);
    expect(released).toEqual([]);
  });
});
