"use client";
// The month jump (`/announcements`, board `Archive` F2 and F3): years newest first, each a 4-wide grid of its months with
// their counts. Under a kind the counts are that kind's, and a month with none is dashed and inert, so the jump never lands
// on an empty month. The current month takes the accent border and a 10% accent fill. The two newest years and the current
// month's year are open; older years fold to one line until pressed. A year lists its months only through the current
// month. A bottom sheet at 390 (`ModalChrome`) and a 340px popover anchored to the jump button from `md` (`popover`).
import { useEffect, useState, type RefObject } from "react";

import { MONTH_SHORT, yearsUnder, type ArchiveKind, type MonthCounts, type Ym } from "../../lib/announcements/archive-model";
import { feedCopy } from "../../lib/copy/feed";
import { ModalChrome } from "../decks/receipt-modal";
import type { AnchoredAt } from "../ui/anchored-panel";

const c = feedCopy.archive;

export function JumpSheet({ counts, kind, current, now, onPick, onClose, popover = false, at = null, panelRef, triggerRef }: {
  counts: MonthCounts;
  kind: ArchiveKind;
  current: Ym | null;
  /** The present instant, for the current month: a year lists no month after it. */
  now: string;
  onPick: (ym: Ym) => void;
  onClose: () => void;
  /** A popover anchored to the jump button (from `md`), placed by `useAnchoredPanel`: its `at` and refs follow. */
  popover?: boolean;
  at?: AnchoredAt | null;
  panelRef?: RefObject<HTMLDivElement | null>;
  triggerRef?: RefObject<HTMLButtonElement | null>;
}) {
  const years = yearsUnder(counts, kind, now.slice(0, 7));
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([...years.slice(0, 2).map((y) => y.year), ...(current ? [Number(current.slice(0, 4))] : [])]));
  const tight = popover;

  // The popover closes on a press outside it (the trigger excepted, which opens it) and on Escape, as the app's other
  // anchored panels do.
  useEffect(() => {
    if (!popover || !panelRef) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && (panelRef.current?.contains(t) || triggerRef?.current?.contains(t))) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      triggerRef?.current?.focus();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [popover, panelRef, triggerRef, onClose]);

  const body = (
    <div data-archive-jump className={`flex flex-col ${tight ? "" : "pb-[16px]"}`}>
      {years.map((y) =>
        open.has(y.year) ? (
          <section key={y.year} aria-label={`${y.year}`}>
            <h3 className={`m-0 flex items-baseline gap-[8px] font-sans text-[13px] font-semibold text-[color:var(--fg)] ${tight ? "px-[14px] pt-[10px] pb-[2px]" : "px-[18px] pt-[12px] pb-[2px]"}`}>
              {y.year}
              <em className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)] not-italic">{c.monthCount(y.n)}</em>
            </h3>
            <div className={`grid grid-cols-4 gap-[6px] py-[6px] ${tight ? "px-[10px]" : "px-[14px]"}`}>
              {y.months.map((m) => {
                const none = m.n === 0;
                const here = m.ym === current;
                const frame = none
                  ? `cursor-default text-[color:var(--fg-disabled)] ${here ? "[border:1px_dashed_var(--accent)]" : "[border:1px_dashed_var(--border)]"}`
                  : here
                    ? "cursor-pointer text-[color:var(--fg)] [border:1px_solid_var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)]"
                    : "cursor-pointer text-[color:var(--fg)] [border:1px_solid_var(--border)]";
                return (
                  <button
                    key={m.ym}
                    type="button"
                    disabled={none}
                    aria-current={here ? "date" : undefined}
                    onClick={() => onPick(m.ym)}
                    className={`flex ${tight ? "h-[38px]" : "h-[44px]"} flex-col items-center justify-center rounded-[9px] bg-transparent font-sans text-[13px] ${frame}`}
                  >
                    {MONTH_SHORT[m.month - 1]}
                    <small className={`font-mono text-[9.5px] ${none ? "text-[color:var(--fg-disabled)]" : "text-[color:var(--fg-faint)]"}`}>{m.n}</small>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <button
            key={y.year}
            type="button"
            aria-expanded={false}
            onClick={() => setOpen((s) => new Set(s).add(y.year))}
            className={`flex min-h-[44px] cursor-pointer items-baseline gap-[8px] border-0 bg-transparent pb-[2px] text-left font-sans text-[13px] font-semibold text-[color:var(--fg)] ${tight ? "px-[14px] pt-[10px]" : "px-[18px] pt-[12px]"}`}
          >
            {y.year}
            <em className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)] not-italic">{c.monthCount(y.n)}</em>
            <span aria-hidden className="ml-auto text-[11px] text-[color:var(--fg-faint)]">▸</span>
          </button>
        ),
      )}
    </div>
  );

  if (popover) {
    return (
      <div
        ref={panelRef}
        role="dialog"
        aria-label={c.jump.title}
        style={at ? { top: at.top, left: at.left, maxHeight: at.maxHeight } : { top: 0, left: 0, visibility: "hidden" }}
        className="fixed z-50 w-[340px] overflow-y-auto rounded-[12px] [border:1px_solid_var(--border-strong)] bg-[color:var(--surface)] pt-[6px] pb-[12px] shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
      >
        {body}
      </div>
    );
  }
  return (
    <ModalChrome title={c.jump.title} closeLabel={c.jump.close} onClose={onClose} width={480} fit>
      {body}
    </ModalChrome>
  );
}
