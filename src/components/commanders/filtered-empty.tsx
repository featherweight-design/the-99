"use client";
// The zero states both lanes draw — canvases D4 (owned), D5 (discover) and E5
// (phone). One shell, because a reader who empties one lane and then the other
// should recognise the second state as the same thing said about a different
// list.
//
// The rack above it never changes here. A zero result is a fact about the list,
// and the controls are how the reader leaves it, so nothing above this state is
// hidden, disabled or collapsed when it renders.

import type { ReactNode } from "react";
import { commandersCopy, filterCopy } from "../../lib/copy/lanes";
import { GhostButton, PrimaryButton } from "../ui/button";

/** Three hairline diamonds, the same rotated square the end-of-ranking rule
    draws, so every full-stop on this page is furniture of one family.
    Decorative: the heading below says the same thing in words. */
function DiamondRule() {
  return (
    <div className="flex gap-[7px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-[10px] w-[10px] rotate-45 border border-solid border-[color:var(--border-strong)]"
        />
      ))}
    </div>
  );
}

/** The shared shape: rule, heading, one sentence, and at most two affordances.
    The buttons stack full-width at 48px on the phone and sit side by side at
    32px from `sm:` up — one element per button with responsive classes, so each
    sentence and each label exists exactly once in the document. */
export function ZeroState({
  heading,
  body,
  primary,
  secondary,
}: {
  heading: string;
  body: ReactNode;
  primary?: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-[12px] px-[22px] pt-[40px] pb-[40px] text-center sm:pt-[34px] sm:pb-[38px]">
      <DiamondRule />
      <h2 className="font-display m-0 text-[19px] font-semibold text-[color:var(--fg)]">
        {heading}
      </h2>
      <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-muted)] sm:max-w-[520px]">
        {body}
      </p>
      {primary || secondary ? (
        <div className="mt-[6px] flex w-full flex-col gap-[9px] self-stretch sm:mt-[4px] sm:w-auto sm:flex-row sm:self-auto">
          {primary}
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

/** Shared button geometry: 48px full-width on the phone, 32px hugging its label
    from `sm:` up. The primitives own fill, border and type family; height,
    padding and size are the caller's, which is what these two constants are. */
export const ZERO_PRIMARY =
  "inline-flex items-center justify-center h-[48px] rounded-[10px] text-[14px] " +
  "sm:h-[32px] sm:rounded-[8px] sm:px-[14px] sm:text-[12.5px]";
export const ZERO_SECONDARY =
  "inline-flex items-center justify-center h-[48px] rounded-[10px] text-[14px] " +
  "sm:h-[32px] sm:rounded-[8px] sm:px-[13px] sm:text-[12.5px]";

/** The body lifts two phrases out of the sentence the copy module owns: the
    commander's name, and the control that excluded it. Both go to `--fg-body`,
    and the control also takes the mono face every other control name on this
    page is set in. Marked by colour alone rather than bolded — a screen reader
    hears the sentence, and the lift is for the eye scanning it.
    Two faces, so the shared `Emphasised` (one style per call) cannot draw it. */
function markPhrases(text: string, name: string, control: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  const marks: Array<[string, string]> = [
    [name, "text-[color:var(--fg-body)]"],
    [control, "font-mono text-[12.5px] text-[color:var(--fg-body)]"],
  ];
  marks.forEach(([value, className], i) => {
    const at = rest.indexOf(value);
    if (at === -1) return;
    nodes.push(rest.slice(0, at));
    nodes.push(
      <span key={i} className={className}>
        {value}
      </span>,
    );
    rest = rest.slice(at + value.length);
  });
  nodes.push(rest);
  return nodes;
}

/**
 * The owned lane at zero (D4). One control is named — the single one whose
 * removal returns the most rows — along with the commander it would bring back
 * and how many rows come with it. That promise is the whole point of the state,
 * so where no single control fixes the list the sentence drops it rather than
 * making one it cannot keep, and only the wholesale escape renders.
 *
 * The choice of control is arithmetic and is made in `nearestFix`; this draws
 * the answer.
 */
export function FilteredEmpty({
  nearest,
  onDrop,
  onClearAll,
}: {
  nearest: { name: string; control: string; rows: number } | null;
  onDrop: () => void;
  onClearAll: () => void;
}) {
  return (
    <ZeroState
      heading={commandersCopy.empty.heading}
      body={
        nearest
          ? markPhrases(
              commandersCopy.empty.bodyOneFix(nearest.name, nearest.control, nearest.rows),
              nearest.name,
              nearest.control,
            )
          : commandersCopy.empty.bodyNoSingleFix
      }
      primary={
        nearest ? (
          <PrimaryButton onClick={onDrop} className={ZERO_PRIMARY}>
            {commandersCopy.empty.fixDrop(nearest.control)}
          </PrimaryButton>
        ) : undefined
      }
      secondary={
        <GhostButton onClick={onClearAll} className={ZERO_SECONDARY}>
          {filterCopy.chips.clearAll}
        </GhostButton>
      }
    />
  );
}
