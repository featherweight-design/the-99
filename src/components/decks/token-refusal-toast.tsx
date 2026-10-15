"use client";

// A token press the server refused or that threw, said as a deck toast (small-polish handoff §5.4): in the deck slot
// the receipt toasts use, `role="alert"`, the shipped refusal as its title and the token's name as its detail, no action.
// Eight seconds, held while the pointer or focus is on it. A got-it receipt holds an Undo, so the slot is the receipt's:
// a refusal that finds one already up sits above it (by the receipt's own measured height, since its body wraps), and one
// showing when a receipt arrives leaves. One refusal at a time per deck: the provider holds it, and a newer replaces it.

import { useEffect, useRef, useState } from "react";
import { tokensCopy } from "../../lib/copy/tokens";
import { DECK_TOAST_CLAIM, ToastFrame, useToastClock } from "../collection/edit-toast";

export function TokenRefusalToast({ name, onDone }: { name: string; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  // Read once, at mount (this only mounts from a press, in the browser): the height of a receipt already in the slot, and a
  // gap. Another refusal is not a receipt, so a replaced one never lifts its successor.
  const [lift] = useState(() => {
    const receipt = document.querySelector('[data-toast="deck"]:not([data-toast-kind="token-refusal"])');
    return receipt ? Math.ceil(receipt.getBoundingClientRect().height) + 10 : 0;
  });
  useToastClock(ref, !hover && !focus, onDone);
  useEffect(() => {
    window.addEventListener(DECK_TOAST_CLAIM, onDone);
    return () => window.removeEventListener(DECK_TOAST_CLAIM, onDone);
  }, [onDone]);
  return (
    <ToastFrame
      frameRef={ref}
      role="alert"
      placement="deck"
      lift={lift}
      kind="token-refusal"
      title={tokensCopy.row.refused}
      detail={tokensCopy.row.refusedDetail(name)}
      onHold={(kind, on) => (kind === "hover" ? setHover : setFocus)(on)}
    />
  );
}
