"use client";

import { useRef, type RefObject } from "react";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import type { HeldPaid } from "../../lib/payments/held-rule";
import { SocialModal } from "../social/social-modal";
import { SupportLink } from "./support-link";

const c = creditsPageCopy.del;

/**
 * The deletion warning (buying credits §7, D1/D2; plan E6): opened by Manage account while paid credits are held, so a
 * reader sees what deleting forfeits before Clerk's page. The SocialModal: a sheet on the phone, a 440 dialog from `md`.
 * The split shows only what is held (D2: packs only). One press continues to Clerk; ✕ stays.
 */
export function DeleteWarning({
  held,
  onContinue,
  onClose,
  returnFocusRef,
}: {
  held: HeldPaid;
  onContinue: () => void;
  onClose: () => void;
  /** Where focus goes back on ✕: the account trigger, since the menu row that opened this has closed. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const goRef = useRef<HTMLButtonElement>(null);
  const cells = [
    held.plan > 0 ? { key: "plan", label: c.plan, n: held.plan, sub: c.planSub } : null,
    held.pack > 0 ? { key: "pack", label: c.packs, n: held.pack, sub: c.packsSub } : null,
  ].filter((x) => x !== null);
  return (
    <SocialModal title={c.title(held.plan + held.pack)} closeLabel={c.close} onClose={onClose} initialFocusRef={goRef} returnFocusRef={returnFocusRef} width={440}>
      <div data-delete-warning="" className="flex flex-col gap-[16px] pb-[20px] pt-[14px] md:pb-[2px]">
        <ul className="m-0 flex list-none gap-[16px] p-0">
          {cells.map((cell) => (
            <li key={cell.key} data-held={cell.key} className="flex min-w-0 flex-1 flex-col gap-[2px] px-[13px] py-[10px]">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">{cell.label}</span>
              <span className="font-mono text-[20px] font-semibold leading-[1.15] text-[color:var(--fg)]">{cell.n}</span>
              <span className="font-mono text-[11px] text-[color:var(--fg-muted)] md:whitespace-nowrap">{cell.sub}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-[14px] leading-[1.5] text-[color:var(--fg-body)]">{c.says(held.plan, held.pack)}</p>
        <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">
          {c.refundBefore}
          <SupportLink ground="raised" />
          {c.refundAfter}
        </p>
        <button
          ref={goRef}
          type="button"
          onClick={onContinue}
          className="flex h-[44px] w-full cursor-pointer items-center justify-center rounded-[8px] border-0 bg-[color:var(--accent)] px-[20px] text-[14px] font-semibold text-[color:var(--bg)] md:h-[40px] md:w-auto md:self-start"
        >
          {c.go}
        </button>
      </div>
    </SocialModal>
  );
}
