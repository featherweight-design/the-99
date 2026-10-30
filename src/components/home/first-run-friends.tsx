"use client";
// The first-run checklist's Friends row (Discovery R3·3; `design/design_handoff_the99_social_r3/addendum-friends-home/`
// README §3, boards ChecklistRow, Checklist-Desktop C1–C3, Checklist-Phone CP1–CP3). Last, under step 3, and never
// numbered: a friend is not on the path to a first recommendation, and the row is live while steps 2 and 3 are locked.
//
// Its box is the shipped LockedStep's (radius 14, a 56 floor, 14/15 padding on the phone and 15/18 from sm), but live:
// `--surface-inset`, on `--border-strong` with the title in `--fg` while not done (C1, C2), and on `--border` with the
// title in `--fg-body` once done (C3, as the board draws it). Three states, one press each:
//
// - C1, not done: a dashed `+` in the numeral's slot; the row opens Add a friend exactly as Home's Friends section does.
// - C2, a link open: the slot carries the accent diamond, the line reads the link's time left, and the press is Show.
// - C3, done at one friend: a ✓ in `--success`, the friend's face, and the row opens /friends. It stays.
//
// A spent link (expired or revoked) is not open, so the row is back at C1. The press, the dialog, the chooser, the
// invite watch and the toast are Home's Friends section's own (`useAddFriend`). The row is a different element in each
// state, so its `returnRef` moves with it: a dialog closed after the row changed state (C1 to C2 as the made link lands,
// C2 to C3 as it is accepted) returns focus to the row as it now stands, never to a detached press.

import Link from "next/link";
import { useCallback, useRef } from "react";
import { socialCopy } from "../../lib/copy/social";
import { PersonText, personAttrs } from "../../lib/person-name";
import type { ProfileCommander } from "../../lib/social/commander";
import { underADay } from "../../lib/social/when";
import type { InviteCount } from "../../lib/invites/rules";
import { PendingReporter } from "../shell/pending-reporter";
import { Face } from "../social/face";
import { useAddFriend, type FriendLink } from "../social/use-add-friend";

const c = socialCopy.checklist;

export type FirstRunFriendsProps = {
  friends: { publicId: string; displayName: string; commander: ProfileCommander | null }[];
  links: FriendLink[];
  /** The render's one clock, from the server. */
  now: string;
  /** SOCIAL_FRIENDS_ENABLED (invites follow friends) with the reader's invite count: Add a friend opens /friends' chooser (addendum G4). */
  invites?: InviteCount | null;
};

export type FriendsRowState = "todo" | "link" | "done";

/** Which of the three the row draws. A friend wins over an open link; a spent link is not counted. Pure, for tests. */
export function friendsRowState(friends: number, openLinks: number): FriendsRowState {
  if (friends > 0) return "done";
  if (openLinks > 0) return "link";
  return "todo";
}

// The LockedStep box, live. Its own wider gap above it (20 from sm, 18 on the phone, against the stack's 12 / 11).
const BOX =
  "mt-[7px] flex min-h-[56px] w-full flex-none items-center gap-[12px] rounded-[14px] border bg-[color:var(--surface-inset)] p-[14px_15px] text-left font-sans text-[color:var(--fg-body)] no-underline sm:mt-[8px] sm:gap-[14px] sm:p-[15px_18px]";
const SLOT = "box-border flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[6px]";
const TEXT = "flex min-w-0 flex-1 flex-col gap-[3px]";
// LockedStep's title, so the row shares step 3's face. The boards' theme weights (700 in New Phyrexia, 400 in
// Kaldheim) hold through the fonts loaded: Syncopate ships 400 and 700 only, so 600 resolves to 700, and Metamorphous
// one weight with synthesis off (fonts.ts, globals.css).
const TITLE = "font-display text-[15px] font-semibold sm:text-[16px]";
const BODY = "text-[12px] leading-[1.45] text-[color:var(--fg-muted)] sm:text-[12.5px]";
const TRAIL = "flex flex-none items-center gap-[10px] text-[12.5px] text-[color:var(--fg-body)]";
const CHEV = "text-[17px] leading-none text-[color:var(--fg-faint)]";

