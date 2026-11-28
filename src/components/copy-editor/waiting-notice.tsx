"use client";
// The notice Done leaves behind when edits are still waiting in this browser: where the bar was, one press from Review
// or Open pull request, and never in the way. It takes no focus and does not block or dim the page.
import { useEffect, useState } from "react";
import { copyEditorCopy } from "../../lib/copy/copy-editor";
import { outlineButton, primaryButton } from "./buttons";
import { headerBottom } from "./chrome";
import { OVERLAY_ATTR } from "./scan";

const t = copyEditorCopy.waiting;

type Props = { count: number; onReview: () => void; onSend: () => void; onClose: () => void };

export function WaitingNotice({ count, onReview, onSend, onClose }: Props) {
  // Phone: 8px under the header as it is on screen now (it scrolls away and slides back), so the notice follows it.
  const [top, setTop] = useState(() => headerBottom() + 8);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setTop(headerBottom() + 8);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Esc closes the notice first; an editor or tray that handled it already has marked the event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      {...{ [OVERLAY_ATTR]: "" }}
      role="status"
      data-copy-waiting=""
      style={{ "--notice-top": `${top}px` } as React.CSSProperties}
      className="fixed inset-x-3 top-[var(--notice-top)] z-[61] rounded-[14px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-4 shadow-[var(--modal-shadow)] md:inset-x-auto md:bottom-[84px] md:right-6 md:top-auto md:w-[360px]"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-[6px] inline-block h-2 w-2 flex-none rounded-full bg-[color:var(--accent)]" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-[color:var(--fg)]">{t.title(count)}</div>
          <p className="mt-1 text-[13px] text-[color:var(--fg-muted)]">{t.body(count)}</p>
        </div>
        <button type="button" aria-label={t.close} onClick={onClose} className="-mr-1 -mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full text-[color:var(--fg-muted)]">
          ✕
        </button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onReview} className={outlineButton}>
          {t.review}
        </button>
        <button type="button" onClick={onSend} className={primaryButton}>
          {t.send}
        </button>
      </div>
    </div>
  );
}
