"use client";

import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

/** The ⓘ and its tooltip: a press pins it open on any device, a mouse hovering or the keyboard focusing it shows
 *  it, Esc closes. The box positions against the card header, so on a phone it spans the card instead of
 *  running past the viewport. It stays in the document, hidden, so the card can name it as its description.
 *
 *  Shared by Deck stats and the Analysis tab's benchmarks (audit build rule 5). The ring is 18px; at
 *  phone width its `::after` band makes the hit area 44px. The tooltip positions against the nearest
 *  positioned ancestor, which each caller supplies. */
export function InfoTip({
  id, lines, label, className = "self-center", buttonClassName = "",
}: {
  id: string; lines: readonly string[]; label: string;
  /** The root's own classes. A caller that has to place the ⓘ itself passes `contents` here and puts the
   *  position on `buttonClassName`, so the tooltip still anchors to the caller's field and not to a box the
   *  size of the ⓘ (Deck notes: it was squeezed against the screen edge on a phone). */
  className?: string;
  buttonClassName?: string;
}) {
  // Three reasons to be open, kept apart: one flag would let the press that follows a hover close it again.
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = hover || pinned || focused;
  const box = useRef<HTMLSpanElement>(null);
  // A press anywhere else closes a pinned tip. The button's own blur is not enough: Safari does not focus a
  // button on a mouse press, so a pin made there would never blur.
  useEffect(() => {
    if (!pinned) return;
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setPinned(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [pinned]);
  return (
    <span
      ref={box}
      className={className}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setHover(false); }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={id}
        onClick={() => setPinned((v) => !v)}
        onFocus={(e) => {
          // Keyboard focus only: a tap focuses a button too, and would then hold it open against the next tap.
          try { if (e.currentTarget.matches(":focus-visible")) setFocused(true); } catch { /* no :focus-visible */ }
        }}
        onKeyDown={(e) => { if (e.key === "Escape") { setPinned(false); setHover(false); setFocused(false); } }}
        onBlur={() => { setPinned(false); setFocused(false); }}
        className={twMerge(
          "relative flex size-[18px] items-center justify-center rounded-full border border-[color:var(--fg-faint)] font-mono text-[10.5px] after:absolute after:-inset-[13px] after:content-[''] md:after:-inset-[5px]",
          open ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]",
          buttonClassName,
        )}
      >
        i
      </button>
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className="absolute inset-x-0 top-[calc(100%+6px)] z-10 flex flex-col gap-[8px] rounded-[8px] border border-[color:var(--border-strong)] bg-[color:var(--elevated)] px-[14px] py-[12px] text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] shadow-[0_8px_24px_rgba(0,0,0,0.45)] md:right-auto md:w-[340px] [&[hidden]]:hidden"
      >
        {lines.map((l) => <span key={l}>{l}</span>)}
      </span>
    </span>
  );
}
