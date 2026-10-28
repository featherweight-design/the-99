"use client";
// `/friends`' Your requests (spare requests PR 3d; handoff `design_handoff_the99_spare_requests` call 7, board
// `Asker-States`): the reader's own asks under Waiting on you, newest first, in the shipped feed rows. The kicker names
// the state (Requested, Accepted, Declined, No answer, No longer spare, No longer needed), an answer the reader has not
// seen carries the diamond, and a bare ✕ withdraws an open ask or clears the rest (`closeSpareAction`). An ask that
// went unanswered offers Ask again to the same friend (`askSpareAction`) only when the server would take it (`canAskAgain`).
// Empty, the section is absent.
//
// Both writes answer with the shared toast on a failure and leave the row as it was (G5). ✕ revalidates `/friends`, so
// its row leaves with the action's redraw; Ask again revalidates nothing (it is Shopping's write), so the list refreshes
// itself. Focus follows the press (`useLandFocus`): to the next row's ✕ after a ✕, to the new Requested after Ask again.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { askSpareAction, closeSpareAction } from "../../app/friends/spare-actions";
import { feedAge } from "../../lib/feed/age";
import { KICKER_AGE } from "../feed/kicker-age";
import { socialCopy, spareCopy } from "../../lib/copy/social";
import { expiresAt } from "../../lib/social/spare-request-rules";
import type { YourRequest } from "../../lib/social/your-requests";
import { FadingImg } from "../ui/hydrated-art";
import { faceInitials } from "./face";
import { RowEnd } from "./friend-spares";
import { useLandFocus, useSpareToast } from "./spare-answer";

const r = spareCopy.request;
const m = r.mine;

/** Whole days from the ask to now: the age the No answer line states (never the expiry window's length). */
export const daysAgo = (createdAt: Date, now: Date): number => Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000);

const isOpen = (a: YourRequest) => a.state === "open" || a.state === "unavailable" || a.state === "unneeded";

/** What one row says: its kicker and ink, its time, its title and its line. Pure, for the tests. */
/** `canBuy`: Shopping rows carry the buy press (mark-bought on), so Accepted may point at it; never for a standalone
 *  ask (a friend's Spares tab), whose card may be on no deck's list. */
export function requestText(a: YourRequest, now: Date, canBuy = true): { kind: string; ink: string; at: Date; title: string; detail: string } {
  const friend = a.holder.displayName;
  const card = a.card.name;
  const days = r.daysLeft(a.daysLeft ?? 0);
  switch (a.state) {
    case "open":
      return { kind: m.kind.open, ink: "text-[color:var(--accent-text)]", at: a.createdAt, title: m.asked(friend, card), detail: m.openDetail(a.deckName, days) };
    case "yes":
      return { kind: m.kind.yes, ink: "text-[color:var(--success)]", at: a.answeredAt ?? a.createdAt, title: m.canSpare(friend, card), detail: canBuy && !a.standalone ? m.acceptedDetail : m.acceptedDetailNoBuy };
    case "no":
      return {
        kind: m.kind.no, ink: "text-[color:var(--fg-faint)]", at: a.answeredAt ?? a.createdAt, title: m.keeping(friend, card),
        detail: a.othersWithSpare.length === 0 ? m.nobodyElse : m.othersHave(a.othersWithSpare[0], a.othersWithSpare.length - 1),
      };
    case "expired": {
      const at = expiresAt(a.createdAt);
      return { kind: m.kind.expired, ink: "text-[color:var(--fg-faint)]", at: at < now ? at : now, title: m.noAnswer(friend, card), detail: m.noAnswerDetail(daysAgo(a.createdAt, now), a.deckName) };
    }
    case "unavailable":
      return { kind: m.kind.unavailable, ink: "text-[color:var(--fg-faint)]", at: a.createdAt, title: m.noLongerSpare(friend, card), detail: m.noLongerSpareDetail };
    case "unneeded":
      return { kind: m.kind.unneeded, ink: "text-[color:var(--fg-faint)]", at: a.createdAt, title: m.asked(friend, card), detail: m.noLongerNeededDetail };
  }
}

