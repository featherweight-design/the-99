"use client";

import { useEffect, useRef, useState } from "react";
import { dismissCheckIn, sendCheckIn } from "../../app/check-in-actions";
import { checkInCopy as copy, reportCopy } from "../../lib/copy/report";
import {
  CHECK_IN_PODS,
  CHECK_IN_USES,
  NOTE_MAX,
  type CheckInPod,
  type CheckInUse,
} from "../../lib/feedback/check-in-rule";
import { ModalChrome } from "../decks/receipt-modal";
import { SocialToast, type SocialToastState } from "../social/social-toast";

// The check-in sheet (flyer trial PR 6; handoff Survey-Phone S1 to S4, Survey-Desktop S5 and S6): `ModalChrome` at 560
// on desktop, its sheet on the phone. A 1 to 5 rating (Send needs it), pick-any uses, one answer for the pod, a free
// note. Not now snoozes; the ✕, Escape and the scrim end it. Sent replaces the form with the thanks. A failed send is
// the shared toast with Try again, the answers kept (S4). The hint "Takes a minute" is the desktop's alone.

const BOX =
  "w-full resize-none rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] py-[10px] text-[16px] leading-[1.45] text-[color:var(--fg)] placeholder:text-[color:var(--fg-locked)] focus:border-[color:var(--accent)] focus:outline-none [@media(pointer:fine)]:text-[15px]";
const BUTTON =
  "flex h-[44px] items-center justify-center whitespace-nowrap rounded-[10px] border border-solid px-[16px] text-[14px] md:h-[32px] md:rounded-[8px] md:px-[14px] md:text-[12.5px]";
const GHOST = `${BUTTON} border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg)]`;
const ON_SCALE = "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_16%,var(--surface-raised))] text-[color:var(--fg)]";
const ON_CHIP = "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_12%,var(--surface-raised))] text-[color:var(--fg)]";
const OFF = "border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]";

