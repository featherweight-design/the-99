"use client";
// Add a friend, off /friends: the interactive half Home's Friends section (PR #1974) and the first-run checklist's
// Friends row (Discovery R3·3) share. One definition of what the press does, so the two never drift:
//
// - With SOCIAL_FRIENDS_ENABLED (invites follow friends) and an invite count, Add a friend opens /friends' chooser (addendum G4); otherwise it
//   makes a link and opens the shipped `AddFriendDialog`, through `Making a link…`, with the ten-link hold and its toast.
// - Show opens the dialog on a link already open.
// - The reader's links are watched as /friends watches them (`useInviteWatch`): a link redeemed redraws the page, and
//   one redeemed while its dialog is open closes it with the shipped `You and Colin are friends.` toast.
// - The clock runs on once a minute while a link is open, so its time left and its warning stay true without a redraw.
//
// The caller draws its own presses and puts `overlays` (the chooser, the dialog and the toast) somewhere in its tree.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createInviteAction } from "../../app/friends/actions";
import { socialCopy } from "../../lib/copy/social";
import { invitePath, MAX_OPEN_INVITES } from "../../lib/social/client-rules";
import type { InviteOutcome } from "../../lib/social/friends";
import type { InviteCount } from "../../lib/invites/rules";
import { AddFriendDialog } from "./add-friend-dialog";
import { InviteSheet, type InviteScreen } from "./invite-sheet";
import { SocialToast, type SocialToastState } from "./social-toast";
import { useInviteWatch } from "./use-invite-watch";
import { useHydrated } from "../ui/hydrated-art";

/** As /friends: while a link is open the clock runs on once a minute, so its time left and warning stay true. */
const CLOCK_TICK_MS = 60_000;
/** As /friends: a live QR's expiry redraws the page just after it, so the invite count line comes back. */
const QR_EXPIRY_REFRESH_SLACK_MS = 500;

export type FriendLink = { token: string; createdAt: Date; expiresAt: Date };

export type AddFriendInput = {
  /** The reader's friends, by public id: a redeemed link is news only when its friend is new. */
  friends: { publicId: string }[];
  links: FriendLink[];
  /** The render's one clock, from the server. */
  now: string;
  /** SOCIAL_FRIENDS_ENABLED (invites follow friends) with the reader's invite count: Add a friend opens the chooser. Null: it makes a link. */
  invites: InviteCount | null;
};

export type AddFriend = {
  /** The clock, moved on by the minute tick. */
  nowDate: Date;
  /** UTC until hydrated, as the server drew it; the reader's own after. */
  timeZone: string | undefined;
  /** The links still open by `nowDate`: a spent link (expired) is not one. */
  open: FriendLink[];
  /** The open link that expires first, and its time left. */
  soonest: FriendLink | undefined;
  msLeft: number;
  /** A link is being made: the press reads `Making a link…` and is held. */
  making: boolean;
  /** Add a friend: the chooser with invites on, else make a link and open the dialog on it. */
  add: () => void;
  /** Show: the dialog on a link already open. */
  showLink: (link: FriendLink) => void;
  /** A callback ref for the element focus returns to when the dialog closes: the Add a friend press, or whichever of the
   *  caller's controls stands in for it now (the checklist row is a different element in each state). */
  returnRef: (el: HTMLElement | null) => void;
  /** The chooser, the dialog and the toast, drawn by the caller. */
  overlays: ReactNode;
};

type Shown = { token: string; url: string; expiresAt: Date; friendsBefore: Set<string> };

export function useAddFriend({ friends, links, now, invites }: AddFriendInput): AddFriend {
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
  const [making, setMaking] = useState(false);
  const makingNow = useRef(false);
  const [shown, setShown] = useState<Shown | null>(null);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);
  const say = (text: SocialToastState["text"], retry?: SocialToastState["retry"]) => setToast({ id: ++toastSeq.current, text, retry });
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
  const addRef = useRef<HTMLElement | null>(null);
  const returnRef = useCallback((el: HTMLElement | null) => {
    addRef.current = el;
  }, []);
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

  // As /friends: a link redeemed redraws the page, so the face lands. The one shown in the dialog, redeemed by someone
  // new, closes the dialog and says so; whether they are new is judged against the friends when it opened.
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

  function showLink(link: FriendLink) {
    showOpener.current = document.activeElement as HTMLElement | null;
    setShown({ token: link.token, url: linkUrl(link.token), expiresAt: link.expiresAt, friendsBefore: new Set(listed.current) });
  }

  // Every link has one lifetime today, so the oldest expires first; sorted anyway, so that stays true if one changes.
  const soonest = [...open].sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())[0];
  const msLeft = soonest ? soonest.expiresAt.getTime() - nowDate.getTime() : 0;

  const overlays = (
    <>
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
    </>
  );

  return {
    nowDate,
    timeZone,
    open,
    soonest,
    msLeft,
    making,
    add: invites ? openChooser : () => void makeLink(),
    showLink,
    returnRef,
    overlays,
  };
}
