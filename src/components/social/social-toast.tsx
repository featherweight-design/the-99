"use client";
// A social write that failed (README decision 18; audit E15): the shared `ToastFrame`, `role="alert"`, at its
// centre slot, 16px above the tab bar on a phone. One component for every refusal the social screens draw:
// the name, the commander, a friend's removal, a link that could not be made (with `Try again`), the race to
// ten (`tooMany`, no retry) and a decline (the request card's, PR D). It leaves after the shared toast's
// window, held while it is hovered or holds focus, and on its own action.

import { useEffect, useRef, useState } from "react";
import { ToastFrame, useToastClock } from "../collection/edit-toast";
import { useCartStacked } from "../decks/cart/cart-toast-stack";
import { PersonText, type PersonParts } from "../../lib/person-name";

/** `text` that names someone is `PersonParts` (`personText`): `PersonText` marks the span holding it. */
export type SocialToastState = { id: number; text: string | PersonParts; retry?: { label: string; run: () => void } };

export function SocialToast({
  toast,
  onDone,
  role = "alert",
  placement = "center",
}: {
  toast: SocialToastState | null;
  onDone: () => void;
  /** `status` for a receipt with an action (Rule 0's `Swapped to …` with Undo); a refusal stays `alert`. */
  role?: "alert" | "status";
  /** `cart` is the cart's failed ask while a cart receipt is open (small items 7, item 3): below 1224px it joins the cart
   *  toast stack, 10px above the receipt, which keeps the floor for its Undo (Small items 8, item 3). From 1224px, and
   *  for `center`, the toast stays in its shipped centre slot, 16px above the tab bar. The caller passes `cart` only while the receipt is open, so
   *  when the receipt closes the toast drops at once to its shipped place. */
  placement?: "center" | "cart";
}) {
  const cartStacked = useCartStacked();
  const stacked = placement === "cart" && cartStacked;
  const ref = useRef<HTMLDivElement>(null);
  // Hover and focus hold the window separately, and it runs again only once both have let go.
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  // A toast that leaves, or is replaced, under the pointer or with focus in it fires no leave, so its holds go
  // with it, or the next toast would never count down.
  const [heldFor, setHeldFor] = useState(toast?.id);
  if (toast?.id !== heldFor) {
    setHeldFor(toast?.id);
    setHover(false);
    setFocus(false);
  }
  const { restart } = useToastClock(ref, toast !== null && !hover && !focus, onDone);
  // A new toast gets the whole window, whatever the last one spent, and holds only what the NEW frame holds.
  useEffect(() => {
    restart();
    const frame = ref.current;
    if (!frame) return;
    setHover(frame.matches(":hover"));
    setFocus(frame.contains(document.activeElement));
  }, [toast?.id, restart]);
  // The frame moves between the slot and the stack with the receipt (a remount: a portal), taking its holds with it.
  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    setHover(frame.matches(":hover"));
    setFocus(frame.contains(document.activeElement));
  }, [stacked]);
  if (!toast) return null;
  return (
    <ToastFrame
      key={toast.id}
      frameRef={ref}
      role={role}
      placement={stacked ? "cart" : "center"}
      kind={stacked ? "alert" : undefined}
      onHold={(kind, on) => (kind === "hover" ? setHover : setFocus)(on)}
      title={<PersonText text={toast.text} />}
      actions={toast.retry ? (
        <button
          type="button"
          onClick={() => {
            onDone();
            toast.retry?.run();
          }}
          className="min-h-[44px] flex-none cursor-pointer border-0 bg-transparent px-[12px] text-[13.5px] font-semibold text-[color:var(--accent-text)]"
        >
          {toast.retry.label}
        </button>
      ) : null}
    />
  );
}
