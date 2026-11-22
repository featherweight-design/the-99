"use client";

import { useState } from "react";

import { sendEmailPreviews, type EmailPreviewResult } from "../../app/admin/invites/email-preview-actions";
import { emailPreviewAdminCopy as copy } from "../../lib/copy/admin";
import { SteadyLabel } from "../ui/steady-label";

// The "send every email template to me" card on /admin/invites. Eng-drawn admin tooling, styled as the launch email card
// beside it. One press sends three emails to the admin's own address; the server decides the cooldown and the caps.
const CARD = "overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]";
const MONO_FAINT = "font-mono text-[11px] text-[color:var(--fg-faint)]";
const TEXT_BUTTON =
  "inline-flex min-h-[44px] cursor-pointer items-center whitespace-nowrap border-0 bg-transparent px-[6px] text-[13px] font-medium text-[color:var(--accent-text)] disabled:cursor-default disabled:opacity-60";
const LINE = "m-0 px-[14px] pb-[12px] text-[12.5px] leading-[1.5] md:px-[16px]";

export function lineFor(r: EmailPreviewResult): { text: string; danger: boolean } {
  if (!r.ok) return { text: r.reason === "cooldown" ? copy.cooldown(r.waitSec) : copy.refused[r.reason], danger: true };
  const tail = r.stoppedBy === "capped" ? ` ${copy.capped}` : r.stoppedBy === "limited" ? ` ${copy.limited}` : "";
  return { text: copy.result(r.sent, r.total) + tail, danger: r.sent < r.total };
}

export function EmailPreviewCard() {
  const [pending, setPending] = useState(false);
  const [line, setLine] = useState<{ text: string; danger: boolean } | null>(null);

  async function send() {
    setPending(true);
    try {
      setLine(lineFor(await sendEmailPreviews()));
    } catch {
      setLine({ text: copy.refused.failed, danger: true });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={CARD} data-testid="email-preview-card">
      <div className="grid min-h-[56px] grid-cols-[minmax(0,1fr)] items-center gap-[4px] px-[14px] pb-[4px] pt-[12px] md:grid-cols-[minmax(0,1fr)_auto] md:gap-[14px] md:py-[10px] md:pl-[16px] md:pr-[10px]">
        <span className="flex flex-col gap-[4px] md:gap-[3px]">
          <b className="text-[14px] font-semibold text-[color:var(--fg)]">{copy.title}</b>
          <span className={MONO_FAINT}>{copy.meta}</span>
        </span>
        <span className="-ml-[6px] flex justify-start md:m-0 md:justify-end">
          <button type="button" data-testid="email-preview-send" disabled={pending} onClick={send} className={TEXT_BUTTON}>
            <SteadyLabel hold={[copy.sending, copy.send]}>{pending ? copy.sending : copy.send}</SteadyLabel>
          </button>
        </span>
      </div>
      {line && (
        <p role={line.danger ? "alert" : "status"} data-testid="email-preview-line" className={`${LINE} ${line.danger ? "text-[color:var(--danger)]" : "text-[color:var(--fg-muted)]"}`}>
          {line.text}
        </p>
      )}
    </div>
  );
}
