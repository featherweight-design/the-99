"use client";
// The plan card on /credits (buying credits U3b, frames K1 to K6). The state is the server's (`planCardFacts` through
// `buildCreditsModel`); this draws it and holds what a press changes: the pending wait after a cancel or a keep, the
// busy flags, and whether the card page is on offer at all.
//
//   K1/K6 offer      the four fine-print lines BEFORE `Subscribe`, then Checkout on Stripe
//   K2 active        Cancel plan (neutral, full size, first), what it does under it, Update card
//   K3 cancelled     `Ends <date>`, the expiry restated, Keep my plan
//   K4 ending        K3 with its border and its words in `--warning` (the words carry it, never the colour alone)
//   K5 past due      payment failed, credits still work: Update card leads, Cancel plan is a text button
//
// Cancel and Keep write Stripe, and only the signed webhook writes OUR row, so the card does not turn on a press: it
// waits (a status line, the presses held, no spinner) and re-reads the page until the new state arrives, bounded by
// `PLAN_TIMING`; past the bound it says so. The re-read is the page's own `router.refresh()`, stopped on unmount.
// `reduced` (payments off for the reader) takes away the two purchases, Subscribe and Keep my plan, and keeps
// Cancel plan and Update card.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buyPlanAction, cancelPlanAction, keepPlanAction, manageCardAction } from "../../app/credits/actions";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import type { PlanCardModel } from "../../lib/payments/page-model";
import { cardPresses, reachedChange, type PlanChange } from "../../lib/payments/plan-card-rule";
import type { BuyFailure } from "./pack-offers";
import { OfferArt } from "./offer-art";

const c = creditsPageCopy;

export type PlanTiming = { intervalMs: number; maxTries: number };
export const PLAN_TIMING: PlanTiming = { intervalMs: 1500, maxTries: 20 };

const CARD = "relative flex flex-col gap-[12px] overflow-hidden rounded-[14px] border border-solid bg-[color:var(--surface)] p-[16px] md:px-[22px] md:py-[20px]";
const BORDER = {
  plain: "border-[color:var(--border-strong)]",
  on: "border-[color:color-mix(in_srgb,var(--accent)_55%,var(--border-strong))]",
  warn: "border-[color:color-mix(in_srgb,var(--warning)_60%,var(--border-strong))]",
} as const;
const BTN = "flex h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-[8px] px-[20px] text-[14px] font-semibold disabled:cursor-default disabled:opacity-70 md:h-[40px] md:self-start pointer-coarse:h-[44px]";
const FILLED = `${BTN} border-0 bg-[color:var(--accent)] text-[color:var(--bg)]`;
const OUTLINE = `${BTN} border border-solid border-[color:var(--accent)] bg-transparent text-[color:var(--accent)]`;
const NEUTRAL = `${BTN} border border-solid border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg)]`;
const TEXT = "inline-flex min-h-[44px] cursor-pointer items-center gap-[6px] self-start border-0 bg-transparent p-0 text-[13.5px] font-semibold disabled:cursor-default disabled:opacity-70 md:min-h-[32px] pointer-coarse:min-h-[44px]";
const SAYS = "m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]";

