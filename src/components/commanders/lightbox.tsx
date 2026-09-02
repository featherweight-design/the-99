"use client";
// Full-card lightbox — §Full-Card Lightbox (mobile only)
// Props: { commander: RankedCommander; onClose: () => void }
// Focus moves into the dialog on open and returns to the trigger on close.
// Closes on backdrop tap AND Escape key.

import { useRef } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import type { RankedCommander } from "../../lib/recs/recommend";
import { commanderGradient } from "../../lib/collection/gradients";
import { cssUrl, WUBRG_COLOR } from "../../lib/collection/browse";

/** Only the fields the lightbox renders — keeps the client payload slim. */
export type LightboxCommander = Pick<
  RankedCommander,
  "name" | "manaCost" | "typeLine" | "oracleText" | "colorIdentity" | "imageUri"
>;

export function CommanderLightbox({
  commander: c,
  onClose,
}: {
  commander: LightboxCommander;
  onClose: () => void;
}) {
  // The trap root is the overlay, not the inner role="dialog": the close ✕ sits
  // outside the dialog element and has to stay reachable by Tab.
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus trap, Escape, focus-return, and the shared scroll lock. The lightbox
  // covers the viewport, so nothing behind it is visible to scroll — but on
  // touch a drag still rubber-bands the page underneath, which is the whole
  // reason the lock is the default.
  useDialogA11y(overlayRef, onClose);

  const gradient = commanderGradient(c.colorIdentity);

  return (
    // §Lightbox overlay
    <div
      ref={overlayRef}
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: "color-mix(in oklab, var(--bg) 86%, transparent)",
        backdropFilter: "blur(6px)",
        padding: "34px 30px",
        zIndex: 50,
      }}
      role="presentation"
      onClick={onClose}
    >
      {/* §Blurred art layer (behind overlay) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: c.imageUri ? `${cssUrl(c.imageUri)} center/cover` : gradient,
          opacity: 0.28,
          filter: "blur(3px)",
        }}
      />

      {/* §"Full card" label (top center of overlay) */}
      <p
        className="absolute font-mono uppercase"
        style={{
          top: 24,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 10,
          letterSpacing: "0.16em",
          color: "var(--fg-faint)",
          margin: 0,
        }}
      >
        Full card
      </p>

      {/* §Close "✕" button (top-right of overlay) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close full card view"
        // brand focus-visible outline treatment inherited from globals.css
        className="absolute flex items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--fg)_10%,transparent)] border border-[color-mix(in_oklab,var(--fg)_18%,transparent)] text-[color:var(--fg)]"
        style={{
          top: 20,
          right: 18,
          width: 34,
          height: 34,
          fontSize: 16,
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        ✕
      </button>

      {/* Dialog — stops propagation so inner clicks don't close */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Full card — ${c.name}`}
        className="relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >

        {/* The surface is called "Full card", so when there is a card to show it
            shows that card. The frame below is a drawing of one — name, pips and
            oracle text over an identity gradient — and it is the fallback for a
            commander the catalog has no image for, not the primary rendering. */}
        {c.imageUri ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.imageUri}
              alt={c.name}
              className="rounded-[16px]"
              style={{
                width: 262,
                aspectRatio: "63/88",
                objectFit: "cover",
                boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
              }}
            />
            {/* The image carries the type line and rules text as pixels; this is
                the same text for anyone not reading pixels. */}
            <p className="sr-only">
              {c.typeLine}
              {c.oracleText ? `. ${c.oracleText}` : ""}
            </p>
          </>
        ) : (
        /* §Card frame (lightbox) — 262px wide, 63/88 aspect */
        <div
          className="flex flex-col rounded-[16px]"
          style={{
            width: 262,
            aspectRatio: "63/88",
            background: gradient,
            boxShadow:
              "inset 0 -80px 80px -46px color-mix(in oklab, var(--bg) 85%, transparent), inset 0 0 0 1px rgba(0,0,0,0.3), 0 24px 60px rgba(0,0,0,0.6)",
            padding: 16,
          }}
        >
          {/* Card name + mana cost row */}
          <div className="flex items-start justify-between gap-[6px]">
            <h2
              className="font-display font-[700] m-0"
              style={{
                fontSize: 14,
                color: "var(--fg)",
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
                  // The design table names one near-black ink per pip, drawn
                  // against pip discs that were lighter than the ones the token
                  // contract ships. The contract has no pip-text key, and the
                  // one pattern it does state for a label on a coloured field
                  // is "--bg" (the accent button's label). So four pips take
                  // --bg, and black — whose disc is near-black in every theme —
                  // takes the light ink instead.
                  const PIP_TEXT: Record<string, string> = {
                    W: "var(--bg)",
                    U: "var(--bg)",
                    B: "var(--fg-body)",
                    R: "var(--bg)",
                    G: "var(--bg)",
                  };
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center justify-center rounded-full font-mono font-[600]"
                      style={{
                        width: 16,
                        height: 16,
                        fontSize: 9,
                        background: isWUBRG
                          ? WUBRG_COLOR[sym] ?? "var(--border-strong)"
                          : "var(--border-strong)",
                        color: isWUBRG ? PIP_TEXT[sym] ?? "var(--fg-body)" : "var(--fg-body)",
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
              background: "color-mix(in oklab, var(--bg) 50%, transparent)",
              backdropFilter: "blur(3px)",
              padding: "11px 13px",
            }}
          >
            {/* §Type line (oracle panel) */}
            <p
              className="m-0 font-[500]"
              style={{
                fontSize: 12,
                color: "var(--fg)",
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
                  color: "var(--fg)",
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
                      background: WUBRG_COLOR[color] ?? "var(--fg-faint)",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* §"Tap anywhere to close" hint */}
        <p
          className="font-mono"
          style={{
            fontSize: 10.5,
            color: "var(--fg-faint)",
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
