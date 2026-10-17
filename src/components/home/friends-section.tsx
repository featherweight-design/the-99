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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createInviteAction } from "../../app/friends/actions";
import { socialCopy } from "../../lib/copy/social";
import { invitePath } from "../../lib/social/client-rules";
import { madeWhen, underADay } from "../../lib/social/when";
import type { ProfileCommander } from "../../lib/social/commander";
import type { InviteOutcome } from "../../lib/social/friends";
import { AddFriendDialog } from "../social/add-friend-dialog";
import { InviteSheet, type InviteScreen } from "../social/invite-sheet";
import type { InviteCount } from "../../lib/invites/rules";
import { MAX_OPEN_INVITES } from "../../lib/social/client-rules";
import { PendingReporter } from "../shell/pending-reporter";
import { Face } from "../social/face";
import { SocialToast, type SocialToastState } from "../social/social-toast";
import { useInviteWatch } from "../social/use-invite-watch";
import { useHydrated } from "../ui/hydrated-art";

const h = socialCopy.home;
/** Five seats at both widths (R2.2); past five, four faces and the count. */
export const SEATS = 5;
/** As /friends: while a link is open the clock runs on once a minute, so its time left and warning stay true. */
const CLOCK_TICK_MS = 60_000;
/** As /friends: a live QR's expiry redraws the page just after it, so the invite count line comes back. */
const QR_EXPIRY_REFRESH_SLACK_MS = 500;

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

type Shown = { token: string; url: string; expiresAt: Date; friendsBefore: Set<string> };

/** The seats the row draws: faces, the overflow count, and empty seats to the row's end. Pure, for tests. */
export function seatPlan(friends: number): { faces: number; more: number; empty: number } {
  if (friends === 0) return { faces: 0, more: 0, empty: SEATS - 1 }; // your seat leads the row
  if (friends > SEATS) return { faces: SEATS - 1, more: friends - (SEATS - 1), empty: 0 };
  return { faces: friends, more: 0, empty: SEATS - friends };
}

