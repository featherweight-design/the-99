"use client";
// A social write that failed (README decision 18; audit E15): the shared `ToastFrame`, `role="alert"`, at its
// centre slot, 16px above the tab bar on a phone. One component for every refusal the social screens draw:
// the name, the commander, a friend's removal, a link that could not be made (with `Try again`), the race to
// ten (`tooMany`, no retry) and a decline (the request card's, PR D). It leaves after the shared toast's
// window, held while it is hovered or holds focus, and on its own action.

import { useEffect, useRef, useState } from "react";
import { ToastFrame, useToastClock } from "../collection/edit-toast";

export type SocialToastState = { id: number; text: string; retry?: { label: string; run: () => void } };

export function SocialToast({ toast, onDone }: { toast: SocialToastState | null; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Hover and focus hold the window separately, and it runs again only once both have let go.
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  // A toast that leaves under the pointer or with focus in it fires no leave, so its holds go with it, or the next
  // toast would never count down.
  if (!toast && (hover || focus)) {
    setHover(false);
    setFocus(false);
  }
  const { restart } = useToastClock(ref, toast !== null && !hover && !focus, onDone);
  // A new toast gets the whole window, whatever the last one spent.
  useEffect(() => {
    restart();
  }, [toast?.id, restart]);
  if (!toast) return null;
  return (
    <ToastFrame
      key={toast.id}
      frameRef={ref}
      role="alert"
      onHold={(kind, on) => (kind === "hover" ? setHover : setFocus)(on)}
      title={toast.text}
      actions={toast.retry ? (
        <button
          type="button"
          onClick={() => {
            onDone();
            toast.retry?.run();
          }}
          className="min-h-[44px] flex-none cursor-pointer border-0 bg-transparent px-[12px] text-[13.5px] font-semibold text-[color:var(--accent)]"
        >
          {toast.retry.label}
        </button>
      ) : null}
    />
  );
}
