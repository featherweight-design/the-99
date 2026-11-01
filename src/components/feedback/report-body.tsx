"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { sendProblemReport } from "../../app/feedback-actions";
import { reportCopy as copy } from "../../lib/copy/report";
import { DOING_MAX, WHAT_MAX, type ReportSource } from "../../lib/feedback/report-rule";
import type { SocialToastState } from "../social/social-toast";

// The Report a problem form's body, ONE implementation for both homes: the sheet / `ModalChrome` of the app (`ReportForm`,
// flyer trial `Report-Phone` R3 to R6, `Report-Desktop` D3 and D4) and the page of its own (`/report`, `ReportPage`, small
// items 8 board 6). "What happened?" is required and Send stays dim until it has text; "What were you doing?" is optional;
// one static line says what is attached. Sending holds the press. Sent replaces the form with the thanks. A failed send is
// the shared toast with Try again, the typed text kept. The caller draws the `SocialToast` from `draft.toast`: it is a
// fixed frame, so it stays outside any dialog it would otherwise be positioned inside.

const BOX =
  "w-full resize-none rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] py-[10px] text-[16px] leading-[1.45] text-[color:var(--fg)] placeholder:text-[color:var(--fg-locked)] focus:border-[color:var(--accent)] focus:outline-none [@media(pointer:fine)]:text-[15px]";
const BUTTON =
  "flex h-[44px] items-center justify-center whitespace-nowrap rounded-[10px] border border-solid px-[16px] text-[14px] md:h-[32px] md:rounded-[8px] md:px-[14px] md:text-[12.5px]";
const GHOST = `${BUTTON} border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg)]`;

export type ReportPhase = "form" | "sending" | "sent";

export type ReportDraftOptions = {
  source: ReportSource;
  /** The boundary's digest, when a server error carried one. */
  digest?: string | null;
  /** The Sentry event id of a browser-side throw. */
  eventId?: string | null;
  /** The path the reader was on, when it is not this page's own (the crash screen's `from`). */
  page?: string | null;
};

export type ReportDraft = ReturnType<typeof useReportDraft>;

/** The form's state and its send. The component that draws the body owns it, so it can read `phase` for its own close guard. */
export function useReportDraft({ source, digest, eventId, page }: ReportDraftOptions) {
  const [what, setWhat] = useState("");
  const [doing, setDoing] = useState("");
  const [phase, setPhase] = useState<ReportPhase>("form");
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastId = useRef(0);
  const busy = useRef(false);
  const ready = what.trim().length > 0 && what.length <= WHAT_MAX && doing.length <= DOING_MAX;

  // The failed toast's Try again outlives the render that drew it, so a send reads the text and the ready check as they are NOW.
  const latest = useRef({ what, doing, ready });
  useEffect(() => {
    latest.current = { what, doing, ready };
  });

  async function send() {
    if (busy.current || !latest.current.ready) return;
    const { what, doing } = latest.current;
    busy.current = true;
    setToast(null);
    setPhase("sending");
    let ok = false;
    let limited = false;
    try {
      const result = await sendProblemReport({
        what,
        doing,
        page: page ?? window.location.pathname,
        source,
        digest: digest ?? null,
        sentryEventId: eventId ?? null,
      });
      ok = result.ok;
      limited = !result.ok && result.reason === "limited";
    } catch {
      ok = false;
    }
    busy.current = false;
    if (ok) {
      setPhase("sent");
      return;
    }
    // `invalid` and a thrown send read the same to the reader: it did not go, and the words are still here. `limited` says it is the volume.
    setPhase("form");
    setToast({ id: ++toastId.current, text: limited ? copy.failedLimited : copy.failed, retry: { label: copy.retry, run: () => void send() } });
  }

  return {
    what,
    doing,
    phase,
    ready,
    toast,
    send,
    clearToast: () => setToast(null),
    setWhat: (v: string) => {
      setWhat(v);
      setToast(null);
    },
    setDoing: (v: string) => {
      setDoing(v);
      setToast(null);
    },
  };
}

