"use client";

import { useId, useState, useTransition } from "react";
import { setLaunchDate } from "../../app/admin/invites/flyer-actions";
import { adminCopy, flyerAdminCopy } from "../../lib/copy/admin";

// The launch card's second row (flyer admin PR B; Launch-Date.dc.html D1 to D5, P1 to P4): the launch date, a native date
// field styled as the shipped admin FIELD (38 tall, 44 on a phone), the help line, and Save / Saved / Clear / Cleared.
// One markup for both widths: a stacked column on the phone, the four-column row from `md`. Blank is a valid saved value.
// Save shows only while the field differs from what is saved; a refused save keeps what was typed and alerts with
// `adminCopy.setting.saveFailed` (the boards draw no separate line for a past date, so it reads the same).

const copy = flyerAdminCopy;
const FIELD =
  "h-[44px] w-full rounded-[8px] border border-solid bg-[color:var(--surface-sunken)] px-[12px] text-[16px] text-[color:var(--fg)] md:h-[38px] [@media(pointer:fine)]:md:text-[14px]";
const TEXT_BUTTON =
  "inline-flex min-h-[44px] cursor-pointer items-center whitespace-nowrap border-0 bg-transparent px-[6px] text-[13px] font-medium text-[color:var(--accent-text)] md:min-h-[32px]";

export function FlyerLaunchDate({ saved: initial }: { saved: string | null }) {
  const id = useId();
  const [saved, setSaved] = useState<string | null>(initial);
  const [typed, setTyped] = useState(initial ?? "");
  // What the last press did, shown while the field still equals what it saved.
  const [done, setDone] = useState<"saved" | "cleared" | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const dirty = typed !== (saved ?? "");

  function save(next: string) {
    setFailed(false);
    start(async () => {
      try {
        const result = await setLaunchDate(next);
        if (!result.ok) {
          setFailed(true);
          return;
        }
        setSaved(result.value);
        // Only when the field still holds what was sent: an edit made while the request was out stays.
        setTyped((now) => (now === next ? (result.value ?? "") : now));
        setDone(result.state);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <div
      data-testid="launch-date-row"
      className="grid grid-cols-[minmax(0,1fr)] items-center gap-[6px] border-0 border-t border-solid border-[color:var(--border)] px-[14px] pb-[14px] pt-[12px] md:min-h-[60px] md:grid-cols-[120px_200px_minmax(0,1fr)_auto] md:gap-[14px] md:py-[10px] md:pl-[16px] md:pr-[10px]"
    >
      <label htmlFor={id} className="text-[13px] font-semibold text-[color:var(--fg)]">
        {copy.launchDate}
      </label>
      <input
        id={id}
        type="date"
        value={typed}
        onChange={(e) => {
          setTyped(e.target.value);
          setFailed(false);
        }}
        className={`${FIELD} ${dirty ? "border-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent)]" : "border-[color:var(--border-strong)]"}`}
      />
      <small className="text-[12px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">{copy.launchDateHelp}</small>
      <span className="-mb-[8px] -ml-[6px] flex items-center justify-start gap-[10px] md:m-0 md:justify-end">
        {dirty && typed === "" ? (
          // An emptied field is a clear, and Clear is the only way to say so: a date input also reads "" mid-edit.
          <button type="button" data-testid="launch-date-clear" disabled={pending} onClick={() => save("")} className={TEXT_BUTTON}>
            {copy.launchDateClear}
          </button>
        ) : dirty ? (
          <button type="button" data-testid="launch-date-save" disabled={pending} onClick={() => save(typed)} className={TEXT_BUTTON}>
            {copy.launchDateSave}
          </button>
        ) : (
          <>
            {done && (
              <span data-testid="launch-date-status" className="whitespace-nowrap pl-[6px] font-mono text-[11px] text-[color:var(--fg-faint)] md:pl-0">
                {done === "saved" ? copy.launchDateSaved : copy.launchDateCleared}
              </span>
            )}
            {saved !== null && (
              <button type="button" data-testid="launch-date-clear" disabled={pending} onClick={() => save("")} className={TEXT_BUTTON}>
                {copy.launchDateClear}
              </button>
            )}
          </>
        )}
      </span>
      {failed && (
        <p role="alert" className="m-0 -mt-[2px] mb-[2px] text-[13px] text-[color:var(--danger)] md:col-span-full">
          {adminCopy.setting.saveFailed}
        </p>
      )}
    </div>
  );
}