export function YourRequests({ rows, now, canBuy = true }: { rows: readonly YourRequest[]; now: Date; canBuy?: boolean }) {
  const router = useRouter();
  const root = useRef<HTMLElement | null>(null);
  const land = useLandFocus(root);
  const toast = useSpareToast();
  const [busy, setBusy] = useState<string | null>(null);
  // A press that succeeded holds every press locked until the redraw it caused arrives (new `rows`), so a second press
  // cannot resend what the first already did (an Ask again the open ask now refuses, a ✕ on a row already gone).
  // Released during render, not in an effect, so the redraw never paints one frame of unlocked stale rows.
  const [held, setHeld] = useState<{ rows: readonly YourRequest[]; done: boolean } | null>(null);
  if (held?.done && held.rows !== rows) {
    setHeld(null);
    setBusy(null);
  }
  // The last row's ✕ takes the section with it (no rows, no section), so `land` has nowhere to go: on the way out the
  // section hands focus to the page's title, unless the reader has moved on.
  // The section draws nothing once the redraw has no rows, or is unmounted by its page: either way, once.
  const lastClosed = useRef(false);
  const toTitle = () => {
    if (!lastClosed.current) return;
    lastClosed.current = false;
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body && active.isConnected) return;
      document.getElementById("friends-title")?.focus();
    });
  };
  const empty = rows.length === 0;
  useEffect(() => {
    if (empty) toTitle();
  });
  useEffect(() => toTitle, []);
  // The last row can leave while its press is out (expired, or its friend gone): a failure toast still shows.
  if (rows.length === 0) return toast.node;

  async function close(a: YourRequest, index: number, from: Element) {
    if (busy) return;
    setBusy(a.id);
    setHeld({ rows, done: false });
    const ok = await closeSpareAction(a.id).then((o) => o.ok, () => false);
    if (!ok) {
      setHeld(null);
      setBusy(null);
      return toast.fail();
    }
    setHeld({ rows, done: true });
    const next = rows[index + 1] ?? rows[index - 1];
    if (next) land(`[data-request="${next.id}"] [data-testid="your-request-close"]`, from);
    else lastClosed.current = true;
  }

  async function askAgain(a: YourRequest) {
    if (busy) return;
    // The pressed Ask again, taken before the action is awaited (RowEnd's press hands no event on).
    const from = document.activeElement;
    setBusy(a.id);
    setHeld({ rows, done: false });
    const out = await askSpareAction({ friendPublicId: a.holder.publicId, oracleId: a.oracleId, copies: a.copies, deckId: a.deckId, standalone: a.standalone })
      .catch(() => null);
    if (!out?.ok) {
      setHeld(null);
      setBusy(null);
      return toast.fail();
    }
    setHeld({ rows, done: true });
    // The new ask by its own id: its state is derived on the redraw (it can come back `unneeded` or `unavailable`).
    land(`[data-request="${out.id}"] [data-testid="your-request-status"]`, from);
    router.refresh();
  }

  return (
    <section ref={root} aria-labelledby="your-requests" data-testid="your-requests" className="mt-[26px] md:mt-[34px]">
      <h2
        id="your-requests"
        tabIndex={-1}
        className="m-0 flex min-h-[44px] items-center justify-between gap-[12px] font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--fg-faint)] [border-bottom:1px_solid_var(--border)] md:min-h-[32px] md:pb-[8px]"
      >
        {m.head(rows.length)}
        <span className="font-sans text-[12.5px] font-medium normal-case tracking-normal text-[color:var(--fg-faint)]">{m.order}</span>
      </h2>
      <ul className="m-0 mt-[12px] flex list-none flex-col overflow-hidden rounded-[14px] bg-[color:var(--surface-inset)] p-0 [border:1px_solid_var(--border)]">
        {rows.map((a, index) => {
          const text = requestText(a, now, canBuy);
          // Offered only when the server would take it (`canAskAgain`: no open ask for the card, no No from this friend
          // inside the cooldown, a cleared one included).
          const again = a.state === "expired" && a.canAskAgain;
          return (
            <li
              key={a.id}
              data-testid="your-request"
              data-request={a.id}
              data-oracle={a.oracleId}
              data-state={a.state}
              data-unseen={a.unseen ? "" : undefined}
              className="relative grid grid-cols-[46px_minmax(0,1fr)] items-center gap-x-[12px] px-[14px] py-[12px] [&+&]:[border-top:1px_solid_var(--border)] md:grid-cols-[46px_minmax(0,1fr)_auto] md:gap-x-[14px] md:px-[16px]"
            >
              {/* Centred on its row at both widths (small items R1b, `.ya .fi{align-items:center}`), spanning the text and Ask again on a phone. */}
              <span aria-hidden className="relative row-span-2 h-[64px] w-[46px] md:row-span-1">
                {a.card.imageUri ? (
                  <FadingImg src={a.card.imageUri} alt="" className="block h-[64px] w-[46px] rounded-[3px] object-cover shadow-[0_2px_6px_rgba(0,0,0,.45)]" />
                ) : (
                  <span className="block h-[64px] w-[46px] rounded-[3px] bg-[color:var(--surface-sunken)]" />
                )}
                <span className="absolute -bottom-[5px] -right-[6px] flex h-[24px] w-[24px] items-center justify-center overflow-hidden rounded-[7px] bg-[color:var(--elevated)] font-mono text-[9px] font-semibold text-[color:var(--fg-muted)] [border:1.5px_solid_var(--surface-inset)]">
                  {a.holder.commander?.artCropUri
                    ? <FadingImg src={a.holder.commander.artCropUri} alt="" className="block h-full w-full object-cover" />
                    : faceInitials(a.holder.displayName)}
                </span>
              </span>
              {/* Clear of the ✕ (36px at the row's top right): the whole text column, title and detail included. */}
              <div className="flex min-w-0 flex-col gap-[3px] pr-[30px]">
                <p className="m-0 flex min-w-0 items-center gap-[7px]">
                  {a.unseen && (
                    <>
                      <span aria-hidden className="h-[6px] w-[6px] flex-none rotate-45 bg-[color:var(--accent)]" />
                      <span className="sr-only">{socialCopy.waiting.unseen}</span>
                    </>
                  )}
                  <span data-testid="your-request-status" tabIndex={-1} className={`truncate font-mono text-[9.5px] font-medium uppercase tracking-[.12em] ${text.ink}`}>
                    {text.kind}
                  </span>
                  <small className={`${KICKER_AGE} text-[color:var(--fg-faint)]`}>
                    {feedAge(text.at.toISOString(), now.toISOString())}
                  </small>
                </p>
                <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--fg)] [overflow-wrap:anywhere]">{text.title}</p>
                <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">{text.detail}</p>
              </div>
              {again && (
                <div className="col-start-2 mt-[6px] flex min-w-0 md:col-start-3 md:row-start-1 md:mt-0 md:justify-end md:pr-[34px]">
                  <RowEnd ask={{ kind: "askAgain" }} friend={a.holder.displayName} card={a.card.name} busy={busy === a.id}
                    locked={busy !== null} onAsk={() => void askAgain(a)} size="row" />
                </div>
              )}
              <button
                type="button"
                data-testid="your-request-close"
                aria-label={isOpen(a) ? m.withdrawAria(a.holder.displayName, a.card.name) : m.clearAria(a.holder.displayName, a.card.name)}
                aria-busy={busy === a.id || undefined}
                disabled={busy !== null}
                onClick={(e) => void close(a, index, e.currentTarget)}
                className="absolute right-[4px] top-[6px] flex h-[36px] w-[36px] cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[13px] text-[color:var(--fg-muted)] disabled:cursor-default"
              >
                <span aria-hidden>✕</span>
              </button>
            </li>
          );
        })}
      </ul>
      {toast.node}
    </section>
  );
}
