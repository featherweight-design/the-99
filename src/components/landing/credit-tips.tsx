"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { landingCopy } from "../../lib/copy/landing";
import { prefersReducedMotion } from "../../lib/ui/motion";
import { useMinWidth } from "../ui/use-min-width";
import { Icon } from "./icons";

const c = landingCopy;

type Tool = (typeof landingCopy.tools)[number];

const LEAD_INK: Record<string, string> = { "+": "text-[color:var(--success)]", "−": "text-[color:var(--danger)]" };

/** What you get: a small made-up result of the tool, drawn from stored example words (`landingCopy.tools`). No model is called. */
function Preview({ tool }: { tool: Tool }) {
  return (
    <div className="relative flex flex-col gap-[7px] border-t border-solid border-t-[color:var(--border)] bg-[color:var(--surface-inset)] px-[12px] pb-[12px] pt-[10px]">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{c.tip.youGet}</span>
      <span className="absolute right-[10px] top-[9px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{c.tip.example}</span>
      {tool.example.ask && <span className="text-[11.5px] leading-[1.45] text-[color:var(--fg-muted)]">{tool.example.ask}</span>}
      <div className="flex flex-col text-[11.5px] leading-[1.45] text-[color:var(--fg-body)]">
        {tool.example.rows.map(([lead, name, note]) => (
          <div key={`${lead}${name}${note}`} className="flex items-baseline gap-[8px] border-t border-solid border-t-[color:var(--border)] py-[3px] first:border-t-0">
            {lead && <span className={`min-w-[14px] flex-none font-mono text-[11px] font-semibold ${LEAD_INK[lead] ?? "text-[color:var(--accent-text)]"}`}>{lead}</span>}
            {name && <b className="font-semibold text-[color:var(--fg)]">{name}</b>}
            <span className="text-[color:var(--fg-muted)]">{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Room kept between an opened phone tip and the screen's edge (A4 call 6). */
const EDGE = 16;

/** How far an entrance transform holds `el` below where it will rest (the vertical translate of its computed transform). */
function restingOffset(el: Element): number {
  const t = getComputedStyle(el).transform;
  if (!t || t === "none" || typeof DOMMatrixReadOnly === "undefined") return 0;
  try { return new DOMMatrixReadOnly(t).m42; } catch { return 0; }
}

/**
 * The paid tools, each with an ⓘ (public landing PR 4b). ONE tip is open at a time, held here: opening another closes the first.
 * A mouse hovering or the keyboard focusing the ⓘ shows it; a press (touch, pen or mouse) pins it; Escape closes it. The ⓘ is a
 * 44px target on the phone. The tip stays out of the document while closed.
 *
 * From 768 the tip floats over the rows below as a tooltip, and a press outside closes it. Below 768 (addendum A4) it opens in
 * the list's flow under its row and pushes the later rows down: the ⓘ is a disclosure (`aria-controls` while open, no tooltip
 * role), a press elsewhere leaves it open (it covers nothing), and a press or keyboard focus that opens it keeps the pressed row
 * where it was on screen and then brings the whole tip into view. Hover only shows and hides it, as shipped.
 */
export function CreditTips({ suggestedTwo }: { suggestedTwo: boolean }) {
  const [open, setOpen] = useState<{ id: string; pinned: boolean } | null>(null);
  const root = useRef<HTMLUListElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  // The ⓘ a press or keyboard focus just opened, and its screen top before the render: read by the layout effect below.
  const opening = useRef<{ id: string; button: HTMLElement; top: number } | null>(null);
  const base = useId();
  // The 48rem split, in rem like Tailwind's `md:`/`max-md:` and `globals.css`, so a larger browser text size moves both
  // together (768px at the default 16px root). The server snapshot is false, the phone branch: every tip is closed then.
  const wide = useMinWidth("(min-width: 48rem)");
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    // Below 768 a press elsewhere no longer closes the tip (A4 call 4): it covers nothing, and a scroll that starts outside
    // the list would collapse it mid-swipe and jump the page.
    if (wide) document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open, wide]);
  // Below 768, after a press or keyboard focus opened a tip, before paint: first the pressed row is held in place (a tip that
  // closed above it would otherwise lift it by that tip's height), INSTANTLY, so it never jumps and slides back; then, if the
  // tip runs past the screen's foot, the page scrolls just enough to show it with 16px spare, or puts its top 16px under the
  // screen's top when it is taller than the screen. Smooth, or instant under reduced motion. A tip already in view never moves
  // the page, and closing never scrolls (nothing is recorded for a close).
  useLayoutEffect(() => {
    const was = opening.current;
    opening.current = null;
    if (wide || !was || open?.id !== was.id) return;
    const moved = was.button.getBoundingClientRect().top - was.top;
    if (moved !== 0) window.scrollBy({ top: moved, behavior: "instant" });
    const el = tip.current;
    if (!el) return;
    // Where the card will REST: on this first frame `anim-tip-in` still holds it 4px low, and the rect includes that.
    const card = el.getBoundingClientRect();
    const rise = restingOffset(el);
    const [top, bottom] = [card.top - rise, card.bottom - rise];
    const foot = window.innerHeight - EDGE;
    if (bottom <= foot) return;
    const by = card.height > window.innerHeight - 2 * EDGE ? top - EDGE : bottom - foot;
    window.scrollBy({ top: by, behavior: prefersReducedMotion() ? "instant" : "smooth" });
  }, [open, wide]);
  return (
    <ul ref={root} className="m-0 mt-[14px] flex list-none flex-col p-0">
      {c.tools.map((tool) => {
        const shown = open?.id === tool.id;
        const tipId = `${base}-${tool.id}`;
        const label = "row" in tool ? tool.row : tool.name;
        const cut = label.lastIndexOf(" ") + 1;
        const [head, last] = [label.slice(0, cut), label.slice(cut)];
        const cost = tool.id === "suggested" && suggestedTwo ? c.credits.suggestedV2 : c.credits.one;
        return (
          <li
            key={tool.id}
            className="relative flex items-start justify-between gap-[12px] max-md:flex-wrap border-t border-solid border-t-[color:var(--border)] py-[9px] text-[14px] leading-[1.45] text-[color:var(--fg-body)] first:border-t-0"
          >
            <span className="min-w-0">
              {head}
              <span className="whitespace-nowrap">
                {last}
                <button
                  onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpen((o) => (o?.pinned ? o : { id: tool.id, pinned: false })); }}
                  onPointerLeave={(e) => { if (e.pointerType === "mouse") setOpen((o) => (o?.id === tool.id && !o.pinned ? null : o)); }}
                  type="button"
                  aria-label={c.tip.open(tool.name)}
                  aria-expanded={shown}
                  // From 768 a tooltip that describes the ⓘ; below it a disclosure, pointing at the tip only while it is in the document.
                  aria-describedby={wide && shown ? tipId : undefined}
                  aria-controls={!wide && shown ? tipId : undefined}
                  onClick={(e) => {
                    if (!(open?.id === tool.id && open.pinned)) opening.current = { id: tool.id, button: e.currentTarget, top: e.currentTarget.getBoundingClientRect().top };
                    setOpen((o) => (o?.id === tool.id && o.pinned ? null : { id: tool.id, pinned: true }));
                  }}
                  onFocus={(e) => {
                    const button = e.currentTarget;
                    try {
                      if (button.matches(":focus-visible") && !open?.pinned) {
                        opening.current = { id: tool.id, button, top: button.getBoundingClientRect().top };
                        setOpen((o) => (o?.pinned ? o : { id: tool.id, pinned: false }));
                      }
                    } catch { /* no :focus-visible */ }
                  }}
                  // A pinned tip survives a blur: a press inside the tip blurs the button, and a pin closes by a second press, Escape or a press outside.
                  onBlur={() => setOpen((o) => (o?.id === tool.id && !o.pinned ? null : o))}
                  className={`-my-[10px] ml-[2px] inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center border-0 bg-transparent align-middle focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-[color:var(--accent)] md:-my-[8px] md:h-[28px] md:w-[28px] ${shown ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]"}`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.3" />
                    <path d="M8 7.2v4" strokeLinecap="round" />
                    <circle cx="8" cy="4.9" r=".55" fill="currentColor" stroke="none" />
                  </svg>
                </button>
              </span>
            </span>
            <span className="flex-none whitespace-nowrap font-mono text-[11.5px] text-[color:var(--accent-text)]">{cost}</span>
            {shown && (
              // Below 768 a flex item on its own line (the row wraps): 2px under the row, 3px over the next row's rule, as wide as
              // the row, no shadow, easing in with `anim-tip-in` (phone only, `globals.css`). From 768 the shipped float.
              // Accepted: a window narrowing past 768 with a tip open restarts the entrance once (the media rule re-applies it).
              <span
                ref={tip}
                id={tipId}
                role={wide ? "tooltip" : undefined}
                className={`anim-tip-in flex flex-col ${open?.pinned ? "" : "pointer-events-none"} overflow-hidden rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] text-left max-md:mb-[3px] max-md:mt-[2px] max-md:basis-full md:absolute md:left-[-8px] md:top-[calc(100%-2px)] md:z-30 md:w-[330px] md:shadow-[0_14px_34px_rgba(0,0,0,0.5)]`}
              >
                <span className="flex gap-[10px] px-[14px] pb-[10px] pt-[12px] text-[13px] leading-[1.55] text-[color:var(--fg-body)]">
                  <span aria-hidden="true" className="mt-[1px] flex-none text-[color:var(--accent-text)]"><Icon name={tool.icon} size={18} /></span>
                  <span>
                    <b className="mb-[3px] block text-[13.5px] font-semibold text-[color:var(--fg)]">{tool.name}</b>
                    {tool.tip}
                  </span>
                </span>
                <Preview tool={tool} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
