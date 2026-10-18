"use client";
// The invite QR, the sender's side (plan `2026-10-16-invites.md`, Q1 to Q5): path 2's `Show an invite QR`, in the same
// modal with a ‹ back to path 2. Live (Q1), the QR sits on the friend link's light plate inside a ring that drains over
// its 15 minutes, with the time left as m:ss ticking each second from `expiresAt` on the client; under a minute (Q2)
// the ring and the time turn --warning. Claimed (Q3), the plate becomes a card back and `Invitation sent`. Expired (Q4,
// the server says so, by the watch or by the one ask the screen makes when its countdown reaches zero; a live answer
// re-bases the countdown instead), the plate greys
// under an EXPIRED chip, the ring empties, and `Make a new QR` (Q5) runs the action again. The watch
// (`useInviteQrWatch`) polls only while the QR is live; an end redraws the page, so the count moves.

import { useCallback, useEffect, useRef, useState } from "react";
import { inviteCopy } from "../../lib/copy/invites";
import { QR_TTL_MS, type InviteCount } from "../../lib/invites/rules";
import { qrPath } from "../../lib/social/client-rules";
import { InviteCountLine } from "./invite-count-line";
import { FILLED_PRESS } from "./invite-new";
import { readQrState, useInviteQrWatch } from "./use-invite-qr-watch";

const q = inviteCopy.qr;
const TICK_MS = 1000;
const WARN_SECONDS = 60;

export type ShownQr = { token: string; url: string; expiresAt: Date };
export type QrEnd = "claimed" | "expired";

/** m:ss, the timer's form. */
export function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const OUTLINED =
  "flex h-[48px] w-full cursor-pointer items-center justify-center rounded-[8px] bg-transparent px-[16px] font-sans text-[15px] font-medium text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] md:h-[40px] md:w-auto md:rounded-[6px] md:text-[13px]";

