"use client";

import { useId, useRef, type ReactNode } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { useVisualViewportFrame, VV_FRAME } from "../ui/visual-viewport";

// The admin confirm frame (design table, Confirm; small items 9, the shared confirm): a dialog at desktop, a sheet at
// phone, as `setting-dialog.tsx` draws them. It owns the shell, the title, the lead, the facts and the two buttons; what
// a write needs beyond that (a note field, a refusal line) is its `children`, drawn under the facts in the body that
// scrolls. `tone: "danger"` is for a write that removes or stops something for good: the confirm button takes
// `--danger`. Cancel takes the focus on open either way, so a stray Enter never confirms.

export type ConfirmFact = readonly [label: string, value: ReactNode];

export function ConfirmFrame({
  title,
  lead,
  facts,
  children,
  cancelLabel,
  confirmLabel,
  tone = "default",
  pending,
  onConfirm,
  onCancel,
}: {
  title: string;
  lead: string;
  facts: readonly ConfirmFact[];
  children?: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  useDialogA11y(ref, onCancel, { initialFocusRef: cancelRef, closeOnEscape: !pending });
  // A caller's field raises the keyboard: on the phone the frame is the visible window (ui/visual-viewport.ts).
  const visible = useVisualViewportFrame();
  return (
    <div role="presentation" style={visible} className={`fixed inset-0 ${VV_FRAME} z-50 flex items-end justify-center bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] md:items-start md:pt-[110px]`}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-lead`}
        tabIndex={-1}
        className="flex max-h-[100dvh] max-md:max-h-[min(100dvh,var(--vv-h,100dvh))] w-full flex-col gap-[14px] overflow-hidden rounded-[20px_20px_0_0] bg-[color:var(--surface)] p-[12px_18px_22px] outline-none [border-top:1px_solid_var(--border-strong)] md:max-h-[calc(100dvh-110px-24px)] md:w-[540px] md:rounded-[14px] md:p-[24px_24px_20px] md:shadow-[var(--modal-shadow)] md:[border:1px_solid_var(--border-strong)]"
      >
        <span aria-hidden className="mx-auto h-[4px] w-[40px] flex-none rounded-full bg-[color:var(--border-strong)] md:hidden" />
        <h2 id={`${id}-title`} className="m-0 flex-none font-display text-[20px] font-normal leading-[1.3] text-[color:var(--fg)]">
          {title}
        </h2>
        {/* The title above and the buttons below stay put; only this scrolls when the box meets its cap. The 6px
            inset keeps a field's focus ring inside the scroller's clip. */}
        <div className="-m-[6px] flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto overscroll-contain p-[6px]">
          <p id={`${id}-lead`} className="m-0 text-pretty text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
            {lead}
          </p>
          {/* shrink-0: a flex item that clips its overflow may shrink to nothing, so under the cap the facts would be
              cut off instead of the body scrolling. */}
          <dl className="m-0 shrink-0 overflow-hidden rounded-[10px] border border-solid border-[color:var(--border)]">
            {facts.map(([k, v], i) => (
              <div
                key={k}
                className={`grid grid-cols-[74px_minmax(0,1fr)] gap-[10px] px-[12px] py-[10px] md:grid-cols-[92px_minmax(0,1fr)] ${i > 0 ? "border-0 border-t border-solid border-[color:var(--border)]" : ""}`}
              >
                <dt className="pt-[2px] font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">{k}</dt>
                <dd className="m-0 text-pretty text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{v}</dd>
              </div>
            ))}
          </dl>
          {children}
        </div>
        <div className="flex flex-none gap-[10px] md:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-[46px] flex-1 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[18px] text-[14px] text-[color:var(--fg)] disabled:opacity-60 md:h-[40px] md:flex-none"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`h-[46px] flex-1 rounded-[10px] ${CONFIRM_TONE[tone]} px-[20px] text-[14px] font-semibold disabled:opacity-60 md:h-[40px] md:flex-none`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const CONFIRM_TONE = {
  default: "bg-[color:var(--fg)] text-[color:var(--bg)]",
  danger: "bg-[color:var(--danger)] text-[#fff]",
} as const;
