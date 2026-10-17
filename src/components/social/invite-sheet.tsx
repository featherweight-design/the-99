"use client";
// Add a friend, with invites on (plan `2026-10-16-invites.md`, PR 4): the head's press opens this modal on a choice,
// and nothing is made until a card is pressed (A1, D1). Card 1, "They’re on The 99", runs the shipped friend link (the
// page's `makeLink`, pending on the card, A3), and its link opens here as path 1: the shipped Add a friend body under a
// ‹ back (A4, D3). Card 2, "Invite someone new", opens path 2 (`invite-new.tsx`) and carries the count twice: a fan of
// card backs, one per invite up to three, and the count line. At 0 with no live QR it is held (A2, D2): dashed and
// greyed, its fan one empty slot, and the line its reason. At ten friend links open card 1 is held instead (R13), with
// the shipped hold sentence as its reason; the head's press and card 2 stay live.
//
// The screens share one modal (`SocialModal`'s `screen` and `onBack`). The QR screen's token lives here, so ‹ back
// from it to path 2 and Show an invite QR again re-shows the same live QR (the server answers the same token anyway).

import { useCallback, useId, useState, type RefObject } from "react";
import type { InviteCount } from "../../lib/invites/rules";
import { inviteCardOpen } from "../../lib/invites/rules";
import { inviteCopy } from "../../lib/copy/invites";
import { socialCopy } from "../../lib/copy/social";
import { showInviteQrAction } from "../../app/friends/invite-actions";
import { SocialModal } from "./social-modal";
import { AddFriendBody } from "./add-friend-dialog";
import { InviteCountLine } from "./invite-count-line";
import { InviteNew, QrIcon } from "./invite-new";
import { InviteQr, type QrEnd, type ShownQr } from "./invite-qr";
import type { SocialToastState } from "./social-toast";

const ch = inviteCopy.chooser;
const d = socialCopy.dialog;

export type InviteScreen = "choose" | "link" | "new" | "qr";
export type SheetLink = { url: string; expiresAt: Date; now: Date; timeZone: string | undefined };

export function InviteSheet({
  screen,
  onScreen,
  count,
  linkHeld,
  linkPending,
  onFriendLink,
  link,
  onClose,
  returnFocusRef,
  say,
  onRefresh,
}: {
  screen: InviteScreen;
  onScreen: (next: InviteScreen) => void;
  count: InviteCount;
  /** Ten friend links open: card 1 is held (R13). */
  linkHeld: boolean;
  /** Card 1's link is being made. */
  linkPending: boolean;
  onFriendLink: () => void;
  /** The link card 1 made, drawn as path 1. */
  link: SheetLink | null;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  say: (text: string, retry?: SocialToastState["retry"]) => void;
  onRefresh: () => void;
}) {
  const [qr, setQr] = useState<ShownQr | null>(null);
  const [ended, setEnded] = useState<QrEnd | null>(null);
  const [qrPending, setQrPending] = useState(false);

  const showQr = useCallback(async function show(fresh: boolean) {
    // The live QR again needs no call: closing kept it live, and the server would answer the same token.
    if (!fresh && qr && ended === null && qr.expiresAt.getTime() > Date.now()) {
      onScreen("qr");
      return;
    }
    setQrPending(true);
    const out = await showInviteQrAction().catch(() => null);
    setQrPending(false);
    if (out?.ok) {
      setQr({ token: out.token, url: out.url, expiresAt: new Date(out.expiresAt) });
      setEnded(null);
      onScreen("qr");
      return;
    }
    if (out && !out.ok && out.reason === "out") {
      onRefresh();
      onScreen("new");
      return;
    }
    say(inviteCopy.qr.createFailed, { label: inviteCopy.path.retry, run: () => void show(fresh) });
  }, [qr, ended, onScreen, onRefresh, say]);

  const onEnded = useCallback((end: QrEnd) => {
    setEnded((was) => was ?? end);
    onRefresh();
  }, [onRefresh]);

  const back = screen === "link" || screen === "new" ? () => onScreen("choose") : screen === "qr" ? () => onScreen("new") : undefined;
  const title = screen === "choose" || screen === "link" ? d.title : inviteCopy.path.title;
  const sub = screen === "choose" ? ch.sub : screen === "link" ? d.sub : undefined;

  return (
    <SocialModal
      title={title}
      sub={sub}
      closeLabel={d.close}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      onBack={back}
      backLabel={ch.back}
      screen={screen}
    >
      {screen === "link" && link ? (
        <AddFriendBody {...link} />
      ) : screen === "qr" && qr ? (
        <InviteQr qr={qr} count={count} ended={ended} onEnded={onEnded} onMakeNew={() => void showQr(true)} making={qrPending} onDone={onClose} />
      ) : screen === "choose" || screen === "link" ? (
        <Chooser count={count} linkHeld={linkHeld} linkPending={linkPending} onFriendLink={onFriendLink} onNew={() => onScreen("new")} />
      ) : (
        <InviteNew count={count} onShowQr={() => void showQr(false)} qrPending={qrPending} say={say} onRefresh={onRefresh} />
      )}
    </SocialModal>
  );
}

