"use client";
// Home's Friends section (Social R3 addendum, `design/design_handoff_the99_social_r3/addendum-friends-home/`): a mono
// label, a row of five seats that always spans the width, a line, and Add a friend. A section, not a card: no surface,
// border, ✕ or shadow, and no dismissal. Permanent while SOCIAL_FRIENDS_ENABLED is on.
//
// The seats: up to five faces, else four and `+N` (a count, not a press: the heading carries the total and `All friends ›`
// is the one way to the rest). Empty seats fill the row; with no friends, your own seat leads it. While a friend link is
// open the next empty seat carries the diamond. Add a friend makes a link and opens the shipped dialog, exactly as the
// /friends head does, and Home watches its links as /friends does: a link redeemed redraws the page, and one redeemed
// while its dialog is open closes it with the shipped `You and Colin are friends.` toast.
//
// Drawn ONCE (readiness gap 3): the dashboard places it with CSS `order` below 1180, so there is one invite watch and
// one dialog. Its data is read per request, outside Home's cached payload (`loadHomeFriends`).

import Link from "next/link";
import { socialCopy } from "../../lib/copy/social";
import { madeWhen, underADay } from "../../lib/social/when";
import type { ProfileCommander } from "../../lib/social/commander";
import type { InviteCount } from "../../lib/invites/rules";
import { PendingReporter } from "../shell/pending-reporter";
import { Face } from "../social/face";
import { useAddFriend } from "../social/use-add-friend";

const h = socialCopy.home;
/** Five seats at both widths (R2.2); past five, four faces and the count. */
export const SEATS = 5;

export type FriendsSectionProps = {
  you: { displayName: string; commander: ProfileCommander | null } | null;
  friends: { publicId: string; displayName: string; commander: ProfileCommander | null }[];
  links: { token: string; createdAt: Date; expiresAt: Date }[];
  /** The render's one clock, from the server. */
  now: string;
  /** SOCIAL_GAMES_ENABLED: the no-friends line names seating friends in a game only while it is on (G5). */
  games: boolean;
  /** SOCIAL_WISHLIST_ENABLED: a friend's own page exists. Without it a face opens /friends. */
  friendPages: boolean;
  /** SOCIAL_INVITES_ENABLED, with the reader's invite count: Add a friend opens /friends' chooser (addendum G4).
   *  Null with invites off, or with a count that could not be read: Add a friend makes a link, as shipped. */
  invites?: InviteCount | null;
  /** The dashboard's `order` classes for the phone placement. */
  className?: string;
};

/** The seats the row draws: faces, the overflow count, and empty seats to the row's end. Pure, for tests. */
export function seatPlan(friends: number): { faces: number; more: number; empty: number } {
  if (friends === 0) return { faces: 0, more: 0, empty: SEATS - 1 }; // your seat leads the row
  if (friends > SEATS) return { faces: SEATS - 1, more: friends - (SEATS - 1), empty: 0 };
  return { faces: friends, more: 0, empty: SEATS - friends };
}

