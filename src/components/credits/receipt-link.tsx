"use client";
// A Receipt link (a history row's, and the added band's). The Stripe receipt URL is fetched on press, server-side,
// and never stored (plan E8). The window is opened inside the press, before the await, so a popup blocker sees a
// user gesture; the URL is put into it once known, or it is closed again and the failure is said.

import { useState, type ReactNode } from "react";
import { receiptAction } from "../../app/credits/actions";

export function ReceiptLink({ sessionId, onFailed, className, children }: {
  sessionId: string;
  onFailed: () => void;
  className: string;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  async function press() {
    if (busy) return;
    setBusy(true);
    const win = window.open("about:blank", "_blank");
    try {
      const out = await receiptAction(sessionId);
      if (out.ok) {
        if (win) {
          win.opener = null;
          win.location.href = out.url;
        } else {
          // The first window was blocked. A second `window.open` would be blocked too, after an await, and with
          // `noopener` it returns null even on success, so it proves nothing: leave this tab for the receipt (the URL
          // is a validated https one).
          window.location.assign(out.url);
        }
      } else {
        win?.close();
        onFailed();
      }
    } catch {
      win?.close();
      onFailed();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" onClick={() => void press()} aria-busy={busy || undefined} className={className}>
      {children}
    </button>
  );
}
