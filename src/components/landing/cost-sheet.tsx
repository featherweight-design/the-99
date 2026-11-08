"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../lib/a11y/inert-page";
import { landingCopy } from "../../lib/copy/landing";
import { dollars, type LandingClaims } from "../../lib/public/landing-claims";

const c = landingCopy.sheet;

type Buying = NonNullable<LandingClaims["buying"]>;

function Dialog({ buying, onClose, returnFocusRef }: { buying: Buying; onClose: () => void; returnFocusRef: React.RefObject<HTMLElement | null> }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // Focus lands on the close button, the first stop and the one way out; Tab is held inside, Escape closes, and focus goes
  // back to the control that opened it (`useDialogA11y`).
  useDialogA11y(dialogRef, onClose, { initialFocusRef: closeRef, returnFocusRef });
  const inertRef = useInertWhileOpen(true);
  const rows = [
    { key: "pack", name: c.pack.name, amount: dollars(buying.pack.priceCents), line: c.pack.line(buying.pack.units) },
    { key: "plan", name: c.plan.name, amount: c.plan.price(dollars(buying.plan.priceCents)), line: c.plan.line(buying.plan.units) },
  ];
  return (
    <div
      ref={inertRef}
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color:color-mix(in_oklab,var(--bg)_72%,transparent)] md:items-center"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="cost-sheet"
        onClick={(e) => e.stopPropagation()}
        className="anim-sheet-up relative flex max-h-[92dvh] w-full flex-col gap-[14px] overflow-hidden rounded-[18px_18px_0_0] border border-solid border-[color:var(--border-strong)] max-md:border-b-0 bg-[color:var(--surface-raised)] px-[20px] pb-[26px] pt-[10px] outline-none md:w-[520px] md:rounded-[14px] md:px-[24px] md:pb-[24px] md:pt-[22px]"
      >
        <span aria-hidden="true" className="mx-auto mb-[2px] h-[4px] w-[40px] flex-none rounded-full bg-[color:var(--border-strong)] md:hidden" />
        <div className="flex flex-none items-start justify-between gap-[12px]">
          <h3 id={titleId} className="m-0 font-display text-[19px] font-bold leading-[1.3] text-[color:var(--fg)]">{c.title}</h3>
          <button
            ref={closeRef}
            type="button"
            aria-label={c.close}
            onClick={onClose}
            className="-mr-[12px] -mt-[10px] inline-flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full border-0 bg-transparent text-[16px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto overscroll-contain">
          <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
            {rows.map((row) => (
              <li key={row.key} className="grid grid-cols-[1fr_auto] items-center gap-x-[16px] gap-y-[2px] rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-inset)] px-[16px] py-[14px]">
                <b className="font-sans text-[15px] font-semibold text-[color:var(--fg)]">{row.name}</b>
                <span className="font-mono text-[15px] font-semibold text-[color:var(--fg)]">{row.amount}</span>
                <span className="col-span-2 text-[13px] text-[color:var(--fg-muted)]">{row.line}</span>
              </li>
            ))}
          </ul>
          <p className="m-0 mt-[2px] text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">{c.foot}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * What credits cost (public landing PR 4b): the link in the value block and the sheet (phone) or modal (desktop) it opens, one
 * component at both widths. Hugh ruled the sheet counts as the link to prices, so `$5` and `$5 a month` sit here and not on the
 * page. The figures arrive as props from the shipped `PACKS` and `PLANS`; none is typed. It asks for nothing: no card, no payment
 * detail (`landing-promises.test.ts`). The dialog is portalled to the body: the trigger sits inside a paragraph, which may not hold a dialog. The trigger keeps its 44px target (phone) with a pseudo-element, so it adds nothing to the paragraph's line.
 */
export function CostSheet({ buying }: { buying: Buying }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="relative inline cursor-pointer border-0 bg-transparent p-0 font-sans text-[14.5px] font-medium text-[color:var(--accent-text)] underline underline-offset-[3px] after:absolute after:-inset-y-[13px] after:inset-x-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:after:-inset-y-[5px]"
      >
        {landingCopy.credits.costLink}
      </button>
      {open && createPortal(<Dialog buying={buying} onClose={() => setOpen(false)} returnFocusRef={trigger} />, document.body)}
    </>
  );
}
