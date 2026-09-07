"use client";
// The submit buttons for `retryRecs`, which is the slowest thing on this page:
// it drops every persisted score and re-ranks from EDHREC, measured at 2.9s.
// Until now the five forms that fire it were plain server-rendered buttons, so
// a player pressed Retry and watched an unchanged banner for three seconds.
//
// `useFormStatus` reads the status of the form these sit inside, which is why
// they are components rather than markup repeated at each call site — the hook
// returns nothing useful to a component that renders the <form> itself.
//
// Two shapes because the banner has two: a ghost CTA where the layout gives it
// a slot, and an underlined word inside a sentence where it does not.

import { useFormStatus } from "react-dom";
import { GhostButton } from "../ui/button";
import { PendingMark } from "../ui/pending-mark";
import { PENDING_OPACITY, PENDING_OPACITY_CLASS } from "./pending";

/** Retry as a ghost CTA. `className` carries the caller's padding and size. */
export function RetryGhost({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <GhostButton
      type="submit"
      aria-busy={pending || undefined}
      // Never `disabled`: it would blur the button the player is standing on
      // and drop a keyboard reader at the top of the document mid-retry. A
      // second press re-runs an action that deletes and recomputes the same
      // scores, which is the same answer arriving later, not a corrupted one.
      className={[
        "inline-flex items-center justify-center gap-[8px]",
        pending ? PENDING_OPACITY_CLASS : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
      {pending && <PendingMark />}
    </GhostButton>
  );
}

/** Retry as an underlined word mid-sentence. `fontSize` matches its prose. */
export function RetryLink({
  children,
  fontSize,
}: {
  children: React.ReactNode;
  fontSize: number;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-busy={pending || undefined}
      // brand focus-visible outline treatment inherited from globals.css
      className="inline-flex items-center gap-[6px] align-middle underline cursor-pointer bg-transparent border-0 p-0 font-[inherit] text-[color:var(--accent)]"
      style={{ fontSize, opacity: pending ? PENDING_OPACITY : undefined }}
    >
      {children}
      {pending && <PendingMark />}
    </button>
  );
}
