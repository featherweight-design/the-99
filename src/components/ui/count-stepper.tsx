"use client";

import { TOUCH_HIT } from "./touch-hit";
import { useState } from "react";

/**
 * `− count +`, drawn bare: no box and no border (basic lands stepper, R2, `design-tables/basic-lands-stepper.md`).
 * Two layouts of one control: `row`, in a decklist row's ✕ slot, and `band`, across the foot of a card tile's
 * art on a 70% `--bg` scrim. It draws the three parts and nothing else; the caller owns the count, the labels
 * and what the − slot does at 1 (`atOne`, which takes the − slot whole, so nothing moves).
 *
 * Nothing here is ever disabled, nothing spins, and a press never waits on a save: the caller's count moves at
 * once (STATES rule 5). The field takes a typed figure, committing on Enter and on leaving and restoring on
 * Escape; Arrow Up and Down step by one, as the buttons do. 16px below `md` so iOS does not zoom on focus.
 *
 * Desktop rest ink is the ✕'s (`--border-dashed` on a row, `--fg-faint` on a band), lifting on the row or
 * tile's hover and on focus anywhere inside it (the caller's `group`), as STATES S7 asks. The phone has no hover, so its ink is
 * the lifted one already.
 */
export function CountStepper({
  layout,
  count,
  fewerLabel,
  moreLabel,
  countLabel,
  onStep,
  onType,
  atOne,
  fewerOff = false,
  moreOff = false,
  size = "line",
}: {
  layout: "row" | "band";
  count: number;
  fewerLabel: string;
  moreLabel: string;
  countLabel: string;
  onStep: (delta: 1 | -1) => void;
  onType: (n: number) => void;
  /** Drawn in the − slot when the count is 1: the shipped ✕, with its own label and press. */
  atOne?: React.ReactNode;
  /** A bounded count at its floor or ceiling (Suggested changes' 1 to 20): that button greys and its press is refused,
   *  while staying focusable and named (`aria-disabled`, never `disabled`). Absent, nothing is ever off, as shipped. */
  fewerOff?: boolean;
  moreOff?: boolean;
  /** `row` only. `line` (the default) is the decklist's bare 34px line, as shipped. `cell` is a bordered group of three
   *  cells, the form a count drawn as a field of its own takes (Suggested changes' How many cards?): 44px cells on a
   *  phone, 40px from `md`, the figure's cell at least 44px wide and ruled off from the buttons. */
  size?: "line" | "cell";
}) {
  const band = layout === "band";
  const cell = !band && size === "cell";
  const shell = band
    ? "absolute inset-x-0 bottom-0 z-20 flex h-[44px] items-center justify-between md:h-[32px] bg-[color:color-mix(in_oklab,var(--bg)_70%,transparent)]"
    : cell
      ? "inline-flex flex-none items-stretch overflow-hidden rounded-[9px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]"
      : "flex-none flex items-center";
  const button = cell
    ? "flex h-[44px] w-[44px] md:h-[40px] md:w-[40px] items-center justify-center font-mono text-[16px] md:text-[15px] leading-none text-[color:var(--fg-body)] hover:text-[color:var(--fg)]"
    : band
    ? "flex h-[44px] w-[44px] md:h-[32px] md:w-[32px] items-center justify-center font-mono text-[15px] md:text-[13px] leading-none text-[color:var(--fg-body)] md:text-[color:var(--fg-faint)] md:group-hover:text-[color:var(--fg)] md:group-focus-within:text-[color:var(--fg)]"
    // A row is one 34px line at every width, so the row's buttons are the ✕'s 22x20 and a coarse pointer's 44px hit is
    // drawn past them (TOUCH_HIT), as on the ✕ that takes the − slot at 1. On a coarse pointer the button is itself the
    // 44px-wide slot (the hit adds height only), so its hit never reaches the figure's.
    : `flex h-[20px] w-[22px] items-center justify-center font-mono text-[13px] leading-none text-[color:var(--border-dashed)] active:text-[color:var(--fg-body)] group-hover:text-[color:var(--fg-body)] group-focus-within:text-[color:var(--fg-body)] pointer-coarse:w-[44px] ${TOUCH_HIT}`;
  const ring =
    "cursor-pointer bg-transparent border-0 p-0 rounded-[6px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--accent)]";
  return (
    <span className={shell} data-testid={`count-stepper-${layout}`} data-size={cell ? "cell" : undefined}>
      {count === 1 && atOne ? (
        atOne
      ) : (
        <button type="button" aria-label={fewerLabel} aria-disabled={fewerOff || undefined} onClick={() => { if (!fewerOff) onStep(-1); }} className={`${button} ${ring} ${fewerOff ? OFF : ""}`}>
          {"−"}
        </button>
      )}
      <CountField count={count} label={countLabel} band={band} cell={cell} onStep={onStep} onType={onType} />
      <button type="button" aria-label={moreLabel} aria-disabled={moreOff || undefined} onClick={() => { if (!moreOff) onStep(1); }} className={`${button} ${ring} ${moreOff ? OFF : ""}`}>
        +
      </button>
    </span>
  );
}

