"use client";
// The holder's Yes and No on a spare request (spare requests PR 3d; handoff `design_handoff_the99_spare_requests`
// call 8, board `Friend-Side`): one press through `answerSpareAction`, shared by Waiting on you's row and Home's lead
// story so the two answer the same way. On ok the caller turns the ask into its receipt for the visit (client state
// only; the next visit draws neither); on a refusal or a failure the shared toast says so (G5) and nothing moves.
//
// FOCUS AFTER A PRESS (the `friend-spares.tsx` pattern): the pressed control leaves the document when the row becomes
// its receipt, or when a ✕ takes the row away, so focus would fall to <body>. `useLandFocus` puts it on the element
// that replaced the press (focusable, `tabIndex={-1}`), unless the reader has already moved on.

import { useEffect, useRef, useState, type RefObject } from "react";
import { answerSpareAction } from "../../app/friends/spare-actions";
import { spareCopy } from "../../lib/copy/social";
import { personAttrs, type PersonParts, type ThirdPartyName } from "../../lib/person-name";
import { SocialToast, type SocialToastState } from "./social-toast";

const r = spareCopy.request;

export type Answer = "yes" | "no";

/**
 * Lands focus on `selector` inside `root` once a render draws it, while focus is still on the control that was pressed
 * (or has fallen to <body> because that control left the document). A reader who has moved on keeps their focus.
 * `from` is the pressed control, taken by the caller AT THE PRESS, before the action is awaited: taken after, it would
 * be wherever the reader had tabbed to meanwhile, and their focus would be pulled back to the receipt.
 */
export function useLandFocus(root: RefObject<HTMLElement | null>) {
  const target = useRef<{ selector: string; from: Element | null } | null>(null);
  useEffect(() => {
    const t = target.current;
    if (!t) return;
    const active = document.activeElement;
    const stayed = !active || active === document.body || !active.isConnected || active === t.from;
    if (!stayed) {
      target.current = null;
      return;
    }
    // Not drawn yet (a refresh still on its way), or drawn but still locked by the press: wait for the render that
    // draws it pressable. A disabled control cannot take focus, so focusing it would drop the reader on the body.
    const el = root.current?.querySelector<HTMLElement>(t.selector);
    if (!el || el.matches(":disabled")) return;
    target.current = null;
    el.focus();
  });
  return (selector: string, from: Element | null) => {
    target.current = { selector, from };
  };
}

export type SpareToast = ReturnType<typeof useSpareToast>;

/** The shared toast's state for a surface's spare writes, and the one failure line (G5). */
export function useSpareToast() {
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const seq = useRef(0);
  return {
    fail: () => setToast({ id: ++seq.current, text: r.failed }),
    node: <SocialToast toast={toast} onDone={() => setToast(null)} />,
  };
}

/**
 * One answer at a time per surface: `busy` is the request being answered and with what, and `answer` resolves true once the action
 * answered ok. A thrown action (the network, a deploy) reads as a refusal: the toast, the row unchanged.
 */
export function useSpareAnswer(shared?: SpareToast) {
  const [busy, setBusy] = useState<{ id: string; answer: Answer } | null>(null);
  // A surface whose answering element can be swapped out mid-press (Home's lead) passes a toast owned above it, so a
  // failure still shows after that element is gone.
  const own = useSpareToast();
  const toast = shared ?? own;
  async function answer(requestId: string, a: Answer): Promise<boolean> {
    if (busy) return false;
    setBusy({ id: requestId, answer: a });
    let ok = false;
    try {
      ok = (await answerSpareAction(requestId, a)).ok;
    } catch {
      ok = false;
    }
    setBusy(null);
    if (!ok) toast.fail();
    return ok;
  }
  return { busy, answer, toast: toast.node };
}

/**
 * Yes, No and the days left (`.ac` with `.yn`, `.yn.y` and `.ex` on Waiting on you's row; `.la` with `.ba` and `.bg`
 * on the lead story). Yes is the filled press: the answer the ask hopes for. Neither confirms, since neither moves a card.
 */
export function AnswerPresses({ friend, card, daysLeft, busy, locked, onAnswer, size }: {
  friend: string | ThirdPartyName; card: string; daysLeft: number; busy: Answer | null; locked: boolean;
  /** `from` is the pressed button, for `useLandFocus`. */
  onAnswer: (a: Answer, from: Element) => void;
  size: "row" | "lead";
}) {
  const press = "inline-flex flex-none cursor-pointer items-center justify-center whitespace-nowrap font-sans disabled:cursor-default";
  const [yes, no] = size === "row"
    ? [
        `${press} h-[36px] rounded-[8px] px-[16px] text-[13px] font-medium [border:1px_solid_var(--fg)] bg-[color:var(--fg)] text-[color:var(--bg)]`,
        `${press} h-[36px] rounded-[8px] px-[16px] text-[13px] font-medium [border:1px_solid_var(--border-strong)] bg-transparent text-[color:var(--fg)]`,
      ]
    : [
        `${press} h-[40px] rounded-[8px] border-0 px-[16px] text-[13.5px] font-semibold bg-[color:var(--accent)] text-[color:var(--bg)] md:h-[36px] md:text-[13px]`,
        `${press} h-[40px] rounded-[10px] px-[14px] text-[14px] font-normal [border:1px_solid_var(--border-strong)] bg-transparent text-[color:var(--fg)] md:h-[36px] md:rounded-[8px] md:text-[12.5px]`,
      ];
  return (
    <span data-testid="spare-answer" className={`flex min-w-0 flex-wrap items-center gap-[8px] ${size === "row" ? "md:justify-end" : ""}`}>
      <button type="button" data-testid="spare-yes" {...personAttrs({ "aria-label": r.yesAria(friend, card) }, yes)} aria-busy={busy === "yes" || undefined}
        disabled={locked} onClick={(e) => onAnswer("yes", e.currentTarget)}>
        {r.yes}
      </button>
      <button type="button" data-testid="spare-no" {...personAttrs({ "aria-label": r.noAria(friend, card) }, no)} aria-busy={busy === "no" || undefined}
        disabled={locked} onClick={(e) => onAnswer("no", e.currentTarget)}>
        {r.no}
      </button>
      <span data-testid="spare-days" className={`whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-muted)]`}>
        {r.daysLeft(daysLeft)}
      </span>
    </span>
  );
}

/** The receipt's two lines, for the answer given: "You're sparing Lathliss for Peter" or "You're keeping Lathliss". */
export function receiptText(answer: Answer, card: string, friend: string | ThirdPartyName): { kind: string; title: string | PersonParts; detail: string | PersonParts } {
  return answer === "yes"
    ? { kind: r.receiptKind.yes, title: r.sparing(card, friend), detail: r.sparingDetail(friend, card) }
    : { kind: r.receiptKind.no, title: r.keeping(card), detail: r.keepingDetail(friend) };
}