export function InviteQr({
  qr,
  count,
  ended,
  onEnded,
  onMakeNew,
  making,
  onDone,
}: {
  qr: ShownQr;
  count: InviteCount;
  /** What the watch or the clock found; null while live. */
  ended: QrEnd | null;
  onEnded: (end: QrEnd) => void;
  onMakeNew: () => void;
  /** Make a new QR is in flight. */
  making: boolean;
  onDone: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const live = ended === null;
  useEffect(() => {
    if (!live) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new QR starts from the clock as it is now
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, [live, qr.token]);
  // The deadline starts at the server's `expiresAt` and is re-based on every live answer's `secondsLeft`, read
  // against this device's clock: a clock that runs ahead (or behind) would otherwise count down to a moment the
  // server does not share. Keyed on the token, so a new QR starts from its own `expiresAt`.
  const [rebased, setRebased] = useState<{ token: string; at: number } | null>(null);
  const deadline = rebased?.token === qr.token ? rebased.at : qr.expiresAt.getTime();
  const secondsLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
  const token = qr.token;
  const onLive = useCallback(
    (left: number) => {
      const at = Date.now() + left * 1000;
      setRebased({ token, at });
      setNow(Date.now());
    },
    [token],
  );
  // The client's clock reaching zero is provisional: only the server ends a QR. The screen asks once at zero and
  // takes a claim or an expiry; a live answer re-bases the countdown (and the watch keeps polling), and a failed ask
  // settles nothing, so the watch's next poll decides.
  const onEndedNow = useRef(onEnded);
  const onLiveNow = useRef(onLive);
  useEffect(() => {
    onEndedNow.current = onEnded;
    onLiveNow.current = onLive;
  }, [onEnded, onLive]);
  const atZero = live && secondsLeft === 0;
  useEffect(() => {
    if (!atZero) return;
    const ask = new AbortController();
    void readQrState(qr.token, ask.signal).then((answer) => {
      if (ask.signal.aborted || !answer) return;
      if (answer.state === "live") onLiveNow.current(answer.secondsLeft);
      else onEndedNow.current(answer.state);
    });
    return () => ask.abort();
  }, [atZero, qr.token]);
  useInviteQrWatch(live ? qr.token : null, onEnded, onLive);

  const warn = live && secondsLeft < WARN_SECONDS;
  const pct = live ? Math.min(100, (secondsLeft * 1000 * 100) / QR_TTL_MS) : 0;
  const colour = warn ? "var(--warning)" : "var(--accent)";
  const path = qrPath(qr.url, 0);

  if (ended === "claimed") {
    return (
      <>
        <InviteCountLine count={count} className="mb-[14px]" />
        <div role="status" className="flex flex-col items-center gap-[8px] rounded-[12px] bg-[color:var(--surface)] px-[18px] py-[22px] text-center [border:1px_solid_var(--border-strong)] md:py-[20px]">
          <InvitationBack />
          <b className="flex items-center gap-[8px] font-display text-[20px] font-bold text-[color:var(--fg)]">
            <i aria-hidden className="not-italic text-[color:var(--success)]">✓</i>
            {inviteCopy.path.sent}
          </b>
          <span className="text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">{q.claimedBody}</span>
        </div>
        <Footer><button type="button" onClick={onDone} className={OUTLINED}>{q.done}</button></Footer>
      </>
    );
  }

  return (
    <>
      <InviteCountLine count={count} thisQr={live} className="mb-[14px]" />
      <figure className="m-0 flex flex-col items-center gap-[10px] md:gap-[8px]">
        <div
          data-qr-ring=""
          data-warn={warn ? "" : undefined}
          className="relative rounded-[15px] p-[5px]"
          style={{ background: `conic-gradient(${colour} 0 ${pct}%, var(--border-strong) ${pct}% 100%)` }}
        >
          {/* Both plates are fixed in every theme, as the board draws them (pr4 table, Plate): #F4F5F8 live, #8E929E
              expired. No theme token carries #8E929E, so it is written as the board's value, like the live plate. */}
          <div className={`rounded-[10px] p-[16px] ${live ? "bg-[#F4F5F8]" : "bg-[#8E929E]"}`}>
            <svg
              role="img"
              aria-label={q.aria}
              viewBox={`0 0 ${path.size} ${path.size}`}
              shapeRendering="crispEdges"
              className={`block h-[203px] w-[203px] md:h-[174px] md:w-[174px] ${live ? "" : "opacity-[.28] grayscale"}`}
            >
              <path d={path.d} className="fill-[color:var(--bg)]" />
            </svg>
          </div>
          {live ? null : (
            <span
              role="img"
              aria-label={q.expiredAria}
              className="absolute left-1/2 top-1/2 flex h-[34px] -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-[color:var(--bg)] px-[16px] font-mono text-[13px] font-semibold tracking-[.08em] text-[color:var(--fg)] [border:1px_solid_var(--border-dashed)] md:h-[32px] md:px-[14px] md:text-[12.5px]"
            >
              {q.expiredChip}
            </span>
          )}
        </div>
        {live ? <figcaption className="font-mono text-[10.5px] text-[color:var(--fg-faint)] max-md:hidden">{q.caption}</figcaption> : null}
      </figure>

      {live ? (
        <div className="mt-[10px] flex flex-col items-center gap-[10px] md:mt-[8px] md:gap-[8px]">
          <p role="timer" aria-live="off" className="m-0 flex items-baseline gap-[6px]">
            <span data-qr-time="" className={`font-mono text-[22px] font-semibold md:text-[20px] ${warn ? "text-[color:var(--warning)]" : "text-[color:var(--fg)]"}`}>
              {mmss(secondsLeft)}
            </span>
            <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">{q.left}</span>
          </p>
          <p className="m-0 text-center font-mono text-[11px] leading-[1.5] text-[color:var(--fg-muted)] max-md:mt-[2px]">{q.meta}</p>
        </div>
      ) : (
        <p className="m-0 mt-[14px] text-center text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">{q.expiredBody}</p>
      )}

      <Footer>
        {live ? (
          <button type="button" onClick={onDone} className={OUTLINED}>{q.done}</button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!making) onMakeNew();
            }}
            aria-disabled={making || undefined}
            className={`${FILLED_PRESS} md:h-[40px] ${making ? "!bg-[color:var(--accent-strong)]" : ""}`}
          >
            {q.makeNew}
          </button>
        )}
      </Footer>
    </>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="mt-[16px] flex md:mt-[14px] md:justify-end">{children}</div>;
}

/** The claimed screen's card back: FriendCard's back face, small, with INVITATION for its word. */
function InvitationBack() {
  return (
    // pr4 table, Card back `.back` (Q3): the pips sit 4px over the 28px "99" in one hero column, 6px over the word.
    <div aria-hidden className="mb-[6px] box-border h-[168px] w-[120px] rotate-[-4deg] rounded-[9px] bg-[color:var(--surface-inset)] p-[6px] shadow-[0_14px_30px_rgba(0,0,0,.55),inset_0_0_0_1px_var(--border-strong)]">
      <div className="flex h-full w-full flex-col items-center justify-center gap-[6px] rounded-[6px] [border:1px_solid_var(--border-dashed)] bg-[color:var(--surface-sunken)] bg-[image:radial-gradient(90px_100px_at_50%_46%,color-mix(in_oklab,var(--accent)_24%,transparent),transparent_72%),repeating-linear-gradient(45deg,rgba(255,255,255,.018)_0_6px,transparent_6px_12px)]">
        <span className="flex flex-col items-center font-display text-[28px] font-bold leading-none text-[color:var(--fg)]">
          <span className="mb-[4px] text-[7px] tracking-[2px] text-[color:var(--accent)]">◆ ◆ ◆</span>
          99
        </span>
        <span className="font-mono text-[7px] uppercase tracking-[.3em] text-[color:var(--accent)]">{q.cardBack}</span>
      </div>
    </div>
  );
}
