"use client";

import { useRef, useState, type FormEvent } from "react";
import { sendProblemReport } from "../../app/feedback-actions";
import { reportCopy as copy } from "../../lib/copy/report";
import { DOING_MAX, WHAT_MAX, type ReportSource } from "../../lib/feedback/report-rule";
import { ModalChrome } from "../decks/receipt-modal";
import { SocialToast, type SocialToastState } from "../social/social-toast";

// The Report a problem form (flyer trial PR 5; handoff Report-Phone R3 to R6, Report-Desktop D3 and D4): `ModalChrome` at 520
// on desktop, its sheet on the phone. "What happened?" is required and Send stays dim until it has text; "What were you
// doing?" is optional; one static line says what is attached (the page, the device and the error code are added by the
// action, not typed). Sending holds the press and the dialog cannot close mid-send. Sent replaces the form with the thanks.
// A failed send is the shared toast with Try again, the typed text kept.

const BOX =
  "w-full resize-none rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] py-[10px] text-[16px] leading-[1.45] text-[color:var(--fg)] placeholder:text-[color:var(--fg-locked)] focus:border-[color:var(--accent)] focus:outline-none [@media(pointer:fine)]:text-[15px]";
const BUTTON =
  "flex h-[44px] items-center justify-center whitespace-nowrap rounded-[10px] border border-solid px-[16px] text-[14px] md:h-[32px] md:rounded-[8px] md:px-[14px] md:text-[12.5px]";
const GHOST = `${BUTTON} border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg)]`;

export function ReportForm({
  source,
  digest,
  eventId,
  onClose,
}: {
  source: ReportSource;
  /** The boundary's digest, when a server error carried one. */
  digest?: string | null;
  /** The Sentry event id of a browser-side throw. */
  eventId?: string | null;
  onClose: () => void;
}) {
  const [what, setWhat] = useState("");
  const [doing, setDoing] = useState("");
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastId = useRef(0);
  const busy = useRef(false);
  const ready = what.trim().length > 0 && what.length <= WHAT_MAX && doing.length <= DOING_MAX;

  async function send() {
    if (busy.current) return;
    busy.current = true;
    setToast(null);
    setPhase("sending");
    let ok = false;
    try {
      const result = await sendProblemReport({
        what,
        doing,
        page: window.location.pathname,
        source,
        digest: digest ?? null,
        sentryEventId: eventId ?? null,
      });
      ok = result.ok;
    } catch {
      ok = false;
    }
    busy.current = false;
    if (ok) {
      setPhase("sent");
      return;
    }
    setPhase("form");
    setToast({ id: ++toastId.current, text: copy.failed, retry: { label: copy.retry, run: () => void send() } });
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ready && phase === "form") void send();
  }

  // Sending holds the dialog open: Escape, the scrim and the ✕ all come here.
  const close = () => {
    if (phase !== "sending") onClose();
  };

  return (
    <>
      <ModalChrome
        title={copy.title}
        closeLabel={copy.close}
        onClose={close}
        width={520}
        fit
        titleClassName="!font-sans !font-semibold text-[15px] leading-tight md:text-[16px] md:leading-[17px]"
      >
        {phase === "sent" ? (
          <div className="flex flex-col items-center gap-[8px] px-[24px] pb-[24px] pt-[26px] text-center md:px-[18px] md:pb-[18px]" data-testid="report-sent">
            <span aria-hidden className="flex h-[44px] w-[44px] items-center justify-center rounded-full border-[1.5px] border-solid border-[color:var(--success)] text-[19px] font-bold text-[color:var(--success)]">
              ✓
            </span>
            <b className="font-display text-[19px] font-bold text-[color:var(--fg)] [text-wrap:balance]">{copy.sentTitle}</b>
            <p className="m-0 max-w-[320px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">{copy.sentBody}</p>
            <button type="button" onClick={onClose} className={`${GHOST} mt-[10px] min-w-[140px]`}>
              {copy.close}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-[14px] px-[16px] pb-[24px] pt-[14px] md:px-[18px] md:pb-[18px] md:pt-[16px]">
            <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">{copy.intro}</p>
            <label className="flex flex-col gap-[6px]">
              <span className="text-[13px] font-semibold text-[color:var(--fg)]">{copy.what}</span>
              <textarea
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                placeholder={copy.whatPlaceholder}
                maxLength={WHAT_MAX}
                readOnly={phase === "sending"}
                data-testid="report-what"
                className={`${BOX} min-h-[92px]`}
              />
            </label>
            <label className="flex flex-col gap-[6px]">
              <span className="text-[13px] font-semibold text-[color:var(--fg)]">
                {copy.doing}
                <small className="ml-[6px] text-[12px] font-normal text-[color:var(--fg-faint)]">{copy.optional}</small>
              </span>
              <textarea
                value={doing}
                onChange={(e) => setDoing(e.target.value)}
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
            <div className="flex justify-end gap-[10px] pt-[2px]">
              <button type="button" onClick={close} disabled={phase === "sending"} className={`${GHOST} hidden min-w-[110px] md:flex`}>
                {copy.cancel}
              </button>
              <button
                type="submit"
                disabled={!ready || phase === "sending"}
                data-testid="report-send"
                className={`${BUTTON} flex-1 border-transparent bg-[color:var(--fg)] font-medium text-[color:var(--bg)] md:min-w-[110px] md:flex-none ${
                  phase === "sending" ? "opacity-75" : !ready ? "opacity-[0.45]" : ""
                }`}
              >
                {phase === "sending" ? copy.sending : copy.send}
              </button>
            </div>
          </form>
        )}
      </ModalChrome>
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}
