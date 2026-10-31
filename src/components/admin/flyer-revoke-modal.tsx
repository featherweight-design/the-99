"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeCode } from "../../app/admin/invites/flyer-actions";
import { flyerAdminCopy } from "../../lib/copy/admin";
import { ModalChrome } from "../decks/receipt-modal";

// The Revoke confirm (flyer trial PR 4b; handoff Admin-Desktop A3, Admin-Phone P3): `ModalChrome` at 480 on desktop, its
// sheet on the phone, a bare close. Revoking ends new sign-ups only; the people who joined keep everything. The boards
// draw no failed state: a refusal or a lost reply shows an inline alert under the lead and keeps the modal (small items
// 7, Revoke-Failed.dc.html: the alert is 13px with a 12px top margin on top of the body gap).

const copy = flyerAdminCopy;
const BUTTON = "flex h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-[10px] border border-solid px-[14px] text-[14px] disabled:opacity-60 md:h-[32px] md:flex-none md:rounded-[8px] md:text-[12.5px]";

export type RevokeTarget = { id: string; store: string; code: string; taken: number };

export function FlyerRevokeModal({ target, onClose }: { target: RevokeTarget; onClose: () => void }) {
  const router = useRouter();
  // "lost" may have saved (a lost reply); "off" is a refusal that wrote nothing.
  const [failed, setFailed] = useState<null | "off" | "lost">(null);
  const [pending, start] = useTransition();

  function revoke() {
    if (pending) return;
    setFailed(null);
    start(async () => {
      try {
        const result = await revokeCode(target.id);
        if (result.ok) {
          onClose();
          router.refresh();
        } else setFailed("off");
      } catch {
        setFailed("lost");
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
      titleClassName="!font-sans !font-semibold text-[15px] leading-tight md:text-[16px] md:leading-[17px]"
      foot={
        <div className="flex gap-[10px] px-[16px] pb-[24px] md:justify-end md:px-[18px] md:pb-[18px]">
          <button type="button" onClick={onClose} disabled={pending} className={`${BUTTON} border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg)]`}>
            {copy.keep}
          </button>
          <button type="button" onClick={revoke} disabled={pending} data-testid="flyer-revoke-confirm" className={`${BUTTON} border-[color-mix(in_srgb,var(--danger)_40%,var(--bg))] bg-transparent text-[color:var(--danger)]`}>
            {copy.revokeConfirm}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-[12px] px-[16px] pb-[24px] pt-[14px] md:px-[18px] md:gap-[14px] md:pb-[18px] md:pt-[16px]">
        <p className="m-0 text-[14px] leading-[1.55] text-[color:var(--fg-body)]">
          {lead}
          <b className="font-semibold text-[color:var(--fg)]">{target.code}</b>
          {rest}
        </p>
        {failed && (
          <p role="alert" className="m-0 mt-[12px] text-[13px] text-[color:var(--danger)]">
            {failed === "off" ? copy.revokeRefused : copy.revokeLost}
          </p>
        )}
      </div>
    </ModalChrome>
  );
}
