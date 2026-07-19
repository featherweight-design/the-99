"use client";
// Client wrapper: ⛶ Full card trigger button + lightbox state.
// detail.tsx (server component) renders this, passing the commander data.

import { useState } from "react";
import type { RankedCommander } from "../../lib/recs/recommend";
import { CommanderLightbox } from "./lightbox";

export function FullCardTrigger({
  commander,
}: {
  commander: RankedCommander;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ⛶ Full card affordance chip — §"⛶ Full card" affordance chip */}
      <button
        type="button"
        className="absolute inline-flex items-center rounded-full"
        style={{
          top: 56,
          right: 16,
          gap: 6,
          background: "rgba(10,7,4,0.55)",
          backdropFilter: "blur(4px)",
          border: "1px solid rgba(237,230,216,0.18)",
          padding: "6px 11px",
          cursor: "pointer",
        }}
        aria-label="View full card"
        onClick={() => setOpen(true)}
      >
        <span style={{ color: "#EDE6D8", fontSize: 12 }}>⛶</span>
        <span
          className="font-mono"
          style={{ fontSize: 10, letterSpacing: "0.08em", color: "#EDE6D8" }}
        >
          Full card
        </span>
      </button>

      {open && (
        <CommanderLightbox commander={commander} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
