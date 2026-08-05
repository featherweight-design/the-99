// Role Counter Cell — §Role Counter Strip — each cell is a client button.
// Touch AND keyboard accessible: button + aria-expanded + hidden rationale panel.
"use client";

import { useId, useState } from "react";
import { roleCellState } from "../../lib/decks/mix";
import { addPanelCopy } from "../../lib/copy/decks-builder";

interface RoleCounterCellProps {
  role: string;
  label: string;
  have: number;
  target: number;
  advisory: boolean;
  rationale: string;
  /** Absent on a cell that is not short: there is nothing to send the user to. */
  onSeeShelf?: () => void;
}

export function RoleCounterCell({
  role,
  label,
  have,
  target,
  advisory,
  rationale,
  onSeeShelf,
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
        className="flex-1 min-w-0 rounded-[7px] md:rounded-[9px] px-[5px] py-[6px] md:px-[14px] md:py-[11px] text-center md:text-left"
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

        {/* §Role counter cell — "rec N" caption: mobile mt 0; desktop mt 6px */}
        <p
          className="font-mono text-[8px] md:text-[9px] text-[#6E6353] md:text-[#8E8269] mt-0 md:mt-[6px]"
        >
          {advisory ? `rec ~${target}` : `rec ${target}`}
        </p>
      </button>

      {/* The handoff says the under-target cell "becomes a link". The cell is
          already a button owning the rationale disclosure — the only route to
          rationale at phone width — and an anchor cannot nest inside one, so
          the link draws beneath it instead, which is what the strip annotation
          ("A cell under target links its shelf below") describes. Flagged to
          Design for ratification. */}
      {onSeeShelf && (
        <a
          href={`#shelf-${role}`}
          onClick={onSeeShelf}
          aria-label={addPanelCopy.strip.shelfLinkAria(label.toLowerCase())}
          className="font-mono text-[9px] md:text-[10px] mt-[4px] text-center md:text-left text-brass hover:text-brass-hover"
        >
          {addPanelCopy.strip.shelfLink} →
        </a>
      )}

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