export function FriendsSection({ you, friends, links, now, games, friendPages, invites = null, className = "" }: FriendsSectionProps) {
  const router = useRouter();
  // The server's clock, moved on by the client's minute tick from the server's draw plus the client's elapsed time,
  // as /friends does, so a link crossing its last day turns to the warning ink without a redraw.
  const nowMs = Date.parse(now);
  const [tickedAt, setTickedAt] = useState(nowMs);
  const nowDate = useMemo(() => new Date(Math.max(nowMs, tickedAt)), [nowMs, tickedAt]);
  const drawnAt = useRef<{ server: number; client: number } | null>(null);
  useEffect(() => {
    drawnAt.current = { server: nowMs, client: Date.now() };
  }, [nowMs]);
  const ticking = links.length > 0;
  useEffect(() => {
    if (!ticking) return;
    const t = setInterval(() => {
      if (drawnAt.current) setTickedAt(drawnAt.current.server + Date.now() - drawnAt.current.client);
    }, CLOCK_TICK_MS);
    return () => clearInterval(t);
  }, [ticking]);
  // Days and clock times in UTC until hydrated, as the server drew them, and the reader's own after.
  const hydrated = useHydrated();
  const timeZone = hydrated ? undefined : "UTC";
  const open = links.filter((l) => l.expiresAt.getTime() > nowDate.getTime());
  const plan = seatPlan(friends.length);
  const [making, setMaking] = useState(false);
  const makingNow = useRef(false);
  const [shown, setShown] = useState<Shown | null>(null);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);
  const say = (text: string, retry?: SocialToastState["retry"]) => setToast({ id: ++toastSeq.current, text, retry });
  // Add a friend's chooser (invites on), exactly as /friends draws it: the screen it shows, null while closed. Read
  // by `makeLink` through a ref, since a link made from the chooser opens as its path 1 and one made from a Try
  // again opens the dialog.
  const [adding, setAdding] = useState<InviteScreen | null>(null);
  const addingNow = useRef(adding);
  useEffect(() => {
    addingNow.current = adding;
  }, [adding]);
  // A toast the chooser's own screens raised leaves with the sheet: its Try again would run an unmounted screen.
  const sheetToast = useRef<number | null>(null);
  const sheetSay = (text: string, retry?: SocialToastState["retry"]) => {
    const id = ++toastSeq.current;
    sheetToast.current = id;
    setToast({ id, text, retry });
  };
  const closeSheetToast = () => {
    const id = sheetToast.current;
    sheetToast.current = null;
    if (id !== null) setToast((t) => (t?.id === id ? null : t));
  };
  const refresh = useCallback(() => router.refresh(), [router]);
  const qrUntilMs = invites?.qrUntil ? invites.qrUntil.getTime() : null;
  useEffect(() => {
    if (qrUntilMs === null) return;
    const t = setTimeout(() => router.refresh(), Math.max(0, qrUntilMs - nowMs) + QR_EXPIRY_REFRESH_SLACK_MS);
    return () => clearTimeout(t);
  }, [qrUntilMs, nowMs, router]);
  // While the chooser is open the toast is drawn inside its dialog, which keeps Tab within itself.
  const toastEl = <SocialToast toast={toast} onDone={() => setToast(null)} />;
  function openChooser() {
    // While a link is being made the press is held, as on /friends: an answer must not land in a chooser opened since.
    if (makingNow.current) return;
    // Closing it returns focus to Add a friend, never to a Show pressed earlier.
    showOpener.current = null;
    setToast(null);
    setAdding("choose");
  }
  const addRef = useRef<HTMLButtonElement>(null);
  // Where focus goes when the dialog closes: the Show press that opened it while it still stands, else Add a friend.
  const showOpener = useRef<HTMLElement | null>(null);
  const [dialogReturn] = useState(() => ({
    get current(): HTMLElement | null {
      const opener = showOpener.current;
      // Safari does not focus a pressed button, so the capture can be the body: that is no opener.
      return opener && opener !== document.body && opener.isConnected ? opener : addRef.current;
    },
  }));

  const listed = useRef(new Set<string>());
  useEffect(() => {
    listed.current = new Set(friends.map((f) => f.publicId));
  }, [friends]);
  const shownNow = useRef(shown);
  useEffect(() => {
    shownNow.current = shown;
  }, [shown]);

  // As /friends: a link redeemed redraws the page, so the face lands in the row. The one shown in the dialog, redeemed
  // by someone new, closes the dialog and says so; whether they are new is judged against the friends when it opened.
  const onEnded = useCallback((ended: InviteOutcome[]) => {
    router.refresh();
    const s = shownNow.current;
    const friend = s ? ended.find((l) => l.token === s.token)?.friend : null;
    if (!s || !friend || s.friendsBefore.has(friend.publicId)) return;
    setShown(null);
    // The chooser's path 1 was that link: it closes as the dialog does, and the toast says so.
    setAdding((a) => (a === "link" ? null : a));
    say(socialCopy.page.accepted(friend.displayName));
  }, [router]);
  const watched = [...new Set([...(shown ? [shown.token] : []), ...links.map((l) => l.token)])];
  useInviteWatch(watched, onEnded);

  const linkUrl = (token: string) => `${window.location.origin}${invitePath(token)}`;

  async function makeLink() {
    if (makingNow.current) return;
    makingNow.current = true;
    // The chooser screen the press was made on (null: none open). A reader who has moved on by the answer gets
    // nothing drawn: the link stands, and the redraw lists it.
    const began = addingNow.current;
    setToast(null);
    setMaking(true);
    const out = await createInviteAction().catch(() => null);
    makingNow.current = false;
    setMaking(false);
    if (began !== null && addingNow.current !== "choose") return;
    if (out?.ok) {
      showOpener.current = null;
      setShown({ token: out.token, url: out.url, expiresAt: new Date(out.expiresAt), friendsBefore: new Set(listed.current) });
      if (addingNow.current === "choose") setAdding("link");
    } else {
      const tell = began !== null ? sheetSay : say;
      if (out && !out.ok && out.reason === "tooMany") tell(socialCopy.invites.tooMany);
      else tell(socialCopy.invites.createFailed, { label: socialCopy.invites.retry, run: () => void makeLink() });
    }
  }

  function showLink(link: { token: string; createdAt: Date; expiresAt: Date }) {
    showOpener.current = document.activeElement as HTMLElement | null;
    setShown({ token: link.token, url: linkUrl(link.token), expiresAt: link.expiresAt, friendsBefore: new Set(listed.current) });
  }

  const faceHref = (publicId: string) => (friendPages ? `/friends/${publicId}` : "/friends");
  // Every link has one lifetime today, so the oldest expires first; sorted anyway, so that stays true if one changes.
  const soonest = [...open].sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())[0];
  const msLeft = soonest ? soonest.expiresAt.getTime() - nowDate.getTime() : 0;

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
          {open.length === 1 ? (
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
        ref={addRef}
        type="button"
        onClick={invites ? openChooser : () => void makeLink()}
        aria-disabled={making || undefined}
        className="h-[44px] cursor-pointer self-stretch rounded-[10px] [border:1px_solid_var(--border-strong)] bg-transparent px-[16px] font-sans text-[14px] text-[color:var(--fg)] aria-disabled:cursor-default min-[1180px]:h-[32px] min-[1180px]:self-start min-[1180px]:rounded-[8px] min-[1180px]:px-[14px] min-[1180px]:text-[12.5px]"
      >
        {making ? socialCopy.page.invitePending : socialCopy.page.invite}
      </button>

      {invites && adding ? (
        <InviteSheet
          screen={adding}
          onScreen={(next) => {
            // Back from path 1 leaves the link made and open, under the open-link line.
            if (adding === "link") setShown(null);
            if (next !== adding) closeSheetToast();
            setAdding(next);
          }}
          count={invites}
          linkHeld={open.length >= MAX_OPEN_INVITES}
          linkPending={making}
          onFriendLink={() => void makeLink()}
          link={adding === "link" && shown ? { url: shown.url, expiresAt: shown.expiresAt, now: nowDate, timeZone } : null}
          onClose={() => {
            if (adding === "link") setShown(null);
            closeSheetToast();
            setAdding(null);
          }}
          returnFocusRef={dialogReturn}
          say={sheetSay}
          onRefresh={refresh}
          toast={toastEl}
          clearToast={() => setToast(null)}
        />
      ) : null}
      {shown && !(invites && adding) ? (
        <AddFriendDialog url={shown.url} expiresAt={shown.expiresAt} now={nowDate} timeZone={timeZone} onClose={() => setShown(null)} returnFocusRef={dialogReturn} />
      ) : null}
      {invites && adding ? null : toastEl}
    </section>
  );
}
