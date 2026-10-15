// The items a `Show more` just added, so they can fade in one after another (small-polish R2 §3, E9). Item n of the new
// batch (0-based) fades in at `--motion-delay` plus `--motion-stagger` times min(n, REVEAL_CAP), in `.anim-reveal`
// (opacity only, no rise). Past the cap everything arrives with the cap's item, so a batch is fully in by 740ms. The
// items already on screen do not move: they are before `from`, and a list that was not simply GROWN (a filter, a search,
// a different sort) reveals nothing, since those are a new list and not more of the old one.

import type { CSSProperties } from "react";
import { useState } from "react";

export const REVEAL_CAP = 11;

/**
 * The index the latest growth began at, or `ids.length` when nothing should fade in (the first draw, a list that did not
 * grow, one whose head or old tail is not where it was). Adjusted during render, so the first frame of the new batch is
 * already the faded one.
 */
export function useRevealFrom(ids: readonly string[]): number {
  const [seen, setSeen] = useState({ n: ids.length, first: ids[0], last: ids[ids.length - 1], from: ids.length });
  if (ids.length !== seen.n || ids[0] !== seen.first) {
    const grew = seen.n > 0 && ids.length > seen.n && ids[0] === seen.first && ids[seen.n - 1] === seen.last;
    setSeen({ n: ids.length, first: ids[0], last: ids[ids.length - 1], from: grew ? seen.n : ids.length });
  }
  return seen.from;
}

/** The class and style an item at `index` takes: none before `from`, its place in the batch after it. */
export function revealOf(index: number, from: number): { className?: string; style?: CSSProperties } {
  if (index < from) return {};
  return { className: "anim-reveal", style: { "--reveal-n": Math.min(index - from, REVEAL_CAP) } as CSSProperties };
}
