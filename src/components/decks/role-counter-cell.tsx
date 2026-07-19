// Role Counter Cell — §Role Counter Strip — each cell is a client button.
// Touch AND keyboard accessible: button + aria-expanded + hidden rationale panel.
"use client";

import { useId, useState } from "react";
import { roleCellState } from "../../lib/decks/mix";

interface RoleCounterCellProps {
  role: string;
  label: string;
  have: number;
  target: number;
  advisory: boolean;
  rationale: string;
}

export function RoleCounterCell({
  label,
  have,
  target,
  advisory,
  rationale,
}: RoleCounterCellProps) {
  const [open, setOpen] = useState(false);
  const rationaleId = useId();
  const { figureColor, barColor, pct } = roleCellState({ have, target, advisory });

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/*
        §Role counter cell container
        mobile:  bg #181410, border 1px #2A241D, br 7px, p 6px 5px, text-center
        desktop: bg #181410, border 1px #2A241D, br 9px, p 11px 14px
      */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={rationaleId}
        className="flex-1 min-w-0 rounded-[7px] md:rounded-[9px] px-[5px] py-[6px] md:px-[14px] md:py-[11px] text-center md:text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
        style={{
          background: "#181410",
          border: "1px solid #2A241D",
          cursor: "help",
        }}
      >
        {/* §Role counter cell — label */}
        <p
          className="font-mono uppercase truncate overflow-hidden text-ellipsis text-[8.5px] md:text-[10px] tracking-[0.04em] md:tracking-[0.1em]"
          style={{ color: "#8E8269" }}
        >
          {label}
        </p>

        {/* §Role counter cell — current-count figure */}
        <p
          className="font-mono font-semibold text-[13px] md:text-[16px] mt-[2px]"
          style={{ color: figureColor }}
        >
          {have}
        </p>

        {/* §Role counter cell — fill bar track (desktop only) */}
        <div
          className="hidden md:block rounded-full overflow-hidden mt-[8px]"
          style={{ height: 5, background: "#2A241D" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>

        {/* §Role counter cell — "rec N" caption */}
        {/* mobile: #6E6353 · desktop: #8E8269 (design table §Role counter cell — "rec N" caption) */}
        <p
          className="font-mono text-[8px] md:text-[9px] text-[#6E6353] md:text-[#8E8269]"
          style={{ marginTop: 0 }}
        >
          {advisory ? `rec ~${target}` : `rec ${target}`}
        </p>
      </button>

      {/* Rationale text — toggled by button; hidden via aria-hidden + display none */}
      <p
        id={rationaleId}
        role="region"
        aria-label={`${label} rationale`}
        className="font-mono text-[10.5px] leading-[1.5] mt-[5px] px-[6px]"
        style={{
          color: "#C6B79A",
          display: open ? "block" : "none",
        }}
        aria-hidden={!open}
      >
        {rationale}
      </p>
    </div>
  );
}
