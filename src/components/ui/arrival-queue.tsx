"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Card art arriving in READING ORDER (Hugh, 2026-10-12: fades that each played whenever their own
 * bytes landed read as chaos). A list wraps its art in `<ArrivalOrder>`, and every piece of art in
 * it that is still on its way (`data-arrival="pending"`, `armArtArrival`) joins the list's queue.
 * Its fade is then released by row, top to bottom:
 *
 *  - a row is the art whose boxes share a top edge, read off the page at release time, so a grid's
 *    columns, a list's single column and a two-tile pair all fall out of the layout itself;
 *  - a row is released once every piece in it AND in every row above it has landed, the rows
 *    `ARRIVAL_STAGGER_MS` apart, so a screen fills from the top down;
 *  - nothing is held hidden past `ARRIVAL_CAP_MS` after its own bytes landed: a slow piece above
 *    it delays a row by that much at most, and the slow piece fades in on its own when it lands.
 *
 * Art that settled before it joined (cached, or already painted when the page hydrated) never
 * joins, so it is never held. With no `<ArrivalOrder>` above it, art fades as it lands. Under
 * reduced motion `pending` hides nothing (globals.css), so the queue's order is invisible there and
 * every piece is drawn as its bytes land.
 */
export const ARRIVAL_CAP_MS = 150;
export const ARRIVAL_STAGGER_MS = 50;
/** Boxes whose tops are this close are one row: a grid's tiles can differ by a subpixel. */
const ROW_TOLERANCE_PX = 4;

type Item = { landedAt: number | null; release: () => void };

export class ArrivalQueue {
  private items = new Map<HTMLElement, Item>();
  private lastRelease = -Infinity;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly now: () => number = () => performance.now(),
    private readonly topOf: (el: HTMLElement) => number = (el) => el.getBoundingClientRect().top,
  ) {}

  /** A piece of art still on its way. `release` plays its fade. */
  join(el: HTMLElement, release: () => void): void {
    this.items.set(el, { landedAt: null, release });
  }

  /** Its bytes landed (or failed): it is released with its row, or at the cap. */
  landed(el: HTMLElement): void {
    const item = this.items.get(el);
    if (!item || item.landedAt !== null) return;
    item.landedAt = this.now();
    this.pump();
  }

  /** It unmounted, or its source moved: it is no longer anything a row waits on. */
  leave(el: HTMLElement): void {
    if (!this.items.delete(el)) return;
    this.pump();
  }

  /** The list unmounted: nothing more is released. */
  dispose(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.items.clear();
  }

  /** The art still held, for a test. */
  get size(): number {
    return this.items.size;
  }

  private pump(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const now = this.now();
    // Rows, top to bottom, from where each box sits now.
    const sorted = [...this.items.entries()].map(([el, item]) => ({ el, item, top: this.topOf(el) })).sort((a, b) => a.top - b.top);
    const rows: (typeof sorted)[] = [];
    for (const entry of sorted) {
      const row = rows.at(-1);
      if (row && Math.abs(entry.top - row[0].top) <= ROW_TOLERANCE_PX) row.push(entry);
      else rows.push([entry]);
    }
    let blocked = false;
    let next = Infinity;
    for (const row of rows) {
      const landed = row.filter((e) => e.item.landedAt !== null);
      if (landed.length === 0) {
        blocked = true;
        continue;
      }
      const whole = landed.length === row.length;
      const firstLanded = Math.min(...landed.map((e) => e.item.landedAt as number));
      const capAt = firstLanded + ARRIVAL_CAP_MS;
      // In order: this row and every row above it have landed. Else the cap lets it go anyway.
      const due = !blocked && whole ? Math.max(now, this.lastRelease + ARRIVAL_STAGGER_MS) : capAt;
      if (!whole) blocked = true;
      if (due <= now) {
        for (const e of landed) {
          this.items.delete(e.el);
          e.item.release();
        }
        this.lastRelease = now;
      } else {
        next = Math.min(next, due);
      }
    }
    if (next !== Infinity) this.timer = setTimeout(() => this.pump(), Math.max(0, next - now));
  }
}

const ArrivalContext = createContext<ArrivalQueue | null>(null);

/** The queue the art below it arrives through, if any list put one there. */
export function useArrivalQueue(): ArrivalQueue | null {
  return useContext(ArrivalContext);
}

/** One reading order for the art inside it. One per list, around the whole list. */
export function ArrivalOrder({ children }: { children: ReactNode }) {
  const [queue] = useState(() => new ArrivalQueue());
  useEffect(() => () => queue.dispose(), [queue]);
  return <ArrivalContext.Provider value={queue}>{children}</ArrivalContext.Provider>;
}
