"use client";

// The one tag-a-card box: a frame that holds a text field, with the `[[ ]]` key, its words and the counter in the
// frame's foot (Tag-Control board). Every box that can name a card draws its foot here, so the key, the words and the
// counter colors cannot drift between places. The caller owns the field (its padding, size and ref) and passes it as
// `children`; the picker's list is drawn by the caller, under the frame, and anchored to `frameRef`.

import type { ReactNode, Ref } from "react";
import { TAG_A_CARD_WORDS } from "../../lib/copy/card-tags";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";

const copy = deckDescriptionCopy.notes;

export function TaggedBox({
  children,
  onInsert,
  open = false,
  count,
  max,
  warnAt,
  over,
  counterId,
  words = TAG_A_CARD_WORDS,
  fill = "surface",
  dashed = false,
  error,
  accent = "focus",
  keyProps,
  footProps,
  footPad = "default",
  disabled = false,
  frameRef,
  className = "",
}: {
  children: ReactNode;
  /** Starts a tag where the caret is (`picker.insertTag`). */
  onInsert: () => void;
  /** The picker's list is open: the key is lit. */
  open?: boolean;
  count: number;
  max: number;
  /** The count from which the counter turns warning-colored; absent, it never does. */
  warnAt?: number;
  /** Past the cap; absent, `count > max`. */
  over?: boolean;
  /** The counter's id, for a field's `aria-describedby`. */
  counterId?: string;
  /** The foot's words beside the key. */
  words?: string;
  fill?: "surface" | "sunken";
  dashed?: boolean;
  /** The danger frame; absent, drawn exactly while the count is past the cap (`over`). It outranks the accent edge. */
  error?: boolean;
  /** `focus`: the accent edge on focus-within; `always`: the accent edge at rest too (an editor opened in place). */
  accent?: "focus" | "always";
  /** Spread on the key (e.g. `data-lock-hide`). */
  keyProps?: Record<string, string>;
  /** Spread on the whole foot (e.g. `data-lock-hide`, to hide the key, words and counter together). */
  footProps?: Record<string, string>;
  /** `compact`: the dashed header description's 2 10 7 foot. */
  footPad?: "default" | "compact";
  /** The field is out of play (a save in flight): the frame dims and the key is disabled. */
  disabled?: boolean;
  /** The frame element, for a list anchored to it. */
  frameRef?: Ref<HTMLDivElement>;
  /** Layout classes for the frame (e.g. `flex-1` in a stretching column). */
  className?: string;
}) {
  const isOver = over ?? count > max;
  const color = isOver ? "var(--danger)" : warnAt !== undefined && count >= warnAt ? "var(--warning)" : "var(--fg-faint)";
  // The border is a class, never inline, so the focus edge can take it (an inline border outranks it).
  const edge = (error ?? isOver)
    ? "border-[color:var(--danger)]"
    : accent === "always"
      ? "border-[color:var(--accent)]"
      : "border-[color:var(--border-strong)] focus-within:border-[color:var(--accent)]";
  // The textarea is outline-none and a frame already accent or danger looks the same focused, so keyboard focus
  // would be invisible (WCAG 2.4.7): those frames take the app's standard focus ring (globals.css `:focus-visible`).
  const ring =
    (error ?? isOver) || accent === "always"
      ? "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--accent)]"
      : "";
  return (
    <div
      ref={frameRef}
      data-framed-box=""
      // Help me choose's locked look mutes the edge through this attribute (globals.css `[data-lock-edge]`); inert elsewhere.
      data-lock-edge=""
      className={`flex flex-col rounded-[9px] border ${dashed ? "border-dashed" : "border-solid"} ${edge} ${ring} ${fill === "sunken" ? "bg-[color:var(--surface-sunken)]" : "bg-[color:var(--surface)]"} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
    >
      {children}
      <span
        className={`flex items-center gap-[8px] font-mono text-[11px] ${footPad === "compact" ? "px-[10px] pt-[2px] pb-[7px]" : "px-[12px] pt-[2px] pb-[8px]"}`}
        style={{ color: "var(--fg-faint)" }}
        // A press on the foot's padding or the counter must not blur the field (a box that saves on blur).
        onMouseDown={(e) => e.preventDefault()}
        {...footProps}
      >
        <button
          type="button"
          aria-label={copy.tagHelp.insertAria}
          // The key must not take the field's focus: a press must not blur a box that saves on blur.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onInsert}
          disabled={disabled}
          {...keyProps}
          // Drawn 24 high at every pointer; under a coarse pointer only its hit box grows (the pseudo-element belongs to the button).
          className={`relative h-[24px] shrink-0 cursor-pointer rounded-[6px] border border-solid border-[color:var(--border-strong)] px-[8px] font-mono text-[11px] pointer-coarse:after:absolute pointer-coarse:after:-inset-x-[8px] pointer-coarse:after:-inset-y-[10px] pointer-coarse:after:content-[''] ${open ? "bg-[color:var(--elevated)] text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"}`}
        >
          {copy.tagHelp.insert}
        </button>
        {words ? <span aria-hidden="true">{words}</span> : null}
        <span id={counterId} className="ml-auto tabular-nums" style={{ color }}>
          {copy.counter(count, max)}
        </span>
      </span>
    </div>
  );
}