export function FriendsSection({ you, friends, links, now, games, friendPages, invites = null, className = "" }: FriendsSectionProps) {
  // Add a friend, Show, the dialog, the chooser, the invite watch, the clock and the toast: shared with the first-run
  // checklist's Friends row (`useAddFriend`).
  const { nowDate, timeZone, open, soonest, msLeft, making, add, showLink, returnRef, overlays } = useAddFriend({ friends, links, now, invites });
  const plan = seatPlan(friends.length);

  const faceHref = (publicId: string) => (friendPages ? `/friends/${publicId}` : "/friends");
  return (
    <section aria-labelledby="home-friends-head" className={`flex flex-col gap-[12px] text-[color:var(--fg-body)] min-[1180px]:gap-[11px] ${className}`}>
      <div className="flex min-h-[24px] items-center justify-between gap-[12px] min-[1180px]:min-h-[14px]">
        <h2 id="home-friends-head" className="m-0 font-mono text-[10px] font-normal uppercase tracking-[.14em] text-[color:var(--fg-faint)]">
          {h.head}
          {friends.length > 0 && <> <span className="tracking-[.08em]">{h.headCount(friends.length)}</span></>}
        </h2>
        {friends.length > 0 && (
          <Link
            href="/friends"
            className="-my-[10px] flex min-h-[44px] items-center gap-[4px] pl-[12px] pr-[2px] text-[12.5px] text-[color:var(--fg-muted)] no-underline min-[1180px]:my-0 min-[1180px]:min-h-0 min-[1180px]:p-0"
          >
            {h.all}
            <span aria-hidden className="text-[15px] leading-none text-[color:var(--fg-faint)]">›</span>
            <PendingReporter href="/friends" />
          </Link>
        )}
      </div>

      <ul className="m-0 flex list-none items-start justify-between p-0">
        {friends.length === 0 && (
          <li aria-hidden className="flex w-[56px] flex-none flex-col items-center gap-[6px] min-[1180px]:w-[52px]">
            <Face name={you?.displayName ?? ""} commander={you?.commander ?? null} size={40} />
            <span className="text-[11.5px] text-[color:var(--fg-faint)]">{h.you}</span>
          </li>
        )}
        {friends.slice(0, plan.faces).map((f) => (
          <li key={f.publicId} className="flex w-[56px] flex-none flex-col items-center min-[1180px]:w-[52px]">
            <Link
              href={faceHref(f.publicId)}
              aria-label={socialCopy.friends.openAria(f.displayName)}
              className="flex min-h-[64px] w-full flex-col items-center gap-[6px] no-underline min-[1180px]:min-h-0"
            >
              <PendingReporter href={faceHref(f.publicId)} />
              <Face name={f.displayName} commander={f.commander} size={40} />
              <span aria-hidden className="max-w-[50px] overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] text-[color:var(--fg-body)] min-[1180px]:max-w-[46px]">
                {f.displayName}
              </span>
            </Link>
          </li>
        ))}
        {plan.more > 0 && (
          <li aria-hidden className="flex w-[56px] flex-none flex-col items-center gap-[6px] min-[1180px]:w-[52px]">
            <span className="flex h-[40px] w-[40px] items-center justify-center font-mono text-[12.5px] text-[color:var(--fg-muted)]">{h.more(plan.more)}</span>
            <span className="text-[11.5px] text-[color:var(--fg-faint)]">{h.moreSub}</span>
          </li>
        )}
        {Array.from({ length: plan.empty }, (_, i) => {
          // While a link is open, the first empty seat is spoken for.
          const diamond = open.length > 0 && i === 0;
          return (
            <li key={`seat-${i}`} aria-hidden className="flex w-[56px] flex-none flex-col items-center min-[1180px]:w-[52px]">
              <span
                data-seat={diamond ? "held" : "empty"}
                className={`box-border flex h-[40px] w-[40px] items-center justify-center rounded-[10px] ${
                  diamond
                    ? "[border:1.5px_dashed_color-mix(in_srgb,var(--accent)_70%,transparent)]"
                    : "[border:1.5px_dashed_var(--border-dashed)]"
                }`}
              >
                {diamond && <span className="h-[6px] w-[6px] rotate-45 bg-[color:var(--accent)]" />}
              </span>
            </li>
          );
        })}
      </ul>

      {friends.length === 0 && (
        <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)] min-[1180px]:text-[12.5px]">
          {h.invite} {h.inviteMore(games)}
        </p>
      )}

      {open.length > 0 && (
        <p className={`m-0 flex flex-wrap items-center gap-[6px] font-mono text-[11px] ${soonest && underADay(soonest.expiresAt, nowDate) ? "text-[color:var(--warning)]" : "text-[color:var(--fg-muted)]"}`}>
          <span>{h.links(open.length)}</span>
          <span aria-hidden className="text-[color:var(--fg-faint)]">·</span>
          {open.length === 1 && soonest ? (
            <>
              <span>{socialCopy.invites.left(msLeft)}</span>
              <span aria-hidden className="text-[color:var(--fg-faint)]">·</span>
              <button
                type="button"
                onClick={() => showLink(soonest)}
                aria-label={socialCopy.invites.showAria(madeWhen(soonest.createdAt, nowDate, timeZone))}
                className="-my-[14px] min-h-[44px] cursor-pointer border-0 bg-transparent px-[8px] font-sans text-[12.5px] font-medium text-[color:var(--fg)] underline decoration-[color-mix(in_srgb,var(--accent)_55%,transparent)] underline-offset-[3px] min-[1180px]:my-0 min-[1180px]:min-h-0 min-[1180px]:px-[2px]"
              >
                {socialCopy.invites.show}
              </button>
            </>
          ) : (
            <Link href="/friends" className="flex items-center gap-[4px] font-sans text-[12.5px] text-[color:var(--fg)]">
              {h.seeAll}
              <span aria-hidden className="text-[color:var(--fg-faint)]">›</span>
              <PendingReporter href="/friends" />
            </Link>
          )}
        </p>
      )}

      <button
        ref={returnRef}
        type="button"
        onClick={add}
        aria-disabled={making || undefined}
        className="h-[44px] cursor-pointer self-stretch rounded-[10px] [border:1px_solid_var(--border-strong)] bg-transparent px-[16px] font-sans text-[14px] text-[color:var(--fg)] aria-disabled:cursor-default min-[1180px]:h-[32px] min-[1180px]:self-start min-[1180px]:rounded-[8px] min-[1180px]:px-[14px] min-[1180px]:text-[12.5px]"
      >
        {making ? socialCopy.page.invitePending : socialCopy.page.invite}
      </button>

      {overlays}
    </section>
  );
}
