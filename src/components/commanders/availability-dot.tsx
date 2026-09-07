// The ownership dot and the legend swatch that explains it, in one module so
// the two cannot drift.
//
// They did drift: the legends named the committed colour "Amber", which is only
// true of the first theme. `--avail-hard-fg` is redefined by each of the six,
// so the same sentence read wrong on five of them. A legend that renders the
// dot instead of naming it is right under every theme, including ones not yet
// written.

import type { JSX } from "react";

/**
 * Three states, and the third costs no width.
 *
 * A committed card is owned, so the mark is the filled dot's colour rather than
 * anything added beside it. `unowned` is hollow: hollow is the absence of a
 * card, and a card you do not own cannot sit in a deck.
 */
export type DotState = "free" | "committed" | "unowned";

export function dotState(card: { owned?: boolean; committedTo: string | null }): DotState {
  if (card.owned === false) return "unowned";
  return card.committedTo === null ? "free" : "committed";
}

export function OwnershipDot({ state, size }: { state: DotState; size: number }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          state === "unowned"
            ? "transparent"
            : state === "committed"
              ? "var(--avail-hard-fg)"
              : "var(--success)",
        border: state === "unowned" ? "1px solid var(--fg-locked)" : undefined,
      }}
    />
  );
}

/**
 * A dot inline in a sentence. Nudged up half a pixel because a 6px circle sits
 * visually low against 10px mono, and given its own margin so the sentence's
 * word spacing does not have to carry it.
 */
export function LegendPip({ state }: { state: DotState }): JSX.Element {
  return (
    <span
      className="inline-flex items-center"
      style={{ marginRight: 5, verticalAlign: "baseline", position: "relative", top: -0.5 }}
    >
      <OwnershipDot state={state} size={6} />
    </span>
  );
}
