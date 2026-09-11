"use client";
// The app's one colour filter, per the filter-chassis handoff §2.5 and decisions 7 and 8.
//
// Three controls drew this concept before: `collection/color-pip.tsx`,
// `commanders/rack/colour-control.tsx` and `decks/deck-filter-column.tsx`'s
// `ColourSwatch`. They disagreed on shape, on ground, and on how an unlit pip
// reads — the rack dimmed to 0.34 over `--bg`, collection to 0.40 over
// `--surface-sunken`. Measured across six themes those floor at 1.37:1 and
// 1.49:1, so the rack failed the 3:1 non-text floor in 30 of 30 theme-and-hue
// combinations and collection in 24 of 30. This component is why that stops.
//
// Parameterised, never flagged: the same rule set collections' own extraction
// carries. A route passes its state in and gets pips out; no prop names a route.

import React from "react";
import { chassisCopy, PIP_ORDER, type PipCode } from "../../lib/copy/filter-chassis";

/**
 * Scryfall's own symbols, committed under `public/mana/`. They are finished
 * multi-colour illustrations — a filled `<circle>` ground with the symbol pathed
 * over it, and the hybrids carry two differently-coloured halves — so they are
 * drawn as images and never masked, tinted or given an opacity (decision 7).
 * Masking would flatten a hybrid to one colour, which is the thing the decision
 * exists to prevent; an opacity is what the shipped controls did wrong.
 */
const PIP_SRC: Record<PipCode, string> = {
  w: "/mana/W.svg", u: "/mana/U.svg", b: "/mana/B.svg", r: "/mana/R.svg", g: "/mana/G.svg",
};

/** 22px desktop, a real 44px target on the phone (decision 8). */
const DESKTOP_PX = 22;
const PHONE_PX = 44;

export type ColourPipsProps = {
  /** Hue codes currently on. */
  value: readonly string[];
  onToggle: (code: PipCode) => void;
  /**
   * `wide` is the desktop inline form; `sheet` is the phone panel, where the
   * pips lead the sheet (decision 22) and carry a real touch target.
   */
  form: "wide" | "sheet";
};

export function ColourPips({ value, onToggle, form }: ColourPipsProps) {
  const on = new Set(value.map((v) => v.toLowerCase()));
  const size = form === "wide" ? DESKTOP_PX : PHONE_PX;

  return (
    <div
      role="group"
      aria-label={chassisCopy.colour.legend}
      className={form === "wide" ? "flex items-center gap-[6px]" : "flex items-center gap-[10px]"}
    >
      {PIP_ORDER.map((code) => {
        const lit = on.has(code);
        return (
          <button
            key={code}
            type="button"
            // `switch` with `aria-checked`, matching what `color-pip.tsx` already
            // emitted. The role is the one thing about the old control that was
            // right, and changing it would move an accessibility contract for no
            // reason — including under set collections' Task 9, which extracts
            // the control this replaces.
            role="switch"
            aria-checked={lit}
            aria-label={chassisCopy.colour.pipAria(chassisCopy.colour.names[code], lit)}
            onClick={() => onToggle(code)}
            // The ring is the entire lit treatment. No opacity on either state:
            // an unlit pip is the symbol at full strength, which is what makes it
            // legible on every ground in every theme.
            className={[
              "cursor-pointer rounded-full border-0 p-0 transition-shadow",
              lit ? "shadow-[0_0_0_2px_var(--accent)]" : "shadow-none",
            ].join(" ")}
            // The symbol is a background rather than an `<img>`: it is
            // decorative here — the button's own `aria-label` names the colour —
            // and every other art surface in this app draws through
            // `background` for the same reason. It also keeps the lit ring on
            // the button itself rather than around a nested element.
            style={{
              width: size,
              height: size,
              // eslint-disable-next-line no-restricted-syntax -- one of five per-hue URLs; Tailwind cannot compile an interpolated class, and a pip has no hover state for an inline background to outrank
              background: `center / contain no-repeat url(${PIP_SRC[code]})`,
            }}
          />
        );
      })}
    </div>
  );
}
