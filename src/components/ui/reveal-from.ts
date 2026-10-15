// The items a `Show more` just added, so they can fade in one after another (small-polish R2 §3, E9). Item n of the new
// batch (0-based) fades in at `--motion-delay` plus `--motion-stagger` times min(n, REVEAL_CAP), in `.anim-reveal`
// (opacity only, no rise). Past the cap everything arrives with the cap's item, so a batch is fully in by 740ms. The
// items already on screen do not move: they are before `from`.
//
// `from` is NOT inferred from the list. A list that grew by a prefix is also what clearing a search leaves behind, so
// the owner of the list says when a press of Show more happened (it holds `revealFrom` and drops it on any filter, search
// or sort change) and passes it down; a list that was not paged reveals nothing.

import type { CSSProperties } from "react";

export const REVEAL_CAP = 11;

/** The class and style an item at `index` takes: none before `from` (or when `from` is null), its place in the batch after it. */
export function revealOf(index: number, from: number | null | undefined): { className?: string; style?: CSSProperties } {
  if (from == null || index < from) return {};
  return { className: "anim-reveal", style: { "--reveal-n": Math.min(index - from, REVEAL_CAP) } as CSSProperties };
}
