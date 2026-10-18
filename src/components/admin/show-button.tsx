"use client";

// Show and Hide (Admin R3, D5, boards A1, A2, B1, B2): one control that reads Show, then Hide in the accent while the
// account is revealed. 32 tall from `md`, 44 on the phone. A Show still in flight holds its pressed state and leaves
// the row masked; a failed one raises the view's toast (D13).

import { useRef } from "react";
import { adminMaskCopy } from "../../lib/copy/admin";
import { ToastFrame } from "../collection/edit-toast";
import type { RevealFailure } from "./use-reveal";

const copy = adminMaskCopy.reveal;

export function ShowButton({
  on,
  pending,
  label,
  onShow,
  onHide,
  className = "",
}: {
  on: boolean;
  pending: boolean;
  /** The masked name, so a reader of the button knows whose Show it is. */
  label: string;
  onShow: () => void;
  onHide: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on || pending}
      aria-label={`${on ? copy.hide : copy.show} ${label}`}
      data-pending={pending ? "" : undefined}
      disabled={pending}
      onClick={on ? onHide : onShow}
      className={`flex-none rounded-[8px] border border-solid bg-transparent font-sans text-[13px] max-md:h-[44px] max-md:min-w-[64px] max-md:px-[14px] md:h-[32px] md:px-[12px] ${
        on || pending ? "border-[color:var(--accent)] text-[color:var(--accent)]" : "border-[color:var(--border-strong)] text-[color:var(--fg)]"
      } ${className}`}
    >
      {on ? copy.hide : copy.show}
    </button>
  );
}

/** D13: a failed Show, centre placement, `role="alert"`, with `Try again`. */
export function RevealFailedToast({ failure, onRetry }: { failure: RevealFailure; onRetry: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <ToastFrame
      frameRef={ref}
      role="alert"
      placement="center"
      kind="reveal-failed"
      title={copy.failed(failure.masked)}
      actions={
        <button
          type="button"
          onClick={onRetry}
          className="h-[44px] flex-none border-0 bg-transparent px-[10px] text-[13px] font-medium text-[color:var(--accent)] md:h-[36px]"
        >
          {copy.tryAgain}
        </button>
      }
    />
  );
}
