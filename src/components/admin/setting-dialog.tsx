"use client";

import { useId, useRef, useState, useTransition } from "react";
import { setAccountCap, setElsewhere, setSystemCeiling, type SettingResult } from "../../app/admin/actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { adminCopy } from "../../lib/copy/admin";

// The settings dialog (admin STATES C7): Enter elsewhere takes an amount, the day it was read and a
// note; Change the cap and Change the ceiling take an amount and a note. A small dialog at 900, a
// sheet at 390, as the app's confirm modal draws them. Nothing is written until Save.

export type SettingKind = "elsewhere" | "cap" | "ceiling";

const copy = adminCopy.setting;
const FIELD =
  "h-[44px] w-full rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] text-[14px] text-[color:var(--fg)] md:h-[38px]";

function SettingDialog({ kind, title, onClose }: { kind: SettingKind; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [error, setError] = useState<Extract<SettingResult, { ok: false }>["error"] | null>(null);
  const [pending, start] = useTransition();
  useDialogA11y(ref, onClose, { initialFocusRef: amountRef, closeOnEscape: !pending });

  function save(form: FormData) {
    const amount = String(form.get("amount") ?? "");
    const note = String(form.get("note") ?? "");
    start(async () => {
      const result =
        kind === "elsewhere"
          ? await setElsewhere({ amount, asOf: String(form.get("asOf") ?? ""), note })
          : kind === "cap"
            ? await setAccountCap({ amount, note })
            : await setSystemCeiling({ amount, note });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  const message = error === "amount" ? copy.badAmount : error === "date" ? copy.badDate : error === "failed" ? copy.saveFailed : null;
  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] md:items-center">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        className="w-full rounded-[22px_22px_0_0] bg-[color:var(--surface-raised)] p-[18px_18px_28px] outline-none [border-top:1px_solid_var(--border-strong)] md:w-[420px] md:rounded-[14px] md:p-[24px] md:[border:1px_solid_var(--border-strong)]"
      >
        <h2 id={`${id}-title`} className="m-0 text-[17px] font-semibold text-[color:var(--fg)]">{title}</h2>
        <form action={save} className="mt-[16px] flex flex-col gap-[12px]">
          <label className="flex flex-col gap-[6px] text-[13px] text-[color:var(--fg-body)]">
            {copy.amount}
            <input ref={amountRef} name="amount" inputMode="decimal" autoComplete="off" required className={`${FIELD} font-mono`} />
          </label>
          {kind === "elsewhere" && (
            <label className="flex flex-col gap-[6px] text-[13px] text-[color:var(--fg-body)]">
              {copy.asOf}
              <input name="asOf" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={`${FIELD} font-mono`} />
            </label>
          )}
          <label className="flex flex-col gap-[6px] text-[13px] text-[color:var(--fg-body)]">
            {copy.note}
            <input name="note" maxLength={500} autoComplete="off" className={FIELD} />
          </label>
          {message && <p role="alert" className="m-0 text-[13px] text-[color:var(--danger)]">{message}</p>}
          <div className="mt-[6px] flex flex-col-reverse gap-[10px] md:flex-row md:justify-end">
            <button type="button" onClick={onClose} disabled={pending} className="h-[44px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[18px] text-[14px] text-[color:var(--fg)] disabled:opacity-60 md:h-[38px]">
              {copy.cancel}
            </button>
            <button type="submit" disabled={pending} className="h-[46px] rounded-[8px] bg-[color:var(--fg)] px-[20px] text-[14px] font-semibold text-[color:var(--bg)] disabled:opacity-60 md:h-[38px]">
              {copy.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SettingAction({ kind, label }: { kind: SettingKind; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-[24px] bg-transparent p-0 text-left text-[12.5px] text-[color:var(--accent)]">
        {label}
      </button>
      {open && <SettingDialog kind={kind} title={label} onClose={() => setOpen(false)} />}
    </>
  );
}
