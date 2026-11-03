"use client";

import { useState, type ReactNode } from "react";
import { ConfirmFrame, type ConfirmFact } from "./confirm-frame";
import { NOTE_MAX } from "../../lib/admin/flag-writes-rule";
import { adminCopy } from "../../lib/copy/admin";

// The kill confirm (small items 9, item 4; `Flags-Kill` K4, K6): Killed picked on the App-wide segment, drawn in the
// shared `ConfirmFrame` with its danger action. Every kill asks once, model flag or not: it reaches everyone and refuses
// every override. Who names everyone and who is held on now (`flag-page-rule.ts` derives it from the page's own
// verdicts); a failed write stays in the dialog as the override write's shipped line (`failure`).

const copy = adminCopy.killConfirm;

export function KillConfirm({
  label,
  who,
  pending,
  failure,
  onConfirm,
  onCancel,
}: {
  label: string;
  who: string;
  pending: boolean;
  failure?: ReactNode;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const facts: ConfirmFact[] = [
    [copy.facts.who, who],
    [copy.facts.overrides, copy.overrides],
    [copy.facts.when, copy.when],
  ];
  return (
    <ConfirmFrame
      title={copy.title(label)}
      lead={copy.lead(label)}
      facts={facts}
      cancelLabel={copy.cancel}
      confirmLabel={copy.confirm}
      tone="danger"
      pending={pending}
      onConfirm={() => onConfirm(note)}
      onCancel={onCancel}
    >
      <label className="flex flex-col gap-[6px] text-[12.5px] text-[color:var(--fg-muted)]">
        {copy.note}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={NOTE_MAX}
          autoComplete="off"
          className="h-[44px] w-full rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] text-[16px] text-[color:var(--fg)] md:h-[38px] [@media(pointer:fine)]:md:text-[14px]"
        />
      </label>
      {failure}
    </ConfirmFrame>
  );
}
