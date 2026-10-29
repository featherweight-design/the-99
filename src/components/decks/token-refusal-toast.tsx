"use client";

// A press the server refused or that threw, said as a deck toast (small-polish handoff §5.4; deck messages A1 for a
// card's failed removal): in the deck toast stack, `role="alert"`, the shipped refusal as its title and the name as its
// detail, no action.
// Eight seconds, held while the pointer or focus is on it. It is an alert in the stack (small items 3, item 8): it sits
// above a receipt that is up, and one showing when a receipt arrives leaves (the receipt holds Undo, and the refusal's
// press is older news). One alert at a time per deck: a newer refusal or failed search replaces it.

import { useEffect, useRef, useState } from "react";
import { tokensCopy } from "../../lib/copy/tokens";
import { DECK_TOAST_CLAIM, ToastFrame, useToastClock } from "../collection/edit-toast";
import { useDeckAlertClaim } from "./deck-toast-stack";

export function TokenRefusalToast({ name, onDone }: { name: string; onDone: () => void }) {
  return <DeckRefusalToast kind="token-refusal" title={tokensCopy.row.refused} detail={tokensCopy.row.refusedDetail(name)} onDone={onDone} />;
}

/** The refusal toast: one alert at a time per deck, whoever owns it, and a newer replaces an older. */
export function DeckRefusalToast({ title, detail, kind = "refusal", onDone }: { title: string; detail: string; kind?: string; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  useToastClock(ref, !hover && !focus, onDone);
  useEffect(() => {
    window.addEventListener(DECK_TOAST_CLAIM, onDone);
    return () => window.removeEventListener(DECK_TOAST_CLAIM, onDone);
  }, [onDone]);
  useDeckAlertClaim(onDone);
  return (
    <ToastFrame
      frameRef={ref}
      role="alert"
      placement="deck"
      kind={kind}
      title={title}
      detail={detail}
      onHold={(kind, on) => (kind === "hover" ? setHover : setFocus)(on)}
    />
  );
}
