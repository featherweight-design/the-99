"use client";

import { captureClientError } from "../../lib/sentry/capture-client";
import { useState } from "react";

import { launchEmailDryRun, sendLaunchEmailBatch, type LaunchEmailActionResult } from "../../app/admin/invites/launch-email-actions";
import { launchEmailAdminCopy as copy } from "../../lib/copy/admin";
import { LAUNCH_BATCH_MAX } from "../../lib/flyer/launch-rule";
import { SteadyLabel } from "../ui/steady-label";

// The launch email's card on /admin/invites (launch email R2c G3). Eng-drawn admin tooling (orchestrator ruling
// 2026-11-20), styled as the launch-list card above it: a dry run first, then Send next N behind a confirm that names the
// count. The send is the admin's to press; nothing here sends on its own.
const CARD = "overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]";
const MONO_FAINT = "font-mono text-[11px] text-[color:var(--fg-faint)]";
const TEXT_BUTTON =
  "inline-flex min-h-[44px] cursor-pointer items-center whitespace-nowrap border-0 bg-transparent px-[6px] text-[13px] font-medium text-[color:var(--accent-text)] disabled:cursor-default disabled:opacity-60 md:min-h-[32px]";
const LINE = "m-0 px-[14px] pb-[12px] text-[12.5px] leading-[1.5] md:px-[16px]";

const MAX = LAUNCH_BATCH_MAX;

function refusalLine(r: Extract<LaunchEmailActionResult, { ok: false }>): string {
  return copy.refused[r.reason];
}

export function LaunchEmailCard() {
  const [pending, setPending] = useState(false);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [count, setCount] = useState(MAX);
  const [confirming, setConfirming] = useState(false);
  const [line, setLine] = useState<{ text: string; danger: boolean } | null>(null);

  async function run(work: () => Promise<LaunchEmailActionResult>) {
    setPending(true);
    try {
      const r = await work();
      if (!r.ok) {
        setLine({ text: refusalLine(r), danger: true });
        return;
      }
      setWaiting(r.waiting);
      setCount((c) => Math.max(1, Math.min(c, r.waiting, MAX)));
      if (r.dryRun) setLine({ text: r.waiting === 0 ? copy.none : copy.waiting(r.waiting), danger: false });
      else {
        const result = copy.result(r.sent, r.released, r.uncertain, r.skipped, r.waiting);
        const stop = r.stoppedBy === "capped" ? copy.capped : r.stoppedBy === "lookup" ? copy.lookup : null;
        setLine({ text: stop ? `${result} ${stop}` : result, danger: r.stoppedBy === "lookup" });
      }
    } catch (e) {
      captureClientError("admin.launch-email", e);
      setLine({ text: copy.refused.failed, danger: true });
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  const canSend = waiting !== null && waiting > 0;
  return (
    <div className={CARD} data-testid="launch-email-card">
      <div className="grid min-h-[56px] grid-cols-[minmax(0,1fr)] items-center gap-[4px] px-[14px] pb-[4px] pt-[12px] md:grid-cols-[minmax(0,1fr)_auto] md:gap-[14px] md:py-[10px] md:pl-[16px] md:pr-[10px]">
        <span className="flex flex-col gap-[4px] md:gap-[3px]">
          <b className="text-[14px] font-semibold text-[color:var(--fg)]">{copy.title}</b>
          <span className={MONO_FAINT}>{copy.meta}</span>
        </span>
        <span className="-ml-[6px] flex justify-start md:m-0 md:justify-end">
          <button type="button" data-testid="launch-email-dry-run" disabled={pending} onClick={() => run(launchEmailDryRun)} className={TEXT_BUTTON}>
            <SteadyLabel hold={[copy.checking, copy.check]}>{pending && !confirming ? copy.checking : copy.check}</SteadyLabel>
          </button>
        </span>
      </div>
      {line && (
        <p role={line.danger ? "alert" : "status"} className={`${LINE} ${line.danger ? "text-[color:var(--danger)]" : "text-[color:var(--fg-muted)]"}`}>
          {line.text}
        </p>
      )}
      {canSend && !confirming && (
        <div className="flex flex-wrap items-center gap-[10px] px-[14px] pb-[12px] md:px-[16px]">
          <label className="flex items-center gap-[8px] text-[12.5px] text-[color:var(--fg-muted)]">
            {copy.countLabel}
            <input
              type="number"
              min={1}
              max={Math.min(MAX, waiting)}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(Number(e.target.value) || 1, MAX, waiting)))}
              className="min-h-[44px] w-[72px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[10px] text-[16px] [@media(pointer:fine)]:text-[13px] text-[color:var(--fg)] md:min-h-[32px]"
            />
          </label>
          <button type="button" data-testid="launch-email-send" disabled={pending} onClick={() => setConfirming(true)} className={TEXT_BUTTON}>
            {copy.send(count)}
          </button>
        </div>
      )}
      {canSend && confirming && (
        <div role="alertdialog" aria-label={copy.confirm(count)} className="flex flex-wrap items-center gap-[10px] px-[14px] pb-[12px] md:px-[16px]">
          <span className="text-[12.5px] text-[color:var(--fg)]">{copy.confirm(count)}</span>
          <button type="button" data-testid="launch-email-confirm" disabled={pending} onClick={() => run(() => sendLaunchEmailBatch(count))} className={TEXT_BUTTON}>
            <SteadyLabel hold={[copy.sending, copy.confirmYes(count)]}>{pending ? copy.sending : copy.confirmYes(count)}</SteadyLabel>
          </button>
          <button type="button" disabled={pending} onClick={() => setConfirming(false)} className={TEXT_BUTTON}>
            {copy.cancel}
          </button>
        </div>
      )}
    </div>
  );
}
