"use client";
// `Build from` — the owned lane's control, and the owned lane's only (locked
// decision 3). Discover does not mount it, greyed or otherwise: it is not in
// that lane's control list, and a disabled stand-in would invite a reader to go
// looking for the thing that would enable it.
//
// A radiogroup, not a tablist: it switches the data the lane is ranked on, not
// which panel is showing. The label is never shortened to "Availability" — it is
// doing anti-collision work against the builder's `Owned only`, which filters a
// collection and asks a different question.
//
// The roving tab stop is `ScoreAgainst`'s from `filter-bar.tsx`, carried across
// rather than redesigned.

import { useId } from "react";
import type { Avail } from "../../../lib/commanders/lane-params";
import { commandersCopy } from "../../../lib/copy/lanes";
import { onSegmentKeys } from "../../ui/segment-keys";

const copy = commandersCopy.availability;

export function AvailabilityControl({
  value,
  onChange,
  wide,
}: {
  value: Avail;
  onChange: (a: Avail) => void;
  wide: boolean;
}) {
  const segments = [
    { mode: "all" as const, label: copy.all, aria: copy.all },
    // The rack's segment is 32px and takes the short word; the sheet's 44px pill
    // has the room for the whole of it. The announced name is the same at both.
    { mode: "free" as const, label: wide ? copy.freeShort : copy.free, aria: copy.free },
  ];

  // Generated: both lanes may mount a rack and a sheet across a session, and a
  // literal id would put two of them in the document.
  const labelId = useId();
  const idOf = (mode: Avail) => `${labelId}-${mode}`;
  const modes = segments.map((s) => s.mode);

  const off = value !== "all";

  return (
    <div className={wide ? "flex items-center gap-[8px]" : "flex flex-col gap-[10px]"}>
      <p
        id={labelId}
        className="font-mono m-0 text-[10px] tracking-[0.12em] uppercase text-[color:var(--fg-faint)]"
      >
        {copy.legend}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        // A radiogroup is one tab stop, and the app's segment keys (arrows, Home, End) move the choice and the
        // focus together. Selection follows focus, the shipped behaviour for a group this small. The markup stays
        // its own (segmented-switch plan, PR 2).
        onKeyDown={(e) => onSegmentKeys(e, modes, idOf, (m) => m !== value && onChange(m))}
        className={[
          "flex",
          // One capsule with the segments butted inside it, so the pair reads as
          // a single control with two positions rather than two buttons that
          // happen to sit together. The sheet has no wrapper at all: its pills
          // are 44px apart and each carries its own border.
          wide
            ? "h-[32px] overflow-hidden rounded-lg border border-solid bg-[color:var(--surface-sunken)]"
            : "gap-[8px] bg-transparent",
          // The border is the state on the rack; in the sheet the selected pill
          // carries it and there is no wrapper to light.
          wide && off
            ? "border-[color:var(--accent)]"
            : wide
              ? "border-[color:var(--border-strong)]"
              : "",
        ].join(" ")}
      >
        {segments.map((s, i) => {
          const selected = s.mode === value;
          return (
            <button
              key={s.mode}
              id={idOf(s.mode)}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={s.aria}
              // Roving: the checked segment is the group's single tab stop.
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(s.mode)}
              className={[
                "flex items-center justify-center cursor-pointer",
                wide
                  ? // A hairline between the segments and nothing around them:
                    // the wrapper already drew the outside, and a second border
                    // there would read as a gap.
                    [
                      "h-[32px] border-0 px-[11px] text-[12.5px]",
                      i > 0 ? "border-l border-solid border-[color:var(--border)]" : "",
                      selected
                        ? "bg-[color:var(--elevated)] text-[color:var(--fg)]"
                        : "bg-transparent text-[color:var(--fg-muted)]",
                    ].join(" ")
                  : [
                      "h-[44px] rounded-full border border-solid px-[16px] text-[13.5px]",
                      selected
                        ? "border-[color:var(--accent)] bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-[color:var(--fg)]"
                        : "border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]",
                    ].join(" "),
              ].join(" ")}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      {/* Sheet only: on the rack the two segments are side by side and the
          reader can see what "free" is being contrasted with. */}
      {!wide && (
        <p className="font-mono m-0 text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">
          {copy.hint}
        </p>
      )}
    </div>
  );
}