export function FirstRunFriendsRow({ friends, links, now, invites = null }: FirstRunFriendsProps) {
  const { nowDate, open, soonest, msLeft, making, add, showLink, returnRef, overlays } = useAddFriend({ friends, links, now, invites });
  // The row is a different element in each state, so a state change while it holds focus (a dialog closed onto C2's
  // Show, then the refresh lands the friend and draws C3's link) would drop focus to the body. The leaving element
  // notes that it held focus as its ref is cleaned up, while it is still in the document, and the arriving one takes it.
  const heldFocus = useRef(false);
  const rowRef = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      returnRef(el);
      if (heldFocus.current) {
        heldFocus.current = false;
        el.focus();
      }
      return () => {
        if (document.activeElement === el) heldFocus.current = true;
        returnRef(null);
      };
    },
    [returnRef],
  );
  const state = friendsRowState(friends.length, open.length);

  let row;
  if (state === "done") {
    const first = friends[0];
    const line = friends.length === 1 ? socialCopy.page.accepted(first.displayName) : c.doneMany(friends.length);
    row = (
      <Link ref={rowRef} href="/friends" data-friends-row="done" {...personAttrs({ "aria-label": c.doneAria(line) }, `${BOX} border-[color:var(--border)]`)}>
        <PendingReporter href="/friends" />
        <span
          aria-hidden
          className={`${SLOT} border border-[color:color-mix(in_srgb,var(--success)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--success)_14%,transparent)] text-[12px] text-[color:var(--success)]`}
        >
          ✓
        </span>
        <span className={TEXT}>
          <span className={`${TITLE} text-[color:var(--fg-body)]`}>{c.doneTitle}</span>
          <span className={BODY}><PersonText text={line} /></span>
        </span>
        <span aria-hidden className={TRAIL}>
          <Face name={first.displayName} commander={first.commander} size={26} />
          <span className={CHEV}>›</span>
        </span>
      </Link>
    );
  } else if (state === "link" && soonest) {
    const left = socialCopy.invites.left(msLeft);
    row = (
      <button
        ref={rowRef}
        type="button"
        data-friends-row="link"
        onClick={() => showLink(soonest)}
        aria-label={c.rowAria(left)}
        className={`${BOX} cursor-pointer border-[color:var(--border-strong)]`}
      >
        <span aria-hidden className={`${SLOT} [border:1.5px_dashed_color-mix(in_srgb,var(--accent)_70%,transparent)]`}>
          <span className="h-[6px] w-[6px] rotate-45 bg-[color:var(--accent)]" />
        </span>
        <span className={TEXT}>
          <span className={`${TITLE} text-[color:var(--fg)]`}>{c.title}</span>
          {/* Under a day it turns to the warning ink, as the section's open-link line and /friends' do. */}
          <span className={`font-mono text-[11px] ${underADay(soonest.expiresAt, nowDate) ? "text-[color:var(--warning)]" : "text-[color:var(--fg-muted)]"}`}>
            {socialCopy.home.links(1)} · {left}
          </span>
        </span>
        <span aria-hidden className={TRAIL}>
          {socialCopy.invites.show}
          <span className={CHEV}>›</span>
        </span>
      </button>
    );
  } else {
    row = (
      <button
        ref={rowRef}
        type="button"
        data-friends-row="todo"
        onClick={add}
        aria-disabled={making || undefined}
        className={`${BOX} cursor-pointer border-[color:var(--border-strong)] aria-disabled:cursor-default`}
      >
        <span aria-hidden className={`${SLOT} [border:1.5px_dashed_var(--border-dashed)] text-[14px] font-light leading-none text-[color:var(--fg-muted)]`}>
          +
        </span>
        <span className={TEXT}>
          <span className={`${TITLE} text-[color:var(--fg)]`}>{c.title}</span>
          {/* While the link is made the line says so, as the /friends head's press does. */}
          <span className={BODY}>{making ? socialCopy.page.invitePending : c.body}</span>
        </span>
        <span aria-hidden className={CHEV}>›</span>
      </button>
    );
  }

  // One shape in every state, the row then the overlays, so a dialog open across a state change (C1 to C2 as the
  // made link lands, C2 to C3 as it is accepted, with its toast) keeps its place in the tree.
  return (
    <>
      {row}
      {overlays}
    </>
  );
}
