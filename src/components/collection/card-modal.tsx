"use client";
// Card detail modal per property table §Card Detail Modal.
// - Mobile: full-screen sheet, art up top with color-identity gradient fallback
// - Desktop: 820px centered overlay, two-column (320px art + content), Prev/Next
// - Focus trap (READINESS #5): queries focusable children, wraps Tab/Shift+Tab
// - Escape closes; focus returns to the previously-focused element on close

import { useEffect, useRef } from "react";
import type { BrowseCard } from "../../lib/collection/browse";
import { cssUrl } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import { ManaCost } from "./mana-pips";

const RARITY_LABEL: Record<BrowseCard["rarity"], string> = {
  common: "Common", uncommon: "Uncommon", rare: "Rare", mythic: "Mythic",
};

const IDENTITY_NAME: Record<string, string> = {
  "": "Colorless",
  W: "White", U: "Blue", B: "Black", R: "Red", G: "Green",
};

function identityName(id: string[]): string {
  if (id.length === 0) return "Colorless";
  if (id.length === 1) return IDENTITY_NAME[id[0]];
  return id.join("/");
}

export function CardModal({
  card,
  position,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  card: BrowseCard;
  position: number;
  total: number;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Remember what had focus before the modal opened so we can return it on close.
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      triggerRef.current?.focus();
    };
  }, []);

  // Focus first focusable child on mount.
  useEffect(() => {
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    focusables?.[0]?.focus();
  }, []);

  // Escape closes; Tab wraps.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
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

  const artStyle: React.CSSProperties = card.imageUri
    ? { backgroundImage: cssUrl(card.imageUri), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient(card.colorIdentity) };

  return (
    // Fixed backdrop wrapper — §Backdrop: rgba(8,6,4,0.72) desktop; blurred collection behind is decorative and out-of-scope
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
      onClick={onClose}
      style={{ background: "rgba(8,6,4,0.72)" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        onClick={(e) => e.stopPropagation()}
        // Mobile: full-screen sheet (§Mobile: Full-Screen Sheet Container: bg #181410)
        // Desktop: 820px centered, bg #1A160F (--surface-rail), border 1px #3A3229 (--border-strong), radius 16px, shadow 0 40px 100px rgba(0,0,0,0.7)
        className="flex flex-col overflow-hidden w-full h-full md:h-auto md:w-[820px] md:flex-row md:rounded-2xl"
        style={{
          background: "var(--surface-sunken)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        }}
      >
        {/* MOBILE art header — §Mobile: Art Header */}
        <div
          className="relative md:hidden"
          style={{
            padding: "44px 20px 20px",
            ...artStyle,
            boxShadow: "inset 0 -60px 60px -40px rgba(0,0,0,0.55)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close card details"
            // §Mobile: Art Close Button
            className="absolute rounded-full flex items-center justify-center"
            style={{
              top: 22, right: 18, width: 32, height: 32,
              background: "rgba(10,8,6,0.55)", color: "var(--fg)", fontSize: 16,
            }}
          >
            ✕
          </button>
          {/* §Mobile: Art Image — 180px, aspect 63/88, radius 10px */}
          <div
            className="mx-auto rounded-[10px]"
            style={{
              width: 180, aspectRatio: "63/88", marginTop: 6,
              ...artStyle,
              boxShadow: "0 20px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          />
        </div>

        {/* DESKTOP art column — §Desktop: Art Column: 320px, padding 28px, bg #14110E (--bg) */}
        <div
          className="hidden md:flex items-center justify-center flex-none"
          style={{ width: 320, padding: 28, background: "var(--bg)" }}
        >
          <div
            className="w-full rounded-[12px]"
            style={{
              aspectRatio: "63/88",
              ...artStyle,
              boxShadow: "0 24px 50px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          />
        </div>

        {/* Content column — mobile: flex-1 padding 20px; desktop: padding 30px 32px */}
        <div className="flex-1 relative overflow-auto p-[20px] md:p-[30px_32px]">
          {/* Desktop close button — §Desktop: Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close card details"
            className="hidden md:flex absolute items-center justify-center rounded-full"
            style={{
              top: 22, right: 24, width: 34, height: 34,
              background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
              color: "var(--fg-muted)", fontSize: 15,
            }}
          >
            ✕
          </button>

          {/* Name + type + mana pips — §Mobile: Name + Type Header */}
          <div className="flex items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <h3
                id="card-modal-title"
                className="font-display font-bold text-[22px] md:text-[29px] m-0"
                style={{ color: "var(--fg)", lineHeight: 1.1 }}
              >
                {card.name}
              </h3>
              {/* Type line — §Card Type Line: 13/14px, #A89B84 (--fg-muted), margin-top 4/6px */}
              <p
                className="text-[13px] md:text-[14px] mt-[4px] md:mt-[6px]"
                style={{ color: "var(--fg-muted)" }}
              >
                {card.typeLine}
              </p>
            </div>
            <ManaCost cost={card.manaCost} />
          </div>

          {/* Oracle text block — §Oracle Text Block: bg #14110E (--bg), border 1px #2A241D (--border), radius 10px, padding 14px 16px / 18px 20px, margin-top 16/22px, 13.5/15px, #C6B79A (--fg-body), line-height 1.6/1.65 */}
          {card.oracleText && (
            <div
              className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px] text-[13.5px] md:text-[15px] whitespace-pre-line"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--fg-body)",
                lineHeight: 1.65,
              }}
            >
              {card.oracleText}
            </div>
          )}

          {/* MOBILE meta 2×2 grid — §Mobile: Meta 2×2 Grid */}
          <div
            className="md:hidden mt-[16px] grid grid-cols-2 rounded-[10px] overflow-hidden"
            style={{ background: "var(--border)", gap: 1, border: "1px solid var(--border)" }}
          >
            <MetaCell label="Set" value={card.primarySetCode} />
            <MetaCell label="Rarity" value={RARITY_LABEL[card.rarity]} rarity />
            <MetaCell label="Identity" value={identityName(card.colorIdentity)} identity={card.colorIdentity} />
            <MetaCell label="You own" value={`×${card.quantity}`} quantity />
          </div>

          {/* DESKTOP meta flex row — §Desktop: Meta Fields */}
          <div className="hidden md:flex flex-wrap gap-[26px] mt-[24px]">
            <MetaField label="Set" value={`${card.primarySetCode}`} />
            <MetaField label="Rarity" value={RARITY_LABEL[card.rarity]} rarity />
            <MetaField label="Identity" value={identityName(card.colorIdentity)} identity={card.colorIdentity} />
            <MetaField label="You own" value={`×${card.quantity} copy`} quantity />
          </div>

          {/* DESKTOP Prev/Next — §Desktop: Prev/Next Navigation */}
          <div
            className="hidden md:flex items-center gap-[10px] mt-[28px] pt-[20px]"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              type="button"
              onClick={onPrev ?? undefined}
              disabled={!onPrev}
              aria-label="Previous card"
              className="cursor-pointer text-[15px] disabled:opacity-40"
              style={{ color: "var(--fg-faint)" }}
            >
              ‹ Prev
            </button>
            <span className="ml-auto font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
              {position.toLocaleString()} of {total.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onNext ?? undefined}
              disabled={!onNext}
              aria-label="Next card"
              className="ml-auto cursor-pointer text-[15px] disabled:opacity-40"
              style={{ color: "var(--brass)" }}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaCell({
  label, value, identity, quantity, rarity,
}: { label: string; value: string; identity?: string[]; quantity?: boolean; rarity?: boolean }) {
  return (
    // §Mobile: Meta Cell: bg #1E1A15 (--surface), padding 11px 14px
    <div className="p-[11px_14px]" style={{ background: "var(--surface)" }}>
      <div
        className="font-mono uppercase text-[9.5px] tracking-[0.12em]"
        style={{ color: "var(--fg-faint)" }}
      >
        {label}
      </div>
      <div className="flex items-center gap-[6px] mt-[3px]">
        {identity && identity.length > 0 && (
          <span
            aria-hidden
            className="rounded-full"
            style={{
              width: 12, height: 12,
              background: identity.length === 1
                ? { W: "#E8E4D6", U: "#4A7FB5", B: "#5B5566", R: "#C05A48", G: "#6B9E63" }[identity[0]] ?? "#8E8269"
                : "#8E8269",
            }}
          />
        )}
        <span
          className={quantity || rarity ? "font-mono" : ""}
          style={{
            color: quantity || rarity ? "var(--brass)" : "var(--fg)",
            fontSize: 13,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function MetaField({
  label, value, identity, quantity, rarity,
}: { label: string; value: string; identity?: string[]; quantity?: boolean; rarity?: boolean }) {
  return (
    <div>
      {/* §Meta Label desktop: mono 10px, letter-spacing 0.14em, uppercase, #8E8269 (--fg-faint) */}
      <div
        className="font-mono uppercase text-[10px] tracking-[0.14em]"
        style={{ color: "var(--fg-faint)" }}
      >
        {label}
      </div>
      <div className="flex items-center gap-[6px] mt-[5px]">
        {identity && identity.length > 0 && (
          <span
            aria-hidden
            className="rounded-full"
            style={{
              width: 13, height: 13,
              background: identity.length === 1
                ? { W: "#E8E4D6", U: "#4A7FB5", B: "#5B5566", R: "#C05A48", G: "#6B9E63" }[identity[0]] ?? "#8E8269"
                : "#8E8269",
            }}
          />
        )}
        <span
          className={quantity || rarity ? "font-mono text-[14px]" : "text-[14px]"}
          style={{ color: quantity || rarity ? "var(--brass)" : "var(--fg)" }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
