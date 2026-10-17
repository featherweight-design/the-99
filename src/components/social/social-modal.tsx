"use client";
// The frame `/friends` opens its modals in (Social R1 PR C). PR C1 opens one, the commander picker; the Add a
// friend dialog arrives with the friends list (PR C2). A dialog at desktop and the shipped bottom sheet at phone (grabber, 20px top corners, the scrim
// over the tab bar), one markup that CSS turns at md, as the admin's setting dialog does. `tall` is the
// picker's: a search with a keyboard needs the room, so the phone sheet is drawn tall.
//
// Portalled into `<main>` (`useSheetHost`), so a head's stacking context never puts the tab bar over it, and
// focus, Escape and the scroll lock are `useDialogA11y`'s. The ✕ is in the header, and takes focus on open
// unless the caller names another control (the picker opens on its search). Closing returns focus to the opener,
// or to `returnFocusRef` when the opener may be gone by then (a pick removes `Choose your commander`).
//
// A modal with more than one screen (Add a friend's chooser and its two paths, invites PR 4) names the one it shows
// as `screen` and passes `onBack` on every screen but the first: a ‹ sits left of the title, and the title (and so
// the dialog's name) follows the screen. A screen change moves focus to the ‹, or to the ✕ when there is none, since
// the press that changed it is gone with the screen it was on. Escape and ✕ close from any screen.

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { useSheetHost } from "../ui/sheet-host";

/**
 * The VISIBLE part of the window, as the phone sheet's frame. A phone's keyboard shrinks or pans the visual
 * viewport and leaves the layout one (`vh`, `inset-0`) alone, so a sheet sized against the layout viewport puts
 * its lower rows (and Use initials instead) behind the keyboard, and the arrow keys' scroll measures a body bottom
 * the reader cannot see. The frame sits at `offsetTop` and is `height` tall, measured again on the visual
 * viewport's resize and scroll, as the card tag picker's floating list is. The values reach CSS as two custom
 * properties the phone classes read (desktop reads neither); with no visual viewport, nothing is set and the
 * classes' fallbacks are the layout viewport.
 */
function useVisualViewportFrame(): CSSProperties | undefined {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const measure = () =>
      setBox((prev) => (prev && prev.top === vv.offsetTop && prev.height === vv.height ? prev : { top: vv.offsetTop, height: vv.height }));
    measure();
    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    return () => {
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
    };
  }, []);
  return box ? ({ "--social-vv-top": `${box.top}px`, "--social-vv-h": `${box.height}px` } as CSSProperties) : undefined;
}

export function SocialModal({
  title,
  sub,
  closeLabel,
  onClose,
  initialFocusRef,
  returnFocusRef,
  tall = false,
  width = 440,
  onBack,
  backLabel,
  screen,
  overlay,
  children,
}: {
  title: string;
  sub?: string;
  closeLabel: string;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  tall?: boolean;
  /** The desktop dialog's width: 420 for a pod's Add friends, 440 for Add a friend, 520 for the picker. */
  width?: 420 | 440 | 520;
  /** A ‹ before the title, returning to the previous screen. */
  onBack?: () => void;
  backLabel?: string;
  /** The screen shown, in a modal that has more than one: its change moves focus (above). */
  screen?: string;
  /** Drawn inside the dialog after its body (a toast raised while it is open), so its controls stay in the Tab trap. */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const host = useSheetHost(true);
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const id = useId();
  const shownScreen = useRef(screen);
  useEffect(() => {
    if (shownScreen.current === screen) return;
    shownScreen.current = screen;
    (back.current ?? close.current)?.focus();
  }, [screen]);
  useDialogA11y(panel, onClose, { initialFocusRef: initialFocusRef ?? close, returnFocusRef });
  const visible = useVisualViewportFrame();

  const frame = (
    <div
      role="presentation"
      data-social-modal-frame=""
      style={visible}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end max-md:bottom-auto max-md:top-[var(--social-vv-top,0px)] max-md:h-[var(--social-vv-h,100%)] justify-center bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] md:items-start md:pt-[10vh]"
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        data-social-modal=""
        tabIndex={-1}
        className={`flex w-full flex-col overflow-hidden rounded-[20px_20px_0_0] bg-[color:var(--surface-raised)] outline-none [border-top:1px_solid_var(--border-strong)] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] anim-sheet-in md:rounded-[14px] md:[border:1px_solid_var(--border-strong)] md:shadow-[0_30px_70px_rgba(0,0,0,0.6)] md:[animation:none] ${tall ? "max-md:h-[calc(var(--social-vv-h,100vh)*0.86)] md:max-h-[80vh]" : "max-md:max-h-[calc(var(--social-vv-h,100vh)*0.92)] md:max-h-[92vh]"} ${width === 520 ? "md:w-[520px]" : width === 420 ? "md:w-[420px]" : "md:w-[440px]"}`}
      >
        <div aria-hidden className="flex justify-center pt-[9px] pb-[2px] md:hidden">
          <span className="h-[4px] w-[40px] rounded-full bg-[color:var(--border-strong)]" />
        </div>
        <div className="flex items-start gap-[12px] px-[18px] pt-[8px] md:px-[20px] md:pt-[12px]">
          {onBack ? (
            <button
              ref={back}
              type="button"
              aria-label={backLabel}
              onClick={onBack}
              className="-ml-[12px] -mr-[8px] flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 pb-[3px] text-[22px] leading-none text-[color:var(--fg)] md:-ml-[10px] md:w-[36px]"
            >
              {"‹"}
            </button>
          ) : null}
          <h2 id={`${id}-title`} className="m-0 min-w-0 flex-1 pt-[10px] font-display text-[18px] font-bold md:text-[19px] text-[color:var(--fg)]">
            {title}
          </h2>
          <button
            ref={close}
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="-mr-[10px] flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[15px] text-[color:var(--fg-muted)]"
          >
            {"✕"}
          </button>
        </div>
        {sub ? (
          <p className="mx-[18px] mb-[14px] mt-0 text-[13px] leading-[1.5] text-[color:var(--fg-muted)] md:mx-[20px]">{sub}</p>
        ) : null}
        <div data-social-modal-body="" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[18px] pb-[22px] md:px-[20px] md:pb-[18px]">{children}</div>
        {overlay}
      </div>
    </div>
  );
  return host ? createPortal(frame, host) : null;
}
