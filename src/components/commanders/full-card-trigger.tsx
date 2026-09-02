"use client";
// Client wrapper: ⛶ Full card trigger button + lightbox state.
// detail.tsx (server component) renders this, passing the commander data.

import { useState } from "react";
import { CommanderLightbox, type LightboxCommander } from "./lightbox";

export function FullCardTrigger({
  commander,
}: {
  commander: LightboxCommander;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Full-band tap target — per state table, tapping the art header opens
          the lightbox. Presentational (not a button, never focusable); the
          labeled ⛶ chip below is the accessible control. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 cursor-pointer"
        onClick={() => setOpen(true)}
      />

      {/* ⛶ Full card affordance chip — §"⛶ Full card" affordance chip */}
      <button
        type="button"
        // brand focus-visible outline treatment inherited from globals.css
        className="absolute inline-flex items-center rounded-full bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] border border-[color-mix(in_oklab,var(--fg)_18%,transparent)]"
        style={{
          top: 56,
          right: 16,
          gap: 6,
          backdropFilter: "blur(4px)",
          padding: "6px 11px",
          cursor: "pointer",
        }}
        aria-label="View full card"
        onClick={() => setOpen(true)}
      >
        <span style={{ color: "var(--fg)", fontSize: 12 }}>⛶</span>
        <span
          className="font-mono"
          style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--fg)" }}
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