const CARD =
  "grid w-full cursor-pointer grid-cols-[56px_minmax(0,1fr)_14px] items-center gap-x-[14px] rounded-[12px] bg-[color:var(--elevated)] py-[14px] pl-[12px] pr-[14px] text-left font-sans min-h-[88px] [border:1px_solid_var(--border-strong)] md:min-h-[80px] md:grid-cols-[52px_minmax(0,1fr)_14px] md:py-[12px]";
const CARD_LIVE = "md:hover:border-[color:var(--accent)]";
const CARD_OFF = "!cursor-default !bg-transparent ![border-style:dashed] !border-[color:var(--border-dashed)]";

function Chooser({
  count,
  linkHeld,
  linkPending,
  onFriendLink,
  onNew,
}: {
  count: InviteCount;
  linkHeld: boolean;
  linkPending: boolean;
  onFriendLink: () => void;
  onNew: () => void;
}) {
  const id = useId();
  const open2 = inviteCardOpen(count);
  const title = (off: boolean, pending = false) =>
    `text-[15px] font-semibold md:text-[14.5px] ${off ? "text-[color:var(--fg-locked)]" : pending ? "text-[color:var(--accent-hover)]" : "text-[color:var(--fg)]"}`;
  const body = (off: boolean) => `text-[12.5px] leading-[1.45] ${off ? "text-[color:var(--fg-locked)]" : "text-[color:var(--fg-muted)]"}`;
  const chevron = (off: boolean) => (
    <span aria-hidden className={`text-[20px] leading-none ${off ? "text-[color:var(--fg-disabled)]" : "text-[color:var(--fg-muted)]"}`}>›</span>
  );

  return (
    <div className="flex flex-col gap-[10px]">
      <button
        type="button"
        data-invite-card="link"
        onClick={() => {
          if (!linkHeld && !linkPending) onFriendLink();
        }}
        aria-disabled={linkHeld || linkPending || undefined}
        aria-describedby={linkHeld ? `${id}-held` : undefined}
        className={`${CARD} ${linkHeld ? CARD_OFF : linkPending ? "!border-[color:var(--accent-dim)]" : CARD_LIVE}`}
      >
        <span aria-hidden className={`flex h-[56px] w-[56px] items-center justify-center rounded-[12px] bg-[color:var(--surface)] [border:1px_solid_var(--border-dashed)] md:h-[52px] md:w-[52px] ${linkHeld ? "text-[color:var(--fg-locked)]" : "text-[color:var(--fg)]"}`}>
          <QrIcon size={26} />
        </span>
        <span className="flex min-w-0 flex-col gap-[3px]">
          <b className={title(linkHeld, linkPending)}>{linkPending ? ch.onPending : ch.onTitle}</b>
          <span className={body(linkHeld)}>{ch.onBody}</span>
          {linkHeld ? (
            <span id={`${id}-held`} className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-muted)]">{socialCopy.page.held}</span>
          ) : null}
        </span>
        {chevron(linkHeld)}
      </button>

      <button
        type="button"
        data-invite-card="new"
        onClick={() => {
          if (open2) onNew();
        }}
        aria-disabled={!open2 || undefined}
        aria-describedby={`${id}-count`}
        className={`${CARD} ${open2 ? CARD_LIVE : CARD_OFF}`}
      >
        <Fan left={open2 ? count.left : 0} />
        <span className="flex min-w-0 flex-col gap-[3px]">
          <b className={title(!open2)}>{ch.newTitle}</b>
          <span className={body(!open2)}>{ch.newBody}</span>
          <InviteCountLine id={`${id}-count`} count={count} tone={open2 ? "accent" : "off"} />
        </span>
        {chevron(!open2)}
      </button>
    </div>
  );
}

const MINI =
  "absolute left-[16px] top-[10px] box-border flex h-[34px] w-[24px] items-center justify-center rounded-[4px] font-display text-[9px] font-bold md:left-[14px] md:top-[9px]";
const MINI_CARD =
  `${MINI} bg-[radial-gradient(18px_18px_at_50%_46%,color-mix(in_oklab,var(--accent)_35%,transparent),transparent_75%),var(--surface-sunken)] text-[color:var(--fg)] shadow-[0_4px_10px_rgba(0,0,0,.5)] [border:1px_solid_var(--border-dashed)]`;
const SLOT = `${MINI} bg-transparent text-[color:var(--fg-disabled)] [border:1.5px_dashed_var(--border-dashed)]`;
const TURN = {
  a: "[transform:rotate(-14deg)_translate(-8px,2px)]",
  b: "[transform:translate(0,-2px)]",
  c: "[transform:rotate(14deg)_translate(8px,2px)]",
} as const;

/** Card 2's hand: a card back per invite left, up to three (a, b, c), one in the middle for one, an empty slot at 0. */
function Fan({ left }: { left: number }) {
  const cards: (keyof typeof TURN)[] = left >= 3 ? ["a", "b", "c"] : left === 2 ? ["a", "c"] : left === 1 ? ["b"] : [];
  return (
    <span aria-hidden data-fan={cards.length} className="relative h-[56px] w-[56px] md:h-[52px] md:w-[52px]">
      {cards.length === 0 ? (
        <span data-fan-slot="" className={`${SLOT} ${TURN.b}`}>99</span>
      ) : (
        cards.map((k) => <span key={k} className={`${MINI_CARD} ${TURN[k]}`}>99</span>)
      )}
    </span>
  );
}
