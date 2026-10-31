"use client";

import Link from "next/link";
import { PendingReporter } from "../shell/pending-reporter";
import { adminCopy, flyerAdminCopy } from "../../lib/copy/admin";

/** The QR's pixels per module in the PNG: sharp at table-tent size. */
const PX = 24;

/**
 * The screen-only bar above the flyer (`Print.dc.html` `.pvb`): back to Invites, the store and its code, Download QR (a PNG
 * drawn from the same path the flyer's QR is) and Print (the browser's dialog). `@media print` hides it (`print.css`). A
 * revoked code (`revoked` is its day, "Nov 2") keeps the way back, the store and the muted code, says when it was revoked,
 * and has neither button (`Print-Revoked.dc.html`).
 */
export function FlyerPrintBar({ store, code, qr, revoked = null }: { store: string; code: string; qr: { size: number; d: string }; revoked?: string | null }) {
  function download() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = qr.size * PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // White ground, black modules, the quiet zone already inside `size`.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(PX, PX);
    ctx.fillStyle = "#000000";
    ctx.fill(new Path2D(qr.d));
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${code}-qr.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }
  return (
    <div className="flyer-bar" data-testid="flyer-bar">
      <Link href="/admin/invites" prefetch={false}>
        ‹ {adminCopy.tabs.invites}
        <PendingReporter href="/admin/invites" />
      </Link>
      <b>{store}</b>
      <span className={revoked ? "fb-code fb-muted" : "fb-code"}>{code}</span>
      {revoked ? (
        <small className="fb-revoked" data-testid="flyer-revoked-note">{flyerAdminCopy.printRevoked(revoked)}</small>
      ) : (
        <small>{flyerAdminCopy.printBar}</small>
      )}
      <span className="fb-sp" />
      {!revoked && (
        <>
          <button type="button" className="fb-ghost" data-testid="flyer-download-qr" onClick={download}>{flyerAdminCopy.downloadQr}</button>
          <button type="button" className="fb-solid" data-testid="flyer-print" onClick={() => window.print()}>{flyerAdminCopy.print}</button>
        </>
      )}
    </div>
  );
}
