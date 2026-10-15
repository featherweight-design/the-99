"use client";

// A token press the server refused or that threw, said as a deck toast (small-polish handoff §5.4): in the deck slot
// the receipt toasts use, `role="alert"`, the shipped refusal as its title and the token's name as its detail, no action.
// Eight seconds, held while the pointer or focus is on it. It leaves when a got-it receipt claims the slot, since that
// toast holds an Undo.

import { useEffect, useRef, useState } from "react";
import { tokensCopy } from "../../lib/copy/tokens";
import { DECK_TOAST_CLAIM, ToastFrame, useToastClock } from "../collection/edit-toast";

export function TokenRefusalToast({ name, onDone }: { name: string; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
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
      title={tokensCopy.row.refused}
      detail={tokensCopy.row.refusedDetail(name)}
      onHold={(kind, on) => (kind === "hover" ? setHover : setFocus)(on)}
    />
  );
}