export function CheckInForm({ onClose }: { onClose: () => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [uses, setUses] = useState<CheckInUse[]>([]);
  const [pod, setPod] = useState<CheckInPod | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastId = useRef(0);
  const busy = useRef(false);
  const ready = rating !== null && note.trim().length <= NOTE_MAX;

  // The failed toast's Try again outlives the render that drew it, so a send reads the answers as they are NOW.
  const latest = useRef({ rating, uses, pod, note, ready });
  useEffect(() => {
    latest.current = { rating, uses, pod, note, ready };
  });

  async function send() {
    if (busy.current || !latest.current.ready) return;
    const { rating, uses, pod, note } = latest.current;
    busy.current = true;
    setToast(null);
    setPhase("sending");
    let ok = false;
    try {
      ok = (await sendCheckIn({ rating, uses, pod, note })).ok;
    } catch {
      ok = false;
    }
    busy.current = false;
    if (ok) {
      setPhase("sent");
      return;
    }
    setPhase("form");
    setToast({ id: ++toastId.current, text: copy.failed, retry: { label: reportCopy.retry, run: () => void send() } });
  }

  // Not now and the ✕ close at once; the write follows and a failure of it changes nothing the reader sees.
  function leave(how: "snooze" | "end") {
    if (phase === "sending") return;
    if (phase !== "sent") void dismissCheckIn(how).catch(() => {});
    onClose();
  }

  function toggleUse(use: CheckInUse) {
    setToast(null);
    setUses((now) => (now.includes(use) ? now.filter((u) => u !== use) : [...now, use]));
  }

  return (
    <>
      <ModalChrome
        title={copy.title}
        closeLabel={reportCopy.close}
        onClose={() => leave("end")}
        width={560}
        fit
        titleClassName="!font-sans !font-semibold text-[15px] leading-tight md:text-[16px] md:leading-[17px]"
      >
        {phase === "sent" ? (
          <div className="flex flex-col items-center gap-[8px] px-[24px] pb-[42px] pt-[42px] text-center md:px-[18px] md:pb-[36px]" data-testid="check-in-sent">
            <span aria-hidden className="flex h-[44px] w-[44px] items-center justify-center rounded-full border-[1.5px] border-solid border-[color:var(--success)] text-[19px] font-bold text-[color:var(--success)]">
              ✓
            </span>
            <b className="font-display text-[19px] font-bold text-[color:var(--fg)] [text-wrap:balance]">{copy.sentTitle}</b>
            <p className="m-0 max-w-[320px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">{copy.sentBody}</p>
            <button type="button" onClick={() => leave("end")} className={`${GHOST} mt-[10px] min-w-[140px]`}>
              {reportCopy.close}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (ready && phase === "form") void send();
            }}
            className="flex flex-col gap-[18px] px-[16px] pb-[24px] pt-[14px] text-left md:px-[18px] md:pb-[18px] md:pt-[16px]"
          >
            <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">{copy.intro}</p>

            <div className="flex flex-col gap-[9px]" role="group" aria-labelledby="check-in-rating">
              <span id="check-in-rating" className="text-[14px] font-semibold leading-[normal] text-[color:var(--fg)]">{copy.rating}</span>
              <div className="grid grid-cols-5 gap-[6px]" role="radiogroup" aria-labelledby="check-in-rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    disabled={phase === "sending"}
                    onClick={() => {
                      setRating(n);
                      setToast(null);
                    }}
                    data-testid={`check-in-rating-${n}`}
                    className={`flex h-[44px] items-center justify-center rounded-[8px] border border-solid font-mono text-[15px] font-medium md:h-[40px] ${rating === n ? ON_SCALE : OFF}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between font-mono text-[11px] text-[color:var(--fg-faint)]">
                <span>{copy.ratingEnds[0]}</span>
                <span>{copy.ratingEnds[1]}</span>
              </div>
            </div>

            <div className="flex flex-col gap-[9px]" role="group" aria-labelledby="check-in-uses">
              <span id="check-in-uses" className="text-[14px] font-semibold leading-[normal] text-[color:var(--fg)]">
                {copy.uses}
                <small className="ml-[6px] text-[12px] font-normal text-[color:var(--fg-faint)]">{copy.pickAny}</small>
              </span>
              <div className="grid grid-cols-3 gap-[8px]">
                {CHECK_IN_USES.map((use, i) => (
                  <Chip key={use} label={copy.useOptions[i]} on={uses.includes(use)} disabled={phase === "sending"} onPress={() => toggleUse(use)} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[9px]" role="group" aria-labelledby="check-in-pod">
              <span id="check-in-pod" className="text-[14px] font-semibold leading-[normal] text-[color:var(--fg)]">{copy.pod}</span>
              <div className="grid grid-cols-3 gap-[8px]">
                {CHECK_IN_PODS.map((answer, i) => (
                  <Chip
                    key={answer}
                    label={copy.podOptions[i]}
                    on={pod === answer}
                    disabled={phase === "sending"}
                    onPress={() => {
                      setToast(null);
                      setPod((now) => (now === answer ? null : answer));
                    }}
                  />
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-[6px]">
              <span className="text-[13px] font-semibold leading-[normal] text-[color:var(--fg)]">
                {copy.more}
                <small className="ml-[6px] text-[12px] font-normal text-[color:var(--fg-faint)]">{reportCopy.optional}</small>
              </span>
              <textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setToast(null);
                }}
                placeholder={copy.morePlaceholder}
                readOnly={phase === "sending"}
                data-testid="check-in-note"
                className={`${BOX} min-h-[66px]`}
              />
            </label>

            <div className="flex items-center gap-[10px] pt-[2px]">
              <small className="hidden flex-1 font-mono text-[11px] text-[color:var(--fg-faint)] md:block">{copy.hint}</small>
              <button
                type="button"
                onClick={() => leave("snooze")}
                disabled={phase === "sending"}
                data-testid="check-in-not-now"
                className={`${GHOST} flex-1 md:min-w-[110px] md:flex-none`}
              >
                {copy.notNow}
              </button>
              <button
                type="submit"
                disabled={!ready || phase === "sending"}
                data-testid="check-in-send"
                className={`${BUTTON} flex-1 border-transparent bg-[color:var(--fg)] font-medium text-[color:var(--bg)] md:min-w-[110px] md:flex-none ${
                  phase === "sending" ? "opacity-75" : !ready ? "opacity-[0.45]" : ""
                }`}
              >
                {copy.send}
              </button>
            </div>
          </form>
        )}
      </ModalChrome>
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

function Chip({ label, on, disabled, onPress }: { label: string; on: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onPress}
      className={`flex h-[40px] items-center justify-center gap-[6px] whitespace-nowrap rounded-full border border-solid px-[6px] text-[13.5px] md:h-[34px] ${on ? ON_CHIP : OFF}`}
    >
      {on && <span aria-hidden className="text-[12px] font-bold text-[color:var(--accent-text)]">✓</span>}
      {label}
    </button>
  );
}
