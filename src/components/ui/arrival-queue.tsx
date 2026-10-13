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
 *    A row on the first screen (its top above the viewport's foot when its art joined) holds for
 *    `ARRIVAL_FIRST_CAP_MS` only: the largest paint on the page is one of them, and its hold is
 *    what LCP pays (measured on slow 4G: about +100-180ms at 150ms everywhere; on a one-column list
 *    the LCP is often row 2, whose bytes landed before row 1's; orchestrator ruling, 2026-10-12).
 *    Those rows still fade one at a time, top down.
 *
 * SMALL art takes `ARRIVAL_SMALL_CAP_MS` (1,000ms) instead, first screen or not. A box under `SMALL_ART_AREA_PX`
 * (a 34x48 list thumb is 1,632) can never be the page's largest paint, so the LCP reason for the short cap does
 * not reach it, and a column of thumbs lands over several hundred ms in no order at all. Measured on the precon
 * list's rows (`probe:precon-arrival`, rows released out of order, of all pairs): deployed staging at 80ms,
 * 15 of 234 at 1300 and 11 of 135 at 390; a local production build, 3 runs a batch, 2 batches: 80ms 12 and 25
 * of 234 (1300), 15 and 1 of 135 (390); 300ms 12, 21 and 25 of 234, 3, 1 and 0 of 135, so 300 was too short; 1,000ms
 * 0 of 234 and 0 of 234, 0 of 135 and 0 of 135. A row of only small art waits for the rows above it that long;
 * a row with any larger art keeps the caps above.
 *
 * Art that settled before it joined (cached, or already painted when the page hydrated) never
 * joins, so it is never held. With no `<ArrivalOrder>` above it, art fades as it lands. Under
 * reduced motion `pending` hides nothing (globals.css), so the queue's order is invisible there and
 * every piece is drawn as its bytes land.
 */
export const ARRIVAL_CAP_MS = 150;
export const ARRIVAL_FIRST_CAP_MS = 80;
export const ARRIVAL_STAGGER_MS = 50;
/** The cap for a row of only small art (`SMALL_ART_AREA_PX`): see the queue's header. */
export const ARRIVAL_SMALL_CAP_MS = 1000;
/** A box this small (in px squared) can never be the LCP element, so it need not hurry. */
export const SMALL_ART_AREA_PX = 6000;
/** Boxes whose tops are this close are one row: a grid's tiles can differ by a subpixel. */
const ROW_TOLERANCE_PX = 4;

type Item = { landedAt: number | null; release: () => void; onScreen: boolean; small: boolean };

export class ArrivalQueue {
  private items = new Map<HTMLElement, Item>();
  private lastRelease = -Infinity;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly now: () => number = () => performance.now(),
    private readonly topOf: (el: HTMLElement) => number = (el) => el.getBoundingClientRect().top,
    private readonly viewportHeight: () => number = () => window.innerHeight,
    private readonly hasBox: (el: HTMLElement) => boolean = (el) => el.getClientRects().length > 0,
    private readonly areaOf: (el: HTMLElement) => number = (el) => {
      const r = el.getBoundingClientRect();
      // No measured area (nothing laid out) is not small: unknown art keeps the caps the LCP ruling set.
      return r.width * r.height || Infinity;
    },
  ) {}

  /**
   * A piece of art still on its way. `release` plays its fade. Art with no layout box (a copy a
   * responsive split hides with `display: none`, as /decks draws each tile's wash twice) is not
   * queued, and false says so: its top would read 0 and make a false first row that every real
   * row waits on. The caller then fades it on landing, which nobody sees.
   */
  join(el: HTMLElement, release: () => void): boolean {
    if (!this.hasBox(el)) return false;
    this.items.set(el, { landedAt: null, release, onScreen: this.topOf(el) < this.viewportHeight(), small: this.areaOf(el) < SMALL_ART_AREA_PX });
    return true;
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
      // A row of only small art takes the longer cap (a thumb is never the LCP); otherwise a row on the
      // first screen takes the tighter one.
      const onScreen = row.some((e) => e.item.onScreen);
      const small = row.every((e) => e.item.small);
      const capAt = firstLanded + (small ? ARRIVAL_SMALL_CAP_MS : onScreen ? ARRIVAL_FIRST_CAP_MS : ARRIVAL_CAP_MS);
      // In order: this row and every row above it have landed, a stagger behind the last release.
      // Else the cap lets it go anyway; and the stagger never outlasts the cap either, so a burst
      // of rows landing together still fills the screen inside it.
      const due = !blocked && whole ? Math.min(Math.max(now, this.lastRelease + ARRIVAL_STAGGER_MS), capAt) : capAt;
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