/** A bounded count's end (`fewerOff`, `moreOff`): greyed over every rest and hover ink the layouts give. */
const OFF = "cursor-default text-[color:var(--fg-disabled)]! group-hover:text-[color:var(--fg-disabled)]!";

/** A coarse pointer's row figure is its own 44px slot between the − and + slots: 44px wide and tall, the extra height drawn past
 *  the 34px line by negative margins on a `<label>` around the input (an input has no pseudo-element to carry a hit, and a
 *  label's press focuses it), so a tap on the count opens the field instead of stepping it, and the focus underline stays
 *  under the digits. */
const ROW_FIGURE_SLOT = "pointer-coarse:-my-[12px] pointer-coarse:py-[12px]";
const ROW_FIGURE_COARSE = "pointer-coarse:min-w-[44px]!";
/** The `cell` group's figure: at least 44px wide, ruled off from the buttons either side (the board's `.stpr b`). */
const CELL_FIGURE = "min-w-[44px] px-[4px] items-center border-x border-solid border-[color:var(--border)]";

function CountField({
  count,
  label,
  band,
  cell = false,
  onStep,
  onType,
}: {
  count: number;
  label: string;
  band: boolean;
  /** The bordered group's figure cell: wider than its buttons, ruled off from them. */
  cell?: boolean;
  onStep: (delta: 1 | -1) => void;
  onType: (n: number) => void;
}) {
  // A draft while typing, so the field can be cleared and a fresh figure typed; null shows the count.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft !== "") onType(Number.parseInt(draft, 10));
    setDraft(null);
  };
  const shownText = draft ?? String(count);
  // The label's padding is part of the figure's hit: a press on it focuses the input and must not reach the row's own press.
  return (
    <label
      className={`flex justify-center ${cell ? CELL_FIGURE : band ? "" : ROW_FIGURE_SLOT}`}
      onClick={(e) => e.stopPropagation()}
    >
    <input
      inputMode="numeric"
      aria-label={label}
      value={shownText}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setDraft(null);
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const delta = e.key === "ArrowUp" ? 1 : -1;
          // From the figure typed so far when there is one, as a reader expects of a number field; the typed
          // bounds still apply, since it goes through `onType`.
          const typed = draft !== null && draft !== "" ? Number.parseInt(draft, 10) : null;
          setDraft(null);
          if (typed !== null) onType(typed + delta);
          else onStep(delta);
        }
      }}
      // The design's widths are the MINIMUM (24px on a row, 32px on a band); a count past two digits (a press
      // past 99, an imported stack in the thousands) widens the field by its own digits, at the same font, rather
      // than clipping. Monospace, so `ch` is one digit.
      style={{ minWidth: band ? 32 : 24, width: `${shownText.length + 0.5}ch` }}
      className={`${band || cell ? "" : ROW_FIGURE_COARSE} ${cell ? "font-semibold [@media(pointer:fine)]:md:text-[15px]! text-[color:var(--fg)]!" : ""} h-[20px] bg-transparent border-0 border-b-2 border-b-transparent p-0 text-center font-mono tabular-nums text-[16px] [@media(pointer:fine)]:md:text-[12px] text-[color:var(--fg-body)] outline-none focus:border-b-[color:var(--accent)]`}
    />
    </label>
  );
}
