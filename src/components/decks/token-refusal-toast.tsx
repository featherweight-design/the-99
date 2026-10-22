"use client";

// A press the server refused or that threw, said as a deck toast (small-polish handoff §5.4; deck messages A1 for a
// card's failed removal): in the deck slot the receipt toasts use, `role="alert"`, the shipped refusal as its title and
// the name as its detail, no action.
// Eight seconds, held while the pointer or focus is on it. A got-it receipt holds an Undo, so the slot is the receipt's:
// a refusal that finds one already up sits above it (by the receipt's own measured height, since its body wraps), and one
// showing when a receipt arrives leaves. One refusal at a time per deck: the provider holds it, and a newer replaces it.

import { useEffect, useRef, useState } from "react";
import { tokensCopy } from "../../lib/copy/tokens";
import { DECK_TOAST_CLAIM, ToastFrame, useToastClock } from "../collection/edit-toast";

export function TokenRefusalToast({ name, onDone }: { name: string; onDone: () => void }) {
  return <DeckRefusalToast kind="token-refusal" title={tokensCopy.row.refused} detail={tokensCopy.row.refusedDetail(name)} onDone={onDone} />;
}

/** A refusal toast announces itself with this when it mounts, and any other refusal toast leaves: one refusal at a time
 *  per deck whoever owns it (a removal's, in the builder, or a token's, in the provider), the newer replacing the older.
 *  The detail is the announcer's own token, so a toast does not answer its own claim. */
const REFUSAL_CLAIM = "the99:deck-refusal-claim";

/** The refusal toast: one at a time per deck, whoever owns it, and a newer replaces an older. */
export function DeckRefusalToast({ title, detail, kind = "refusal", onDone }: { title: string; detail: string; kind?: string; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  // The height of a receipt already in the slot, and a gap (this only mounts from a press, in the browser). Another refusal is
  // not a receipt, so a replaced one never lifts its successor. The receipt's body wraps, so its height is watched while the
  // refusal is up: a narrowing window that adds a line to it moves this toast with it.
  const [receipt] = useState(() => document.querySelector<HTMLElement>('[data-toast="deck"]:not([data-toast-kind$="refusal"])'));
  const measure = () => (receipt ? Math.ceil(receipt.getBoundingClientRect().height) + 10 : 0);
  const [lift, setLift] = useState(measure);
  useEffect(() => {
    if (!receipt || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(() => setLift(Math.ceil(receipt.getBoundingClientRect().height) + 10));
    watch.observe(receipt);
    return () => watch.disconnect();
  }, [receipt]);
  useToastClock(ref, !hover && !focus, onDone);
  useEffect(() => {
    window.addEventListener(DECK_TOAST_CLAIM, onDone);
    return () => window.removeEventListener(DECK_TOAST_CLAIM, onDone);
  }, [onDone]);
  const self = useRef({});
  useEffect(() => {
    const leave = (e: Event) => { if ((e as CustomEvent).detail !== self.current) onDone(); };
    window.addEventListener(REFUSAL_CLAIM, leave);
    window.dispatchEvent(new CustomEvent(REFUSAL_CLAIM, { detail: self.current }));
    return () => window.removeEventListener(REFUSAL_CLAIM, leave);
    // Mount only: a re-render (a new `onDone`) must not announce a second claim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <ToastFrame
      frameRef={ref}
      role="alert"
      placement="deck"
      lift={lift}
      kind={kind}
      title={title}
      detail={detail}
      onHold={(kind, on) => (kind === "hover" ? setHover : setFocus)(on)}
    />
  );
}
