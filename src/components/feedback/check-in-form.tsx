"use client";

import { captureClientError } from "../../lib/sentry/capture-client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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
import { FriendCard, MiniCardBack } from "../social/friend-card";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { SteadyLabel } from "../ui/steady-label";

// The check-in sheet (flyer trial PR 6; handoff Survey-Phone S1 to S4, Survey-Desktop S5 and S6): `ModalChrome` at 560
// on desktop, its sheet on the phone. A 1 to 5 rating (Send needs it), pick-any uses, one answer for the pod, a free
// note. Not now snoozes; the ✕, Escape and the scrim end it. Sent replaces the form with the thanks. A failed send is
// the shared toast with Try again, the answers kept (S4). The hint is the desktop's alone.
//
// Check-in R2 (addendum `addendum-checkin-r2`, Hugh 2026-11-15): the rating is a hand of five cards with a word each,
// the picked one lifted and crowned; chips pop as they turn on; a small card back sits by the intro and, on send, the
// compact `FriendCard` rises and turns face up as the thanks. Rated 3 to 5 it bursts six crown diamonds; 1 or 2 it is
// told straight, no burst. Sending reads Sending… with the answers dimmed. Every animation is a named class in
// `globals.css` with its reduced-motion entry.

const BOX =
  "w-full resize-none rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] py-[10px] text-[16px] leading-[1.45] text-[color:var(--fg)] placeholder:text-[color:var(--fg-locked)] focus:border-[color:var(--accent)] focus:outline-none [@media(pointer:fine)]:text-[15px]";
const BUTTON =
  "flex h-[44px] items-center justify-center whitespace-nowrap rounded-[10px] border border-solid px-[16px] text-[14px] md:h-[32px] md:rounded-[8px] md:px-[14px] md:text-[12.5px]";
const GHOST = `${BUTTON} border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg)]`;
// The hand's fan (Checkin-Spec): each card tilted from its bottom centre, the outer two dropped a little further.
const FAN = ["rotate-[-6deg] translate-y-[5px]", "rotate-[-3deg] translate-y-[1px]", "", "rotate-[3deg] translate-y-[1px]", "rotate-[6deg] translate-y-[5px]"];
// The burst (rated 3 to 5): six diamonds from the card's centre, each to its own point, size in px.
const BURST: readonly (readonly [number, number, number])[] = [
  [-92, -80, 12],
  [-110, 6, 8],
  [-80, 90, 10],
  [88, -92, 9],
  [110, -10, 12],
  [78, 84, 8],
];
const ON_CHIP = "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_12%,var(--surface-raised))] text-[color:var(--fg)]";
const OFF = "border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]";
// Sending (A3/D3): the answers dim to .6 while every control is held.
const DIM = (phase: string) => `motion-safe:transition-opacity motion-safe:duration-150 ${phase === "sending" ? "opacity-60" : ""}`;

/**
 * `preview` is the admin's look at the check-in (Show me the check-in): the form runs its own phases and calls neither action,
 * so nothing reaches `check_in_state` or the feedback table, as an answer or as a snooze.
 */
