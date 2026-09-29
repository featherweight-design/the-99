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

import { chassisCopy, PIP_ORDER, PIP_BACKGROUND, type PipCode } from "../../lib/copy/filter-chassis";

/**
 * Scryfall's own symbols, committed under `public/mana/`. They are finished
 * multi-colour illustrations — a filled `<circle>` ground with the symbol pathed
 * over it, and the hybrids carry two differently-coloured halves — so they are
 * drawn as images and never masked or tinted (decision 7). Masking would
 * flatten a hybrid to one colour, which is the thing the decision exists to
 * prevent; dimming an available pip is what the shipped controls did wrong.
 *
 * The single exception is the UNAVAILABLE state, which takes the design
 * system's own `.42` disabled dimming — reasoned about at the `aria-disabled`
 * line below. Decision 7 rules on how an available filter is drawn; a filter
 * with nothing to match is not one.
 */

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
  /**
   * The group's accessible name. Defaults to `Colour`, which is what three of
   * the four routes filter by. The commander lanes filter by colour IDENTITY
   * and say so — a Commander deck is built on identity, not on the colours
   * printed in a cost, and flattening the two would be wrong rather than
   * merely terse. The caller passing this owns the name; it does NOT wrap this
   * group in another one, because a group inside a group with two names for
   * one control is read out twice.
   */
  legend?: string;
  /**
   * Hue codes no surviving card carries. `collection/color-filter.ts` states
   * the contract: a colour with no matches stays listed and disabled, because
   * the vocabulary is fixed and dropping one would move the other four.
   *
   * Both forms, not just the phone's. The route's retired mobile panel
   * disabled these and its desktop row did not, which is the kind of
   * two-forms-one-control disagreement this component exists to end.
   */
  unavailable?: readonly string[];
};

export function ColourPips({ value, onToggle, form, unavailable, legend }: ColourPipsProps) {
  // Read is case-tolerant so a lowercase caller still lights its pips; the
  // WRITE is always canonical uppercase (`PIP_ORDER`). A caller whose state is
  // lowercase maps on the way out — the commander rack is the only one.
  const on = new Set(value.map((v) => v.toUpperCase()));
  const off = new Set((unavailable ?? []).map((v) => v.toUpperCase()));
  const size = form === "wide" ? DESKTOP_PX : PHONE_PX;

  return (
    <div
      role="group"
      aria-label={legend ?? chassisCopy.colour.legend}
      className={form === "wide" ? "flex items-center gap-[6px]" : "flex items-center gap-[10px]"}
    >
      {PIP_ORDER.map((code) => {
        const lit = on.has(code);
        // A lit hue stays interactive even with no matches left, or the reader
        // could not turn off the filter that emptied the list.
        const dead = !lit && off.has(code);
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
            // `aria-disabled`, not the native attribute, and `opacity .42` —
            // the treatment the design table already gives a zero-count filter
            // option (`collection-filter-panel.md` row · disabled), which is
            // what the retired mobile Color panel drew for exactly this state.
            // It stays focusable so a keyboard reader can still find it and
            // hear why it is out; the native attribute took it off the tab ring
            // and left a sighted reader a pip that looked ordinary and did
            // nothing.
            //
            // This is not the opacity decision 7 forbids. That one rules on the
            // UNLIT state, where dimming put the symbol at 1.37:1 and made an
            // available filter illegible. Dimming an UNAVAILABLE one is the
            // system's own disabled convention, and the table records that it
            // fails AA deliberately.
            aria-disabled={dead || undefined}
            aria-label={
              dead
                ? chassisCopy.colour.pipAriaUnavailable(
                    chassisCopy.colour.names[code.toLowerCase() as Lowercase<PipCode>],
                  )
                : chassisCopy.colour.pipAria(
                    chassisCopy.colour.names[code.toLowerCase() as Lowercase<PipCode>],
                  )
            }
            onClick={() => { if (!dead) onToggle(code); }}
            // The ring is the entire lit treatment. No opacity separates lit
            // from unlit: an unlit pip is the symbol at full strength, which is
            // what makes it legible on every ground in every theme. The one
            // opacity here says UNAVAILABLE, which is a different question.
            className={[
              // `shrink-0` is load-bearing, not tidiness: these are flex items
              // in the chassis's control row, which is deliberately allowed to
              // compress. Without it a narrow row would shrink the inline width
              // below the 44px the phone form promises as a touch target.
              // No transition on the ring. READINESS 19 forbids motion on this
              // surface outright, and the selected state changes instantly.
              "shrink-0 rounded-full border-0 p-0",
              // `.42` is the system's disabled dimming, reasoned about on the
              // `aria-disabled` line above — the one opacity on this control,
              // and not the one decision 7 rules out.
              dead ? "cursor-default opacity-[0.42]" : "cursor-pointer",
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
              // One of five sprite cells. Tailwind cannot compile an interpolated class, and the
              // longhands set only the image, so nothing here outranks a hover colour.
              ...PIP_BACKGROUND[code],
            }}
          />
        );
      })}
    </div>
  );
}
