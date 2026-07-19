"use client";
// Full-card lightbox — §Full-Card Lightbox (mobile only)
// Props: { commander: RankedCommander; onClose: () => void }
// Focus moves into the dialog on open and returns to the trigger on close.
// Closes on backdrop tap AND Escape key.

import { useEffect, useRef } from "react";
import type { RankedCommander } from "../../lib/recs/recommend";
import { identityGradient } from "../../lib/collection/gradients";
import { WUBRG_HEX } from "../../lib/collection/browse";

export function CommanderLightbox({
  commander: c,
  onClose,
}: {
  commander: RankedCommander;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Remember what had focus before the lightbox opened so we can return it on close.
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      triggerRef.current?.focus();
    };
  }, []);

  // Focus first focusable child on mount.
  useEffect(() => {
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusables?.[0]?.focus();
  }, []);

  // Escape closes; Tab wraps within dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const gradient = identityGradient(c.colorIdentity);

  return (
    // §Lightbox overlay
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        background: "rgba(8,6,4,0.86)",
        backdropFilter: "blur(6px)",
        padding: "34px 30px",
      }}
      role="presentation"
      onClick={onClose}
    >
      {/* §Blurred art layer (behind overlay) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: gradient,
          opacity: 0.28,
          filter: "blur(3px)",
        }}
      />

      {/* Dialog — stops propagation so inner clicks don't close */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Full card — ${c.name}`}
        className="relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* §"Full card" label (top center) */}
        <p
          className="absolute font-mono uppercase"
          style={{
            top: -52,
            textAlign: "center",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: "#8E8269",
            margin: 0,
          }}
        >
          Full card
        </p>

        {/* §Close "✕" button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close full card view"
          className="absolute flex items-center justify-center rounded-full"
          style={{
            top: -52,
            right: -30,
            width: 34,
            height: 34,
            background: "rgba(237,230,216,0.1)",
            border: "1px solid rgba(237,230,216,0.18)",
            color: "#EDE6D8",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        {/* §Card frame (lightbox) — 262px wide, 63/88 aspect */}
        <div
          className="flex flex-col rounded-[16px]"
          style={{
            width: 262,
            aspectRatio: "63/88",
            background: gradient,
            boxShadow:
              "inset 0 -80px 80px -46px rgba(10,7,4,0.85), inset 0 0 0 1px rgba(0,0,0,0.3), 0 24px 60px rgba(0,0,0,0.6)",
            padding: 16,
          }}
        >
          {/* Card name + mana cost row */}
          <div className="flex items-start justify-between gap-[6px]">
            <h2
              className="font-display font-[700] m-0"
              style={{
                fontSize: 14,
                color: "#F4EEE0",
                textShadow: "0 1px 6px rgba(0,0,0,0.6)",
                lineHeight: 1.1,
              }}
            >
              {c.name}
            </h2>
            {/* Mana cost pips */}
            {c.manaCost && (
              <div className="flex gap-[3px] flex-none">
                {[...c.manaCost.matchAll(/\{([^}]+)\}/g)].map((m, i) => {
                  const sym = m[1];
                  const isWUBRG = /^[WUBRG]$/.test(sym);
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center justify-center rounded-full font-mono font-[600]"
                      style={{
                        width: 16,
                        height: 16,
                        fontSize: 9,
                        background: isWUBRG
                          ? WUBRG_HEX[sym] ?? "#3A322A"
                          : "#3A322A",
                        color: isWUBRG ? "#0c1608" : "#C6B79A",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      }}
                    >
                      {sym}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Spacer pushes oracle glass to bottom */}
          <div style={{ flex: 1 }} />

          {/* §Oracle text glass panel */}
          <div
            className="rounded-[9px]"
            style={{
              background: "rgba(10,7,4,0.5)",
              backdropFilter: "blur(3px)",
              padding: "11px 13px",
            }}
          >
            {/* §Type line (oracle panel) */}
            <p
              className="m-0 font-[500]"
              style={{
                fontSize: 12,
                color: "#EDE6D8",
                textShadow: "0 1px 4px rgba(0,0,0,0.6)",
              }}
            >
              {c.typeLine}
            </p>
            {/* §Oracle text lines */}
            {c.oracleText && (
              <p
                className="m-0"
                style={{
                  fontSize: 11,
                  color: "#E4DCCB",
                  lineHeight: 1.45,
                  marginTop: 6,
                  textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                  whiteSpace: "pre-line",
                }}
              >
                {c.oracleText}
              </p>
            )}
            {/* Identity color pips row */}
            {c.colorIdentity.length > 0 && (
              <div className="flex gap-[4px] mt-[8px]">
                {c.colorIdentity.map((color) => (
                  <span
                    key={color}
                    className="block rounded-full shrink-0"
                    style={{
                      width: 10,
                      height: 10,
                      background: WUBRG_HEX[color] ?? "#8E8269",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* §"Tap anywhere to close" hint */}
        <p
          className="font-mono"
          style={{
            fontSize: 10.5,
            color: "#8E8269",
            marginTop: 18,
            letterSpacing: "0.04em",
            margin: "18px 0 0",
          }}
        >
          Tap anywhere to close
        </p>
      </div>
    </div>
  );
}
