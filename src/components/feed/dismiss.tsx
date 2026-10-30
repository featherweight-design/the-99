"use client";

// The ✕ on a What's new item (Home's rows and lead story) and a Waiting on you row (Hugh's ruling 2026-10-27, the
// menu-home plan's product call 6). It ENDS the row's action line (small items board `Dismiss-X`, `.x4`), after the
// press: 44px square on a phone, 32px from desktop with a coarse pointer's 44px hit. The press hides the item at once
// and for good (`dismissFeedItemAction`, `feed_dismissals`); a failed write puts it back with the toast. It answers
// nothing.
import { useRef, useState, type ReactNode } from "react";
import { dismissFeedItemAction } from "../../app/feed-dismiss-actions";
import { feedCopy } from "../../lib/copy/feed";
import { SocialToast, type SocialToastState } from "../social/social-toast";

const d = feedCopy.home.dismiss;

/** A coarse pointer's 44px hit, centred on the box (TOUCH_HIT's pseudo-element): only the 32px desktop box needs it. */
const HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:left-1/2 pointer-coarse:after:top-1/2 pointer-coarse:after:h-[44px] pointer-coarse:after:w-[44px] pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2 pointer-coarse:after:content-['']";

export function DismissButton({ title, onPress, disabled = false, className = "" }: {
  title: string; onPress: (from: HTMLElement) => void; disabled?: boolean;
  /** The lead's phone nudge (`.d4n.ph .ld .la .x4`, margin-top −2px). */
  className?: string;
}) {
  // The ring is a box-shadow over a TRANSPARENT outline, never `outline-none`: forced-colors mode drops shadows and
  // repaints the outline in a system color, so a keyboard reader in High Contrast still finds the focused ✕.
  return (
    <button
      type="button"
      data-feed-dismiss
      aria-label={d.aria(title)}
      disabled={disabled}
      onClick={(e) => onPress(e.currentTarget)}
      className={`z-[1] ml-auto mr-[-10px] flex h-[44px] w-[44px] flex-none cursor-pointer md:mr-[-6px] md:h-[32px] md:w-[32px] items-center justify-center rounded-[8px] border-0 bg-transparent p-0 text-[13px] focus-visible:outline-transparent focus-visible:shadow-[0_0_0_2px_var(--accent)] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] disabled:cursor-default ${HIT} ${className}`}
    >
      <span aria-hidden>✕</span>
    </button>
  );
}

/**
 * Where focus goes when `from` leaves with its row: the next enabled ✕ in its scope (`data-dismiss-scope`, the section
 * that holds every row it could move to, across Today and Earlier), else the one before; null when there is none. A ✕
 * disabled while an answer is out cannot take focus, so it is passed over.
 */
export function nextDismiss(from: HTMLElement): HTMLElement | null {
  const scope = from.closest("[data-dismiss-scope]");
  if (!scope) return null;
  const all = [...scope.querySelectorAll<HTMLButtonElement>("[data-feed-dismiss]")];
  const at = all.indexOf(from as HTMLButtonElement);
  const enabled = (b: HTMLButtonElement) => b !== from && !b.disabled;
  return all.slice(at + 1).find(enabled) ?? all.slice(0, Math.max(at, 0)).reverse().find(enabled) ?? null;
}

/**
 * The keys this visit hid, and the press. Focus lands on the next enabled ✕ in the scope (`nextDismiss`, else `fallback`); `onChange` reports each hide and
 * its undo, for a count kept elsewhere (the lead's, in What's new's head), since
 * the pressed one leaves with its row. The action revalidates Home and /friends, so the page it was pressed on is
 * redrawn with the shell's counts; on a refusal or a throw the row comes back and the toast says so.
 */
export function useFeedDismiss(fallback?: () => HTMLElement | null, onChange?: (key: string, on: boolean) => void): {
  hidden: ReadonlySet<string>;
  /** `move: false` hides the row without moving focus: a press made elsewhere, after the reader moved on (the answer sheet's late Clear). */
  dismiss: (key: string, from: HTMLElement, move?: boolean) => void;
  toast: ReactNode;
} {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const seq = useRef(0);
  const put = (key: string, on: boolean) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
    onChange?.(key, on);
  };
  function dismiss(key: string, from: HTMLElement, move = true) {
    const next = nextDismiss(from);
    put(key, true);
    // `focusVisible` on the next ✕ only: its ring shows after a pointer press too, as the boards draw it (Row-States).
    // A fallback (the section's head) takes focus plainly, so a pointer press draws no outline on it.
    if (move) requestAnimationFrame(() => (next ? next.focus({ focusVisible: true } as FocusOptions) : fallback?.()?.focus()));
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
