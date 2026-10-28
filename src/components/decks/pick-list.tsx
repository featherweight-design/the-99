"use client";

import type { ReactNode } from "react";

import type { PickState } from "../../lib/tuning/pick-n";
import { CreditsText } from "../ui/credits-text";

/**
 * A run's named rows, of which the player chooses some (`pickState`): the result block's box, its
 * head, the rows the caller draws, and the foot. Proposed cuts' result is the first caller (small
 * items R1b, `Cuts-Alternatives`); Suggested changes v2 reuses the pattern. The rows are the caller's
 * own (CutRow for cuts, drawn as shipped): this component counts nothing and draws no control.
 *
 * The words come from the caller over the same state the lead reads, so the head, the lead and the
 * foot cannot disagree. `footTail` is appended after a `·` (the credits standing) and drawn through
 * `CreditsText`, as the shipped foot was.
 */
export function PickList({
  state,
  words,
  read,
  footTail,
  after,
  children,
}: {
  state: PickState;
  words: { head: (s: PickState) => string; foot: (s: PickState) => string };
  /** The mono line beside the head. */
  read: string;
  footTail?: string;
  /** Between the rows and the foot (a capped run's "more still over" line). */
  after?: ReactNode;
  /** The rows, each an `<li>`. */
  children: ReactNode;
}) {
  const foot = words.foot(state);
  return (
    <div className="mt-[14px] rounded-[10px] px-[12px] py-[14px] md:px-[14px]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex flex-col gap-[3px] md:flex-row md:items-baseline md:gap-[10px]">
        <h3 className="text-[14px] font-semibold" style={{ color: "var(--fg)" }}>{words.head(state)}</h3>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{read}</span>
      </div>
      <ul className="mt-[10px] flex flex-col gap-[8px]">{children}</ul>
      {after}
      <p className="mt-[12px] font-mono text-[10.5px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
        <CreditsText text={footTail ? `${foot} · ${footTail}` : foot} />
      </p>
    </div>
  );
}
