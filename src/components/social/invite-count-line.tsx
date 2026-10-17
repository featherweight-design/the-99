// The invite count (plan `2026-10-16-invites.md`, C1 to C5): ONE line for every place an invite can be sent, chooser
// card 2, path 2's sub, the QR screen and /friends' head. `N invites left` (or `Out of invites`, in --fg-faint), then
// what is holding: `· N waiting` for reservations, `· 1 held by an open QR` (or `by this QR`, on the QR's own screens).
// The holding parts are --fg-body spans; the line's own colour is the caller's `tone`.

import type { InviteCount } from "../../lib/invites/rules";
import { inviteCopy } from "../../lib/copy/invites";

const c = inviteCopy.count;

/** The words, as one string: what a screen reader hears and what a test reads. */
export function inviteCountText(count: InviteCount, thisQr = false): string {
  return [
    count.out ? c.out : c.left(count.left),
    count.waiting > 0 ? c.waiting(count.waiting) : "",
    count.liveQr ? (thisQr ? c.heldByThisQr : c.heldByQr) : "",
  ].join("");
}

export function InviteCountLine({
  count,
  thisQr = false,
  tone = "muted",
  id,
  className = "",
}: {
  count: InviteCount;
  /** The live QR is "this QR": used on the QR screen and on path 2 (plan R4: "Out of invites · 1 held by this QR"
   * on path 2), where the QR in question is the one path 2's Show an invite QR re-shows. */
  thisQr?: boolean;
  /** `accent` on chooser card 2 while it is open, `off` on card 2 held (--fg-muted, the reason line), `muted`
   * everywhere else, where Out of invites reads in --fg-faint. */
  tone?: "muted" | "accent" | "off";
  id?: string;
  className?: string;
}) {
  const colour =
    tone === "accent" ? "text-[color:var(--accent)]"
      : tone === "muted" && count.out ? "text-[color:var(--fg-faint)]"
      : "text-[color:var(--fg-muted)]";
  return (
    <span id={id} data-invite-count="" className={`m-0 block font-mono text-[11px] ${colour} ${className}`}>
      {count.out ? c.out : c.left(count.left)}
      {count.waiting > 0 ? <span className="text-[color:var(--fg-body)]">{c.waiting(count.waiting)}</span> : null}
      {count.liveQr ? <span className="text-[color:var(--fg-body)]">{thisQr ? c.heldByThisQr : c.heldByQr}</span> : null}
    </span>
  );
}