export function PlanCard({ plan, reduced = false, timing = PLAN_TIMING, onToast, onFailure }: {
  plan: PlanCardModel;
  /** Payments are off for this reader: no Subscribe, no Keep my plan (plan O2, O3). */
  reduced?: boolean;
  timing?: PlanTiming;
  onToast: (text: string) => void;
  /** Subscribe answered `off` or `blocked`: the page's shared Buy handler, so the offer leaves and a pause raises its band. */
  onFailure?: (reason: BuyFailure) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PlanChange | null>(null);
  const [busy, setBusy] = useState<"cancel" | "keep" | "subscribe" | "card" | null>(null);
  const [cardHidden, setCardHidden] = useState(false);
  const live = useRef({ refresh: () => router.refresh(), onToast, timing });
  useEffect(() => {
    live.current = { refresh: () => router.refresh(), onToast, timing };
  });
  // Back from Stripe's page can restore this page as it was left, a press still busy: a persisted pageshow gives it back.
  useEffect(() => {
    const restored = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  const waiting = pending !== null && !reachedChange(pending, plan.state, plan.cancelling);
  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      if (tries > live.current.timing.maxTries) {
        clearInterval(id);
        setPending(null);
        live.current.onToast(c.plan.slow);
        return;
      }
      live.current.refresh();
    }, live.current.timing.intervalMs);
    return () => clearInterval(id);
  }, [waiting]);

  const p = c.plan;
  const { state, offer, on, credits } = plan;
  const presses = cardPresses(state, reduced, plan.cancelling);
  const price = offer.price;

  async function change(kind: PlanChange) {
    if (busy || waiting) return;
    setBusy(kind);
    try {
      const out = await (kind === "cancel" ? cancelPlanAction() : keepPlanAction());
      if (out.ok) {
        if (out.unchanged) onToast(kind === "cancel" ? p.outcome.alreadyCancelled : p.outcome.alreadyKept);
        setPending(kind);
        router.refresh();
      } else if (kind === "keep" && (out.reason === "off" || out.reason === "blocked") && onFailure) {
        // Keep is a purchase: its off and blocked answers are the page's shared Buy handler, as Subscribe's are.
        onFailure(out.reason);
      } else {
        onToast(p.outcome[out.reason]);
      }
    } catch {
      onToast(p.outcome.failed);
    } finally {
      setBusy(null);
    }
  }

  async function subscribe() {
    if (busy) return;
    setBusy("subscribe");
    let sent = false;
    try {
      // A fresh id per PRESS: a double-tap is held by `busy`, and a retry after a failure is a new press.
      const out = await buyPlanAction(offer.id, crypto.randomUUID());
      if (out.ok) {
        sent = true;
        window.location.assign(out.url);
      } else if ((out.reason === "off" || out.reason === "blocked") && onFailure) {
        onFailure(out.reason);
      } else {
        onToast(c.buy[out.reason]);
      }
    } catch {
      onToast(c.buy.failed);
    } finally {
      if (!sent) setBusy(null);
    }
  }

  async function updateCard() {
    if (busy) return;
    setBusy("card");
    let sent = false;
    try {
      const out = await manageCardAction();
      if (out.ok) {
        sent = true;
        window.location.assign(out.url);
      } else if (out.reason === "unconfigured") {
        // No portal here: the press is taken away rather than left to fail again.
        setCardHidden(true);
        onToast(p.outcome.unconfigured);
      } else {
        onToast(out.reason === "failed" ? p.outcome.cardFailed : p.outcome[out.reason]);
      }
    } catch {
      onToast(p.outcome.cardFailed);
    } finally {
      if (!sent) setBusy(null);
    }
  }

  const held = busy !== null || waiting;
  const cancelling = state === "cancelled" || state === "ending";
  // Set to end, whatever the state: past due and cancelling shows the scheduled expiry as well as the payment warning.
  const scheduled = plan.cancelling && state !== "offer";
  const border = state === "ending" || state === "pastDue" ? BORDER.warn : state === "offer" ? BORDER.plain : cancelling ? BORDER.plain : BORDER.on;
  const warnText = "text-[color:var(--warning)]";
  const liveText = waiting || pending === null ? "" : pending === "cancel" ? p.cancelledLive(credits, on) : p.keptLive(on);

  const updateButton = presses.updateCard && !cardHidden ? (
    <button type="button" onClick={() => void updateCard()} disabled={held} aria-busy={busy === "card" || undefined}
      className={state === "pastDue" ? FILLED : `${TEXT} text-[color:var(--accent)]`}>
      {p.updateCard}<span aria-hidden="true" className={`text-[11px] ${state === "pastDue" ? "ml-[6px]" : ""}`}>↗</span>
    </button>
  ) : null;
  const cancelButton = presses.cancel ? (
    <button type="button" onClick={() => void change("cancel")} disabled={held} aria-busy={busy === "cancel" || (waiting && pending === "cancel") || undefined}
      className={state === "pastDue" ? `${TEXT} md:self-center text-[color:var(--fg-body)]` : `${NEUTRAL} ring-2 ring-[color:color-mix(in_srgb,var(--accent)_35%,transparent)]`}>
      {p.cancel}
    </button>
  ) : null;

  const card = (
    <div className={`${CARD} ${border} ${state === "offer" ? "" : "flex-1"}`} data-plan-state={state}>
      <div className="flex items-start gap-[14px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{p.k}</span>
          <h3 className="m-0 font-display text-[19px] font-bold text-[color:var(--fg)]">{p.title(offer.units)}</h3>
          {state === "offer" ? <span className="font-mono text-[13px] font-semibold text-[color:var(--fg)]">{p.price(price)}</span> : null}
          {state === "active" ? (
            <>
              <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">{p.active(on, price)}</span>
              <span className="font-mono text-[12px] text-[color:var(--fg)]">{p.activeLeft(credits)}</span>
            </>
          ) : null}
          {cancelling ? <span className={`font-mono text-[12px] ${state === "ending" ? warnText : "text-[color:var(--fg-muted)]"}`}>{p.ended(on)}</span> : null}
          {state === "pastDue" ? <span className={`font-mono text-[12px] ${warnText}`}>{p.dueTitle}</span> : null}
        </div>
        <span className={cancelling ? "opacity-45 saturate-[.3]" : undefined}><OfferArt count={offer.units} /></span>
      </div>

      {state === "offer" ? (
        <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
          {p.fine.map((line) => (
            <li key={line} className="flex gap-[9px] text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] before:mt-[7px] before:h-[5px] before:w-[5px] before:flex-none before:rotate-45 before:bg-[color:var(--accent)] before:content-['']">{line}</li>
          ))}
        </ul>
      ) : null}
      {state === "pastDue" ? <p className={SAYS}>{p.dueSays(credits)}</p> : null}
      {state === "pastDue" && scheduled ? <p className={`${SAYS} text-[color:var(--fg-body)]`}>{p.dueEndsSays(credits, on)}</p> : null}
      {cancelling ? <p className={`${SAYS} ${state === "ending" ? warnText : "text-[color:var(--fg-body)]"}`}>{state === "ending" ? p.soon(credits, plan.days ?? 0, on) : p.endedSays(credits, on)}</p> : null}

      {presses.subscribe ? (
        <div className="mt-auto flex flex-col gap-[8px] md:flex-row md:items-center md:gap-[16px]">
          <button type="button" onClick={() => void subscribe()} disabled={busy !== null} aria-busy={busy === "subscribe" || undefined} className={FILLED}>{p.subscribe(price)}</button>
          <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{p.via}</span>
        </div>
      ) : null}
      {presses.keep && state !== "pastDue" ? (
        <>
          <button type="button" onClick={() => void change("keep")} disabled={held} aria-busy={busy === "keep" || (waiting && pending === "keep") || undefined} className={OUTLINE}>{p.keep}</button>
          <p className={SAYS}>{p.keepSays(on)}</p>
        </>
      ) : null}
      {state === "active" ? (
        <>
          <div className="flex flex-col gap-[8px] md:flex-row md:flex-wrap md:items-center md:gap-[16px]">
            {cancelButton}
            <p className={`${SAYS} md:min-w-[220px] md:flex-1`}>{p.cancelSays(credits, on)}</p>
          </div>
          {updateButton}
        </>
      ) : null}
      {state === "pastDue" ? (
        <div className="flex flex-col gap-[8px] md:flex-row md:flex-wrap md:items-center md:gap-[16px]">
          {updateButton}
          {cancelButton}
          {presses.keep ? <button type="button" onClick={() => void change("keep")} disabled={held} aria-busy={busy === "keep" || (waiting && pending === "keep") || undefined} className={OUTLINE}>{p.keep}</button> : null}
        </div>
      ) : null}
      {waiting ? <p role="status" className={`${SAYS} font-mono`}>{p.working}</p> : null}
      <p role="status" className="sr-only">{liveText}</p>
    </div>
  );

  if (state === "offer") return card;
  return (
    <section aria-labelledby="credits-plan" className="flex flex-col md:max-w-[463px]">
      <h2 id="credits-plan" className="mb-[10px] font-display text-[17px] font-semibold text-[color:var(--fg)] md:text-[19px]">{p.heading}</h2>
      {card}
    </section>
  );
}
