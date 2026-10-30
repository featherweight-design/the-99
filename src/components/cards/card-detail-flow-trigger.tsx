"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

import { cardDetailCopy, useCardTrigger, type Sibling } from "./card-detail-provider";

/**
 * A card name drawn INSIDE a sentence. A native `<button>` is always an atomic inline box, so a long
 * name jumps onto its own line instead of wrapping with the words around it; this is the same
 * control as a `<span role="button">`, which wraps. Only prose uses it (`CardName`); every other
 * surface keeps `CardDetailTrigger`'s native button.
 *
 * A span has none of a button's keyboard behavior, so it is stated here, matching the native
 * contract:
 * - Enter activates on keydown, once: a held key's repeats do nothing.
 * - Space activates on KEYUP, and only if this trigger saw the non-repeat keydown (`armed`). Holding
 *   Space on one name, tabbing to another and releasing opens nothing: blur disarms.
 * - Both keydowns `preventDefault`, so the page does not scroll.
 *
 * Held keys and the sheet: once a press opens the card sheet, focus moves into it, so this trigger
 * sees no further key events from that press. The sheet's keydown handler (`useDialogA11y`) acts on
 * Escape and Tab only, so a repeating Enter reaching a focused control inside it cannot close it
 * through the dialog; the controls' own click is the browser's.
 *
 * The focus ring is the app's standard one and draws on every fragment of a wrapped name
 * (`box-decoration-clone` for the dotted underline). `:focus-visible` shows no ring on a mouse click.
 */
export function CardDetailFlowTrigger({
  oracleId, name, siblings, className, title, ariaLabel, describedBy, testId, door = false, imageUri, preview = false, disabled = false, children,
}: {
  oracleId: string;
  name: string;
  siblings?: readonly Sibling[];
  className?: string;
  title?: string;
  ariaLabel?: string;
  describedBy?: string;
  testId?: string;
  door?: boolean;
  imageUri?: string | null;
  preview?: boolean;
  /** Not pressable: `aria-disabled`, out of the tab order, no preview, no activation. */
  disabled?: boolean;
  children: ReactNode;
}) {
  const { intent, hover, pending, openFrom } = useCardTrigger({ oracleId, siblings, door, imageUri, preview });
  const armed = useRef(false);

  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (disabled || e.target !== e.currentTarget) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) openFrom(e.currentTarget);
    } else if (e.key === " ") {
      e.preventDefault();
      if (!e.repeat) armed.current = true;
    }
  };
  const onKeyUp = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (disabled || e.target !== e.currentTarget || e.key !== " ") return;
    e.preventDefault();
    if (!armed.current) return;
    armed.current = false;
    openFrom(e.currentTarget);
  };

  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      {...(disabled ? {} : intent)}
      {...(preview && !disabled ? hover : {})}
      data-testid={testId}
      onClick={disabled ? undefined : (e) => openFrom(e.currentTarget)}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={() => { armed.current = false; }}
      aria-label={ariaLabel ?? cardDetailCopy.triggerAria(name)}
      aria-describedby={describedBy}
      aria-busy={pending}
      aria-disabled={disabled || undefined}
      title={title}
      className={twMerge(
        "cursor-pointer box-decoration-clone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]",
        disabled && "cursor-default",
        className,
      )}
      style={{ opacity: pending ? 0.55 : undefined }}
    >
      {children}
    </span>
  );
}