export function CheckInForm({ onClose, preview = false }: { onClose: () => void; preview?: boolean }) {
  const [rating, setRating] = useState<number | null>(null);
  const [uses, setUses] = useState<CheckInUse[]>([]);
  const [pod, setPod] = useState<CheckInPod | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  // The rating that was sent picks the thanks (README call 4); held apart so a later state change cannot move it.
  const [sentRating, setSentRating] = useState<number | null>(null);
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
    let limited = false;
    try {
      if (preview) {
        ok = true;
      } else {
        const result = await sendCheckIn({ rating, uses, pod, note });
        ok = result.ok;
        limited = !result.ok && result.reason === "limited";
      }
    } catch (e) {
      captureClientError("feedback.check-in", e);
      ok = false;
    }
    busy.current = false;
    if (ok) {
      setSentRating(rating);
      setPhase("sent");
      return;
    }
    setPhase("form");
    // Over the allowance there is no Try again: it would retry straight into the same limit, against "Try again later".
    setToast(limited
      ? { id: ++toastId.current, text: copy.failedLimited }
      : { id: ++toastId.current, text: copy.failed, retry: { label: reportCopy.retry, run: () => void send() } });
  }

  // Not now and the ✕ close at once; the write follows and a failure of it changes nothing the reader sees.
  function leave(how: "snooze" | "end") {
    if (phase === "sending") return;
    if (phase !== "sent" && !preview) void dismissCheckIn(how).catch((e) => captureClientError("feedback.check-in-dismiss", e));
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
        {/* A polite region that exists before the swap and holds only the thanks, so the thanks is announced as it
            replaces the form (READINESS clarification 3); focus moves to its heading too. */}
        <div aria-live="polite">
          {phase === "sent" && <CheckInThanks key={sentRating} high={(sentRating ?? 0) >= 3} onClose={() => leave("end")} />}
        </div>
        {phase === "sent" ? null : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (ready && phase === "form") void send();
            }}
            className="flex flex-col gap-[18px] px-[16px] pb-[24px] pt-[14px] text-left md:px-[18px] md:pb-[18px] md:pt-[16px]"
          >
            <div className="flex items-center gap-[14px]">
              <MiniCardBack />
              <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">{copy.intro}</p>
            </div>

            <div className="flex flex-col gap-[9px]">
              <span id="check-in-rating" className="text-[14px] font-semibold leading-[normal] text-[color:var(--fg)]">{copy.rating}</span>
              <Hand
                rating={rating}
                disabled={phase === "sending"}
                onPick={(n) => {
                  setRating(n);
                  setToast(null);
                }}
              />
            </div>

            <div className="flex flex-col gap-[9px]" role="group" aria-labelledby="check-in-uses">
              <span id="check-in-uses" className="text-[14px] font-semibold leading-[normal] text-[color:var(--fg)]">
                {copy.uses}
                <small className="ml-[6px] text-[12px] font-normal text-[color:var(--fg-faint)]">{copy.pickAny}</small>
              </span>
              <div className={`grid grid-cols-3 gap-[8px] ${DIM(phase)}`}>
                {CHECK_IN_USES.map((use, i) => (
                  <Chip key={use} label={copy.useOptions[i]} on={uses.includes(use)} disabled={phase === "sending"} onPress={() => toggleUse(use)} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[9px]" role="group" aria-labelledby="check-in-pod">
              <span id="check-in-pod" className="text-[14px] font-semibold leading-[normal] text-[color:var(--fg)]">{copy.pod}</span>
              <div className={`grid grid-cols-3 gap-[8px] ${DIM(phase)}`}>
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
                className={`${BOX} min-h-[66px] ${DIM(phase)}`}
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
                <SteadyLabel hold={[reportCopy.sending, copy.send]}>{phase === "sending" ? reportCopy.sending : copy.send}</SteadyLabel>
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
      className={`flex h-[40px] items-center justify-center gap-[6px] whitespace-nowrap rounded-full border border-solid px-[6px] text-[13.5px] md:h-[34px] ${on ? `${ON_CHIP} anim-chip-pop` : OFF}`}
    >
      {on && <span aria-hidden className="text-[12px] font-bold text-[color:var(--accent-text)]">✓</span>}
      {label}
    </button>
  );
}

/**
 * The rating as a hand of five cards (README call 1): a radiogroup with one tab stop (the checked card, or the first
 * when none), arrows moving AND checking, wrapping (READINESS clarification 3). The picked card lifts, straightens,
 * takes the accent wash and wears the crown. Phone: five equal columns at 63:88. Desktop: 70×98, centred, and a hovered
 * card rises halfway (pointer only).
 */
function Hand({ rating, disabled, onPick }: { rating: number | null; disabled: boolean; onPick: (n: number) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const stop = rating ?? 1;
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, n: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = ((n - 1 + step + 5) % 5) + 1;
    onPick(next);
    refs.current[next - 1]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-labelledby="check-in-rating"
      data-check-in-hand
      className={`grid grid-cols-5 gap-[6px] pt-[12px] md:flex md:justify-center md:gap-[12px] ${DIM(disabled ? "sending" : "form")}`}
    >
      {[1, 2, 3, 4, 5].map((n, i) => {
        const on = rating === n;
        const word = copy.ratingWords[i];
        return (
          <button
            key={n}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={copy.ratingAria(n, word)}
            tabIndex={n === stop ? 0 : -1}
            disabled={disabled}
            onClick={() => onPick(n)}
            onKeyDown={(e) => onKey(e, n)}
            data-testid={`check-in-rating-${n}`}
            className={`check-in-card relative flex aspect-[63/88] min-w-0 origin-bottom flex-col items-center justify-center gap-[5px] rounded-[8px] border border-solid p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:aspect-auto md:h-[98px] md:w-[70px] md:flex-none md:gap-[6px] ${
              on
                ? "-translate-y-[10px] border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_16%,var(--surface-raised))] text-[color:var(--fg)] shadow-[0_12px_22px_rgba(0,0,0,.5)]"
                : `border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] text-[color:var(--fg)] ${FAN[i]}`
            }`}
          >
            <span
              aria-hidden
              className={`check-in-crown absolute top-[9px] text-[7px] leading-none tracking-[2px] text-[color:var(--accent-text)] md:top-[10px] md:text-[7.5px] ${on ? "opacity-100" : "translate-y-[4px] opacity-0"}`}
            >
              ◆◆◆
            </span>
            <b aria-hidden className="font-display text-[22px] font-bold leading-none md:text-[24px]">
              {n}
            </b>
            <span aria-hidden className={`text-[11.5px] leading-none md:text-[12px] ${on ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"}`}>
              {word}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The thanks (README calls 3 and 4): the compact `FriendCard`, mounted face down and turned up on the next frame with
 * its arrival beat, rising into place as the form goes; the heading, body and Close fade in as it lands. Rated 3 to 5
 * the six diamonds burst from it once and are removed after 1.5s. Focus moves to the heading.
 */
function CheckInThanks({ high, onClose }: { high: boolean; onClose: () => void }) {
  const [up, setUp] = useState(false);
  const [burstDone, setBurstDone] = useState(false);
  const burst = high && !burstDone;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    // Two frames, as the friend landing does: the card paints face down once before it turns.
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setUp(true));
    });
    const gone = window.setTimeout(() => setBurstDone(true), 1500);
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
      window.clearTimeout(gone);
    };
  }, []);
  const card = copy.card;
  return (
    <div className="anim-check-in-thanks flex flex-col items-center gap-[8px] px-[24px] pb-[34px] pt-[30px] text-center md:pb-[32px]" data-testid="check-in-sent">
      <div className="relative flex h-[236px] w-[240px] items-center justify-center md:w-[260px]">
        <div className="anim-check-in-rise">
          <FriendCard
            compact
            up={up}
            arrival
            word={card.name}
            face={{ name: card.name, commander: null, type: card.type, rules: card.rules, crown: { credit: card.credit, mark: card.mark }, aria: card.aria }}
          />
        </div>
        {burst &&
          BURST.map(([dx, dy, size], i) => (
            <span
              key={i}
              aria-hidden
              data-check-in-burst
              className="anim-check-in-burst pointer-events-none absolute left-1/2 top-1/2 leading-none text-[color:var(--accent-text)]"
              style={{ fontSize: size, ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px` }}
            >
              ◆
            </span>
          ))}
      </div>
      <h3
        ref={heading}
        tabIndex={-1}
        className="anim-check-in-late m-0 mt-[12px] font-display text-[20px] font-bold text-[color:var(--fg)] outline-none [text-wrap:balance] md:text-[21px]"
      >
        {high ? copy.sentTitle : copy.sentTitleLow}
      </h3>
      <p className="anim-check-in-late m-0 max-w-[320px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty] md:max-w-[360px]">
        {high ? copy.sentBody : copy.sentBodyLow}
      </p>
      <button type="button" onClick={onClose} className={`${GHOST} anim-check-in-late mt-[10px] min-w-[140px] flex-none`}>
        {reportCopy.close}
      </button>
    </div>
  );
}
