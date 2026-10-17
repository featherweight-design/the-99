"use client";
// Add a friend (Social R1 README decision 4; R2 Invite I1 to I3, P1 to P4). The dialog at desktop, the sheet
// at phone, opened only once a link exists (a new one from the head, or an open one's Show), so a QR code is
// never drawn for a link that does not. It leads with the QR code on a light plate in every theme (a camera
// wants dark on light), then the link in a read-only field with `Copy link` (`✓ Copied` for two seconds, read
// out by the status line). On a phone `Share link` leads, through the phone's own share sheet, and is absent
// where there is none. The meta line states the two rules: it works once, and when it stops.
//
// The content is `AddFriendBody`, so Add a friend's chooser (invites PR 4) draws the same link as its first path,
// inside its own modal with a ‹ back; the dialog here is that body in its own frame, as shipped.

import { useEffect, useRef, useState, type RefObject } from "react";
import { socialCopy } from "../../lib/copy/social";
import { qrPath } from "../../lib/social/client-rules";
import { expiresWhen, underADay } from "../../lib/social/when";
import { SocialModal } from "./social-modal";

const d = socialCopy.dialog;
const COPIED_MS = 2000;

type LinkProps = { url: string; expiresAt: Date; now: Date; timeZone: string | undefined };

export function AddFriendDialog({
  onClose,
  returnFocusRef,
  ...link
}: LinkProps & {
  onClose: () => void;
  /** Where focus goes on close when the opener may be gone (a link made from a toast's Try again). */
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <SocialModal title={d.title} sub={d.sub} closeLabel={d.close} onClose={onClose} returnFocusRef={returnFocusRef}>
      <AddFriendBody {...link} />
    </SocialModal>
  );
}

/** The link, its QR code, Share and Copy, and the meta line: everything inside the dialog's frame. */
export function AddFriendBody({ url, expiresAt, now, timeZone }: LinkProps) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  // The clipboard refused: show the link field at every width (a phone with Share hides it) and select it.
  const [manual, setManual] = useState(false);
  // No quiet zone in the path: the plate's own 16px padding is the quiet zone (R2 Invite `.qr`).
  const qr = qrPath(url, 0);

  // Read after mount: the server never has a share sheet, and the first render must match its draw.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a browser capability, known only once mounted
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  useEffect(() => {
    if (!manual) return;
    field.current?.focus();
    field.current?.select();
  }, [manual]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard (an insecure origin, a refused permission): select the field, so a long press copies it.
      setManual(true);
      field.current?.focus();
      field.current?.select();
    }
  }
  function share() {
    // Nothing is recorded about where it went; a dismissed share sheet rejects, which is not a failure.
    navigator.share?.({ url, text: d.shareText }).catch(() => {});
  }

  const soon = underADay(expiresAt, now);
  // `lead`: Copy is the filled press at every width. Otherwise Share leads at phone, and Copy still leads at
  // desktop, where Share is never drawn.
  const copyButton = (lead: boolean) => (
    <button
      type="button"
      onClick={copy}
      className={`flex-none cursor-pointer rounded-[8px] font-sans font-semibold ${copied ? "bg-[color:var(--elevated)] text-[color:var(--success)] [border:1px_solid_var(--border-strong)]" : lead ? "border-0 bg-[color:var(--accent)] text-[color:var(--bg)]" : "bg-transparent text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] md:bg-[color:var(--accent)] md:text-[color:var(--bg)] md:[border:0]"} ${canShare ? "h-[48px] w-full text-[15px] max-md:font-medium md:h-[40px] md:w-auto md:rounded-[6px] md:px-[16px] md:text-[13px]" : "h-[44px] px-[14px] text-[13px] md:h-[40px] md:rounded-[6px] md:px-[16px]"}`}
    >
      {copied ? d.copied : d.copy}
    </button>
  );

  return (
    <>
      <figure className="m-0 mt-[4px] flex flex-col items-center gap-[8px]">
        {/* The plate is #F4F5F8 in every theme (a camera wants dark on light): 235px at phone, 206 at desktop. */}
        <div className="rounded-[10px] bg-[#F4F5F8] p-[16px]">
          <svg
            role="img"
            aria-label={d.qrAria}
            viewBox={`0 0 ${qr.size} ${qr.size}`}
            shapeRendering="crispEdges"
            className="block h-[203px] w-[203px] md:h-[174px] md:w-[174px]"
          >
            <path d={qr.d} className="fill-[color:var(--bg)]" />
          </svg>
        </div>
        {/* No caption at phone: the phone is the camera (R2 Invite phone). */}
        <figcaption className="font-mono text-[10.5px] text-[color:var(--fg-faint)] max-md:hidden">{d.qrCaption}</figcaption>
      </figure>

      {canShare ? (
        <div className="mt-[18px] flex flex-col gap-[8px] md:hidden">
          <button type="button" onClick={share} className="flex h-[48px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border-0 bg-[color:var(--accent)] font-sans text-[15px] font-semibold text-[color:var(--bg)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path d="M12 15V4M8 8l4-4 4 4" />
              <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" />
            </svg>
            {d.share}
          </button>
        </div>
      ) : null}

      <div className={`flex gap-[8px] ${canShare ? "mt-[8px] max-md:flex-col md:mt-[18px]" : "mt-[16px] md:mt-[18px]"}`}>
        <input
          ref={field}
          readOnly
          value={url}
          aria-label={d.linkAria}
          onFocus={(e) => e.currentTarget.select()}
          className={`h-[44px] min-w-0 flex-1 rounded-[8px] bg-[color:var(--surface-sunken)] px-[12px] font-mono text-[12.5px] text-[color:var(--fg-body)] [border:1px_solid_var(--border-strong)] md:h-[40px] md:rounded-[6px] ${canShare && !manual ? "max-md:hidden" : ""}`}
        />
        {copyButton(!canShare)}
      </div>

      <p className={`m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-muted)] md:mt-[10px] ${canShare ? "max-md:text-center" : ""}`}>
        {d.meta(expiresWhen(expiresAt, now, timeZone))}
        {soon ? <span className="text-[color:var(--warning)]">{` · ${d.soon}`}</span> : null}
      </p>
      <p role="status" className="sr-only">{copied ? d.copied : ""}</p>
    </>
  );
}
