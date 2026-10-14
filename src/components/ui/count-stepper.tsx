"use client";

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
}) {
  const band = layout === "band";
  const shell = band
    ? "absolute inset-x-0 bottom-0 z-20 flex h-[44px] items-center justify-between md:h-[32px] bg-[color:color-mix(in_oklab,var(--bg)_70%,transparent)]"
    : "flex-none flex items-center";
  const button = band
    ? "flex h-[44px] w-[44px] md:h-[32px] md:w-[32px] items-center justify-center font-mono text-[15px] md:text-[13px] leading-none text-[color:var(--fg-body)] md:text-[color:var(--fg-faint)] md:group-hover:text-[color:var(--fg)] md:group-focus-within:text-[color:var(--fg)]"
    : "flex h-[44px] w-[44px] md:h-[20px] md:w-[22px] items-center justify-center font-mono text-[15px] md:text-[13px] leading-none text-[color:var(--fg-faint)] md:text-[color:var(--border-dashed)] md:group-hover:text-[color:var(--fg-body)] md:group-focus-within:text-[color:var(--fg-body)]";
  const ring =
    "cursor-pointer bg-transparent border-0 p-0 rounded-[6px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--accent)]";
  return (
    <span className={shell} data-testid={`count-stepper-${layout}`}>
      {count === 1 && atOne ? (
        atOne
      ) : (
        <button type="button" aria-label={fewerLabel} onClick={() => onStep(-1)} className={`${button} ${ring}`}>
          {"−"}
        </button>
      )}
      <CountField count={count} label={countLabel} band={band} onStep={onStep} onType={onType} />
      <button type="button" aria-label={moreLabel} onClick={() => onStep(1)} className={`${button} ${ring}`}>
        +
      </button>
    </span>
  );
}

function CountField({
  count,
  label,
  band,
  onStep,
  onType,
}: {
  count: number;
  label: string;
  band: boolean;
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
  return (
    <input
      inputMode="numeric"
      aria-label={label}
      value={shownText}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
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
      className={`h-[22px] md:h-[20px] bg-transparent border-0 border-b-2 border-b-transparent p-0 text-center font-mono tabular-nums text-[16px] md:text-[12px] text-[color:var(--fg-body)] outline-none focus:border-b-[color:var(--accent)]`}
    />
  );
}
