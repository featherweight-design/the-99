"use client";

// The ✕ on a What's new item (Home's rows and lead story) and a Waiting on you row (Hugh's ruling 2026-10-27, the
// menu-home plan's product call 6): Your requests' bare ✕ (spare requests, Asker-States `.fi .xx`), 36px at the row's
// top right, with a coarse pointer's 44px hit kept inside the row. The press hides the item at once and for good
// (`dismissFeedItemAction`, `feed_dismissals`); a failed write puts it back with the toast. It answers nothing.
import { useRef, useState, type ReactNode } from "react";
import { dismissFeedItemAction } from "../../app/feed-dismiss-actions";
import { feedCopy } from "../../lib/copy/feed";
import { SocialToast, type SocialToastState } from "../social/social-toast";

const d = feedCopy.home.dismiss;

/**
 * A coarse pointer's 44px hit, centred on the 36px box: TOUCH_HIT's pseudo-element without its leading `relative`
 * (the box is absolute). At the row's top right (top 6, right 4) it reaches 2px from the top and 0px past the right,
 * so it stays inside the row.
 */
const HIT =
  "pointer-coarse:after:absolute pointer-coarse:after:left-1/2 pointer-coarse:after:top-1/2 pointer-coarse:after:h-[44px] pointer-coarse:after:w-[44px] pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2 pointer-coarse:after:content-['']";

export function DismissButton({ title, onPress, disabled = false }: { title: string; onPress: (from: HTMLElement) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      data-feed-dismiss
      aria-label={d.aria(title)}
      disabled={disabled}
      onClick={(e) => onPress(e.currentTarget)}
      className={`absolute top-[6px] right-[4px] z-[1] flex h-[36px] w-[36px] cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[13px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] disabled:cursor-default ${HIT}`}
    >
      <span aria-hidden>✕</span>
    </button>
  );
}

/**
 * The keys this visit hid, and the press. Focus lands on the next row's ✕ (else the one before, else `fallback`), since
 * the pressed one leaves with its row. The action revalidates Home and /friends, so the page it was pressed on is
 * redrawn with the shell's counts; on a refusal or a throw the row comes back and the toast says so.
 */
export function useFeedDismiss(fallback?: () => HTMLElement | null): {
  hidden: ReadonlySet<string>;
  dismiss: (key: string, from: HTMLElement) => void;
  toast: ReactNode;
} {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const seq = useRef(0);
  const put = (key: string, on: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  function dismiss(key: string, from: HTMLElement) {
    const row = from.closest("li, section");
    const sibling = (el: Element | null | undefined) => el?.querySelector<HTMLElement>("[data-feed-dismiss]") ?? null;
    const next = sibling(row?.nextElementSibling) ?? sibling(row?.previousElementSibling);
    put(key, true);
    requestAnimationFrame(() => (next ?? fallback?.())?.focus());
    void dismissFeedItemAction(key)
      .then((r) => {
        if (!r.ok) throw new Error(r.reason);
      })
      .catch(() => {
        put(key, false);
        setToast({ id: ++seq.current, text: d.failed });
      });
  }
  return { hidden, dismiss, toast: <SocialToast toast={toast} onDone={() => setToast(null)} /> };
}
