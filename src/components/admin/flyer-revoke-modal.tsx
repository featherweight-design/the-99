"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeCode } from "../../app/admin/invites/flyer-actions";
import { adminCopy, flyerAdminCopy } from "../../lib/copy/admin";
import { ModalChrome } from "../decks/receipt-modal";

// The Revoke confirm (flyer trial PR 4b; handoff Admin-Desktop A3, Admin-Phone P3): `ModalChrome` at 480 on desktop, its
// sheet on the phone, a bare close. Revoking ends new sign-ups only; the people who joined keep everything. The boards
// draw no failed state: a refusal or a lost reply shows the smallest existing admin error line and keeps the modal.

const copy = flyerAdminCopy;
const BUTTON = "flex h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-[10px] border border-solid px-[14px] text-[14px] disabled:opacity-60 md:flex-none";

export type RevokeTarget = { id: string; store: string; code: string; taken: number };

export function FlyerRevokeModal({ target, onClose }: { target: RevokeTarget; onClose: () => void }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  function revoke() {
    if (pending) return;
    setFailed(false);
    start(async () => {
      try {
        const result = await revokeCode(target.id);
        if (result.ok) {
          onClose();
          router.refresh();
        } else setFailed(true);
      } catch {
        setFailed(true);
        router.refresh();
      }
    });
  }

  const [lead, rest] = copy.revokeBody(target.code, target.taken).split(target.code);
  return (
    <ModalChrome
      title={copy.revokeTitle(target.store)}
      closeLabel={copy.close}
      onClose={onClose}
      width={480}
      fit
      titleClassName="text-[15px] leading-tight md:text-[16px]"
      foot={
        <div className="flex gap-[10px] px-[16px] pb-[24px] md:justify-end md:px-[18px] md:pb-[18px]">
          <button type="button" onClick={onClose} disabled={pending} className={`${BUTTON} border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg)]`}>
            {copy.keep}
          </button>
          <button type="button" onClick={revoke} disabled={pending} data-testid="flyer-revoke-confirm" className={`${BUTTON} border-[#4A2F28] bg-transparent text-[color:var(--danger)]`}>
            {copy.revokeConfirm}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-[14px] px-[16px] pb-[18px] pt-[16px] md:px-[18px]">
        <p className="m-0 text-[14px] leading-[1.55] text-[color:var(--fg-body)]">
          {lead}
          <b className="font-semibold text-[color:var(--fg)]">{target.code}</b>
          {rest}
        </p>
        {failed && (
          <p role="alert" className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--danger)]">
            {adminCopy.groups.errors.unknown}
          </p>
        )}
      </div>
    </ModalChrome>
  );
}
