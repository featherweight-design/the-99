"use client";
// Back from Stripe's Checkout (R1 to R6). A band under the title, above the balance. It CLAIMS nothing the server
// does not know: credits are added by the signed webhook alone, and this only reads, by `readReturnAction`, whether
// the reader's own grant has landed.
//
//   R1 processing: `Adding your 40 credits`, a 2px bar that moves; re-read every FAST_MS for a minute,
//   R4 still processing: after SLOW_AFTER_MS, the honest copy, re-read every SLOW_MS;
//   R2 added: the count and a Receipt link; the band stays until the reader leaves the page;
//   R5 cancelled: one quiet line with a bare ✕ (a separate component, there is nothing to read);
//   R6 a failed re-read: a toast (`onReadFailed`), the band unchanged, and the next re-read tries again.
//
// The re-read stops on unmount, once added, and once the Session reads as none (not the reader's, or not ours). The
// timing and the read are props so a test drives the cadence without a clock or a server.

import { useEffect, useRef, useState } from "react";
import { readReturnAction, type ReturnOutcome } from "../../app/credits/actions";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import type { ReturnRead } from "../../lib/payments/return-rule";
import { ReceiptLink } from "./receipt-link";
import { SupportLink } from "./support-link";

const c = creditsPageCopy.ret;

export type BandTiming = { fastMs: number; slowMs: number; slowAfterMs: number };
export const BAND_TIMING: BandTiming = { fastMs: 2000, slowMs: 10_000, slowAfterMs: 60_000 };

const FRAME = "relative flex items-start gap-[12px] rounded-[12px] border border-solid bg-[color:var(--surface)] px-[16px] py-[14px]";

export function ReturnBand({ sessionId, initial, timing = BAND_TIMING, read = readReturnAction, onAdded, onReadFailed, onReceiptFailed }: {
  sessionId: string;
  /** What the server read at render, or null when it could not. */
  initial: ReturnRead | null;
  timing?: BandTiming;
  read?: (sessionId: string) => Promise<ReturnOutcome>;
  onAdded: (units: number) => void;
  onReadFailed: () => void;
  onReceiptFailed: () => void;
}) {
  const [state, setState] = useState<ReturnRead | null>(initial);
  const [slow, setSlow] = useState(false);
  // The latest callbacks, so the polling effect depends on the Session alone and is never restarted by a render.
  const live = useRef({ read, onAdded, onReadFailed, timing });
  useEffect(() => {
    live.current = { read, onAdded, onReadFailed, timing };
  });
  const settled = state?.kind === "added" || state?.kind === "none";

  useEffect(() => {
    if (settled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const t0 = Date.now();
    const slowTimer = setTimeout(() => setSlow(true), live.current.timing.slowAfterMs);
    const next = () => (Date.now() - t0 >= live.current.timing.slowAfterMs ? live.current.timing.slowMs : live.current.timing.fastMs);
    const tick = async () => {
      let out: ReturnOutcome;
      try {
        out = await live.current.read(sessionId);
      } catch {
        out = { ok: false, reason: "failed" };
      }
      if (stopped) return;
      if (out.ok) {
        setState(out.read);
        if (out.read.kind === "added") {
          live.current.onAdded(out.read.units);
          return;
        }
        if (out.read.kind === "none") return;
      } else {
        live.current.onReadFailed();
      }
      timer = setTimeout(() => void tick(), next());
    };
    // The server's own read stands for one beat; with none to stand on, ask at once.
    timer = setTimeout(() => void tick(), initial ? live.current.timing.fastMs : 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(slowTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the first read is `initial`'s alone, and the loop is keyed on the Session
  }, [sessionId, settled]);

  if (!state || state.kind === "none") return null;
  if (state.kind === "added") {
    return (
      <div role="status" className={`${FRAME} overflow-hidden border-[color:var(--success)]`}>
        <span aria-hidden="true" className="mt-[1px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[color:var(--success)] text-[12px] font-bold text-[color:var(--bg)]">✓</span>
        <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
          <b className="text-[14.5px] font-semibold text-[color:var(--fg)]">{c.addedPack(state.units)}</b>
          <ReceiptLink
            sessionId={sessionId}
            onFailed={onReceiptFailed}
            className="flex min-h-[32px] cursor-pointer items-center gap-[4px] self-start border-0 bg-transparent p-0 text-[13px] text-[color:var(--fg)] pointer-coarse:min-h-[44px]"
          >
            {creditsPageCopy.hist.receipt}<span aria-hidden="true" className="text-[11px]">↗</span>
          </ReceiptLink>
        </div>
      </div>
    );
  }
  return (
    <div role="status" className={`${FRAME} overflow-hidden ${slow ? "border-[color:var(--border-strong)]" : "border-[color:color-mix(in_srgb,var(--accent)_50%,var(--border-strong))]"}`}>
      <span aria-hidden="true" className={`mt-[6px] h-[10px] w-[10px] flex-none rounded-full ${slow ? "bg-[color:var(--fg-muted)]" : "bg-[color:var(--accent)]"}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <b className="text-[14.5px] font-semibold text-[color:var(--fg)]">{slow ? c.slowTitle : c.procTitle(state.units)}</b>
        <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{slow ? <>{c.slowSays.before}<SupportLink ground="raised" />{c.slowSays.after}</> : c.procSays}</p>
      </div>
      {slow ? null : (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-[color:var(--border)]">
          <i className="anim-search-progress block h-full w-[38%] bg-[color:var(--accent)]" />
        </span>
      )}
    </div>
  );
}

/** R5: Checkout was closed on Stripe's page. One quiet line; the page is otherwise as it was. */
export function CancelledBand() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="flex items-center gap-[12px] overflow-hidden rounded-[12px] border border-solid border-[color:var(--border)] py-[4px] pl-[14px] pr-[4px]">
      <p className="m-0 min-w-0 flex-1 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{c.cancelled}</p>
      <button
        type="button"
        aria-label={c.dismiss}
        onClick={() => setOpen(false)}
        className="flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[14px] text-[color:var(--fg-muted)]"
      >
        {"✕"}
      </button>
    </div>
  );
}