export function ReportBody({
  draft,
  layout,
  onClose,
  onCancel,
  signedOut = false,
  code,
}: {
  draft: ReportDraft;
  /** `modal`: inside `ModalChrome`, with its padding and a Cancel from `md`. `page`: the `/report` column, its own width, no Cancel. */
  layout: "modal" | "page";
  /** Close, from the sent state. */
  onClose: () => void;
  /** Cancel, from the form (the modal's, from `md`); sending holds it. */
  onCancel?: () => void;
  /** A signed-out reader left no contact, so the thanks promises no reply. */
  signedOut?: boolean;
  /** The error code to name under the form (`/report?ref=`); nothing is drawn without one. */
  code?: string | null;
}) {
  const { phase, ready } = draft;
  const page = layout === "page";
  if (phase === "sent") {
    return (
      <div
        className={`flex flex-col items-center gap-[8px] text-center ${page ? "px-[8px] pb-[18px] pt-[26px]" : "px-[24px] pb-[42px] pt-[42px] md:px-[18px] md:pb-[36px]"}`}
        data-testid="report-sent"
        role="status"
      >
        <span aria-hidden className="flex h-[44px] w-[44px] items-center justify-center rounded-full border-[1.5px] border-solid border-[color:var(--success)] text-[19px] font-bold text-[color:var(--success)]">
          ✓
        </span>
        <b className="font-display text-[19px] font-bold text-[color:var(--fg)] [text-wrap:balance]">{copy.sentTitle}</b>
        <p className="m-0 max-w-[320px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">
          {signedOut ? copy.sentSignedOut : copy.sentBody}
        </p>
        <button type="button" onClick={onClose} className={`${GHOST} mt-[10px] min-w-[140px]`}>
          {copy.close}
        </button>
      </div>
    );
  }
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (ready && phase === "form") void draft.send();
  };
  return (
    <>
      <form
        onSubmit={submit}
        className={`flex flex-col gap-[14px] text-left ${page ? "" : "px-[16px] pb-[24px] pt-[14px] md:px-[18px] md:pb-[18px] md:pt-[16px]"}`}
      >
        <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">{copy.intro}</p>
        <label className="flex flex-col gap-[6px]">
          <span className="text-[13px] font-semibold leading-[normal] text-[color:var(--fg)]">{copy.what}</span>
          <textarea
            value={draft.what}
            onChange={(e) => draft.setWhat(e.target.value)}
            placeholder={copy.whatPlaceholder}
            maxLength={WHAT_MAX}
            readOnly={phase === "sending"}
            data-testid="report-what"
            className={`${BOX} min-h-[92px]`}
          />
        </label>
        <label className="flex flex-col gap-[6px]">
          <span className="text-[13px] font-semibold leading-[normal] text-[color:var(--fg)]">
            {copy.doing}
            <small className="ml-[6px] text-[12px] font-normal text-[color:var(--fg-faint)]">{copy.optional}</small>
          </span>
          <textarea
            value={draft.doing}
            onChange={(e) => draft.setDoing(e.target.value)}
            placeholder={copy.doingPlaceholder}
            maxLength={DOING_MAX}
            readOnly={phase === "sending"}
            data-testid="report-doing"
            className={`${BOX} min-h-[66px]`}
          />
        </label>
        <p className="m-0 flex items-start gap-[8px] font-mono text-[11px] leading-[1.55] text-[color:var(--fg-faint)]">
          <span aria-hidden className="flex-none">+</span>
          <span>{copy.attach}</span>
        </p>
        {signedOut && (
          <p data-testid="report-anon-retention" className="-mt-1 m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">
            {copy.anonRetention}
          </p>
        )}
        <div className="flex justify-end gap-[10px] pt-[2px]">
          {!page && (
            <button type="button" onClick={onCancel} disabled={phase === "sending"} className={`${GHOST} hidden min-w-[110px] md:flex`}>
              {copy.cancel}
            </button>
          )}
          <button
            type="submit"
            disabled={!ready || phase === "sending"}
            data-testid="report-send"
            className={`${BUTTON} flex-1 border-transparent bg-[color:var(--fg)] font-medium text-[color:var(--bg)] ${page ? "min-w-[110px] md:flex-none" : "md:min-w-[110px] md:flex-none"} ${
              phase === "sending" ? "opacity-75" : !ready ? "opacity-[0.45]" : ""
            }`}
          >
            {phase === "sending" ? copy.sending : copy.send}
          </button>
        </div>
      </form>
      {page && code && (
        <p data-testid="report-code" className="m-0 mt-[10px] font-mono text-[11px] text-[color:var(--fg-faint)]">
          {copy.sentWithCode(code)}
        </p>
      )}
    </>
  );
}
