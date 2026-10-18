"use client";

import { useId, useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { useVisualViewportFrame, VV_FRAME } from "../ui/visual-viewport";
import { usd } from "../../lib/admin/costs-rule";
import type { ConfirmPreview } from "../../lib/admin/switch-writes";
import type { Op, Scope } from "../../lib/admin/switch-writes-rule";
import { adminCopy } from "../../lib/copy/admin";

// The model confirm (admin STATES F3; design table, Confirm): a write that raises how many accounts
// can press a model feature. A dialog at desktop, a sheet at phone, as `setting-dialog.tsx` draws
// them. It renders the server's preview and computes no figure of its own; `Turn on for n` sends n
// back, and a count that moved since is answered with a fresh preview rather than a write.

const copy = adminCopy.confirmModel;

export type ConfirmContext = { switchLabel: string; op: Op; scope: Scope; groupName: string | null };

function lead({ op, scope, groupName }: ConfirmContext, preview: ConfirmPreview, what?: string): string {
  what ??= scope === "group" ? copy.lead.group[op](groupName ?? "") : copy.lead[scope][op];
  const features = preview.costs.map((c) => copy.capability[c.key]);
  const list = features.length < 3 ? features.join(" and ") : `${features.slice(0, -1).join(", ")} and ${features.at(-1)}`;
  return `${what} ${copy.spends(list)}`;
}

export function ModelConfirm({
  preview,
  context,
  pending,
  onConfirm,
  onCancel,
  leadText,
  noted = true,
}: {
  preview: ConfirmPreview;
  context: ConfirmContext;
  /** The lead's first sentence, when the write is not an override (a group save names its own). */
  leadText?: string;
  /** False where the write has no note to record (a group save's events carry none). */
  noted?: boolean;
  pending: boolean;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [note, setNote] = useState("");
  useDialogA11y(ref, onCancel, { initialFocusRef: cancelRef, closeOnEscape: !pending });
  // Its confirmation field raises the keyboard: on the phone the frame is the visible window (ui/visual-viewport.ts).
  const visible = useVisualViewportFrame();
  const credits = preview.credits.join(" or ");
  const facts: [string, string][] = [
    [copy.facts.who, preview.names.join(", ")],
    [
      copy.facts.cost,
      [
        ...preview.costs.map((c) => `${copy.cost(copy.capability[c.key], usd(c.reserveMicroUsd))} ${c.meanMicroUsd === null ? copy.noMean : copy.mean(usd(c.meanMicroUsd))}`),
        ...(credits ? [copy.credits(credits)] : []),
      ].join(" "),
    ],
    [copy.facts.whatsNew, preview.whatsNew > 0 ? copy.whatsNew(preview.whatsNew, context.switchLabel) : copy.noWhatsNew],
    [copy.facts.when, copy.when],
  ];
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
          {copy.title(context.switchLabel, preview.count)}
        </h2>
        {/* The title above and the buttons below stay put; only this scrolls when the box meets its cap. The 6px
            inset keeps a field's focus ring inside the scroller's clip. */}
        <div className="-m-[6px] flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto overscroll-contain p-[6px]">
          <p id={`${id}-lead`} className="m-0 text-pretty text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
            {lead(context, preview, leadText)}
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
          {noted && (
            <label className="flex flex-col gap-[6px] text-[12.5px] text-[color:var(--fg-muted)]">
              {copy.note}
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                autoComplete="off"
                className="h-[44px] w-full rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] text-[16px] text-[color:var(--fg)] md:h-[38px] [@media(pointer:fine)]:md:text-[14px]"
              />
            </label>
          )}
        </div>
        <div className="flex flex-none gap-[10px] md:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-[46px] flex-1 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[18px] text-[14px] text-[color:var(--fg)] disabled:opacity-60 md:h-[40px] md:flex-none"
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note)}
            disabled={pending}
            className="h-[46px] flex-1 rounded-[10px] bg-[color:var(--fg)] px-[20px] text-[14px] font-semibold text-[color:var(--bg)] disabled:opacity-60 md:h-[40px] md:flex-none"
          >
            {copy.confirm(preview.count)}
          </button>
        </div>
      </div>
    </div>
  );
}
