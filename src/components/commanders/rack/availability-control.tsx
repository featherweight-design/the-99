"use client";
// `Score against` — the owned lane's control, and the owned lane's only (locked
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

import { useId, useRef } from "react";
import type { Avail } from "../../../lib/commanders/lane-params";
import { commandersCopy } from "../../../lib/copy/lanes";

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

  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // Generated: both lanes may mount a rack and a sheet across a session, and a
  // literal id would put two of them in the document.
  const labelId = useId();

  // A radiogroup is one tab stop and the arrows move within it. Selection
  // follows focus, which is the shipped behaviour for a group this small and
  // matches what a click already does.
  const step = (from: number, dir: 1 | -1) => {
    const next = (from + dir + segments.length) % segments.length;
    refs.current[next]?.focus();
    onChange(segments[next].mode);
  };

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
        className={[
          "flex rounded-lg border border-solid",
          wide ? "gap-[3px] p-[3px] h-[32px]" : "gap-[6px] border-0 p-0",
          // The border is the state on the rack; in the sheet the selected pill
          // carries it and there is no wrapper to light.
          wide && off
            ? "border-[color:var(--accent)]"
            : wide
              ? "border-[color:var(--border-strong)]"
              : "border-transparent",
          wide ? "bg-[color:var(--surface-sunken)]" : "bg-transparent",
        ].join(" ")}
      >
        {segments.map((s, i) => {
          const selected = s.mode === value;
          return (
            <button
              key={s.mode}
              ref={(node) => {
                refs.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={s.aria}
              // Roving: the checked segment is the group's single tab stop.
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(s.mode)}
              onKeyDown={(e) => {
                const dir =
                  e.key === "ArrowRight" || e.key === "ArrowDown"
                    ? 1
                    : e.key === "ArrowLeft" || e.key === "ArrowUp"
                      ? -1
                      : 0;
                if (dir === 0) return;
                e.preventDefault();
                step(i, dir);
              }}
              className={[
                "flex items-center justify-center cursor-pointer border border-solid",
                wide
                  ? "rounded-md px-[13px] h-[24px] text-[12.5px]"
                  : "flex-1 rounded-lg px-[10px] h-[44px] text-[13px]",
                selected
                  ? "font-semibold bg-[color:var(--elevated)] border-[color:var(--border-strong)] text-[color:var(--fg)]"
                  : "font-medium bg-transparent border-transparent text-[color:var(--fg-body)]",
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
