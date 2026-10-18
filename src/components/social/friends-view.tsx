"use client";
// /friends, drawn (Social R1 PR C): the receipt after Accept, the head, your friends, your pods (PR E) and your
// open friend links, and the modals they open. The page reads; this holds what a press changes until the
// server's redraw lands (every write revalidates `/friends`), and owns the writes' failures, which are the shared
// toast (E15).
//
// The name and the face follow the server: when a redraw brings a profile that differs from the last one drawn,
// they take it, during render (never in an effect, or the old value paints once first). A press's optimistic value
// stands only until that redraw lands, or its own write answers.
//
// With invites on (`invites` given, PR 4), Add a friend opens a chooser (`InviteSheet`) instead of making a link on
// the press: card 1 makes the link and shows it as the chooser's path 1, card 2 invites someone new. Off (`invites`
// null), everything here draws exactly as shipped. The pod sheet's Add a friend still makes a link straight away.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ProfileCommander } from "../../lib/social/commander";
import type { Friend } from "../../lib/social/access";
import type { InviteOutcome, OpenInvite, OwnProfile } from "../../lib/social/friends";
import type { CommanderTile } from "../../lib/decks/commander-picker";
import { socialCopy } from "../../lib/copy/social";
import { ACCEPTED_PARAM, INVITE_PARAM, invitePath } from "../../lib/social/client-rules";
import { mirrorUrl } from "../../lib/url/mirror";
import { useHydrated } from "../ui/hydrated-art";
import {
  createInviteAction, revokeInviteAction, setCommanderAction, setDisplayNameAction, unfriendAction,
} from "../../app/friends/actions";
import { FriendsHead } from "./friends-head";
import { FriendsList } from "./friends-list";
import { OpenLinks } from "./open-links";
import { AddFriendDialog } from "./add-friend-dialog";
import { CommanderPicker } from "./commander-picker";
import { SocialToast, type SocialToastState } from "./social-toast";
import { FriendInviteContext } from "./invite-context";
import { useInviteWatch } from "./use-invite-watch";
import { InviteSheet, type InviteScreen } from "./invite-sheet";
import { InviteCountLine } from "./invite-count-line";
import type { InviteCount } from "../../lib/invites/rules";

const p = socialCopy.page;
const CLOCK_TICK_MS = 60_000;
/** Coming back to the window redraws the page, at most this often. */
const FOCUS_REFRESH_MS = 10_000;
/** How long after a live QR's expiry the page redraws, so the server reads it as expired. */
const QR_EXPIRY_REFRESH_SLACK_MS = 500;

/** What a redraw is compared by: the fields the head draws. */
function drawnKey(p: OwnProfile): string {
  const c = p.commander;
  return JSON.stringify([p.displayName, c?.oracleId ?? null, c?.name ?? null, c?.artCropUri ?? null]);
}

/**
 * One optimistic write at a time to one field. The new value shows at once; a second write while one is in
 * flight is refused (the caller says so), so a rollback never lands on another write's unsaved value. Success
 * draws nothing more: the action's redraw brings the saved value, and a newer redraw is already adopted. A
 * failure puts back what the server LAST drew, read at the moment it fails, never a value from before a redraw.
 */
function useFieldWrite<T>(served: T, show: (v: T) => void) {
  const latest = useRef(served);
  useEffect(() => {
    latest.current = served;
  }, [served]);
  const pending = useRef(false);
  return async function write(next: T, save: () => Promise<boolean>): Promise<"saved" | "failed" | "busy"> {
    if (pending.current) return "busy";
    pending.current = true;
    show(next);
    const ok = await save().catch(() => false);
    pending.current = false;
    if (!ok) show(latest.current);
    return ok ? "saved" : "failed";
  };
}

type Shown = { token: string; url: string; expiresAt: Date; friendsBefore: ReadonlySet<string> };
type Receipt = { publicId: string; displayName: string };

export function FriendsView({
  profile,
  pods,
  friends,
  links,
  accepted,
  origin,
  nowMs,
  maxLinks,
  friendPages = false,
  invites = null,
  openInviteNew = false,
}: {
  profile: OwnProfile;
  /** The pods section (PR E), drawn between the friends and the open links. */
  pods?: ReactNode;
  friends: Friend[];
  links: OpenInvite[];
  /** The friend Accept just made (E10), resolved on the server from the URL's `publicId`; null for none. */
  accepted: Friend | null;
  /** The request's own origin, for a link's address (E7); null when its host could not be read. */
  origin: string | null;
  /** The server's clock, so the first client render draws the same times. */
  nowMs: number;
  /** Each friend row links to the friend's page (R2 P1): the wishlist is on for this reader. */
  friendPages?: boolean;
  maxLinks: number;
  /** The reader's invite count, with `SOCIAL_INVITES_ENABLED` on for them; null when it is off. */
  invites?: InviteCount | null;
  /** Arrived as `?invite=new`: Add a friend opens on Invite someone new (with invites on). */
  openInviteNew?: boolean;
}) {
  const hydrated = useHydrated();
  // Days and clock times in UTC until hydrated, as the server drew them, and the reader's own after.
  const timeZone = hydrated ? undefined : "UTC";
  // From the server's latest draw, so a link made after a redraw is dated against that draw's clock, and moved
  // on by the client's minute tick (below).
  const [tickedAt, setTickedAt] = useState(nowMs);
  const now = useMemo(() => new Date(Math.max(nowMs, tickedAt)), [nowMs, tickedAt]);

  const [name, setName] = useState(profile.displayName);
  const [commander, setCommander] = useState(profile.commander);
  const [served, setServed] = useState(() => drawnKey(profile));
  const servedKey = drawnKey(profile);
  if (servedKey !== served) {
    setServed(servedKey);
    setName(profile.displayName);
    setCommander(profile.commander);
  }
  const face = useRef<HTMLButtonElement>(null);
  // Where focus goes when the dialog closes: the Show press that opened it while that row still stands, else Add a
  // friend (a link made from the toast's Try again, or one that expired while it was shown). Read at close.
  const invite = useRef<HTMLButtonElement>(null);
  const showOpener = useRef<HTMLElement | null>(null);
  // A control in another open dialog that opened Invite someone new (Rule 0 setup's dashed row): focus goes back into
  // that dialog, whatever the chooser and the link path do to `showOpener`, until Add a friend closes.
  const inviteReturn = useRef<HTMLElement | null>(null);
  // Opened over another modal (setup): Add a friend is drawn a layer above it while that modal stays open.
  const [nestedInvite, setNestedInvite] = useState(false);
  const [dialogReturn] = useState(() => ({
    get current(): HTMLElement | null {
      const back = inviteReturn.current;
      if (back && back.isConnected) return back;
      const opener = showOpener.current;
      // Safari does not focus a pressed button, so the capture can be the body: that is no opener.
      return opener && opener !== document.body && opener.isConnected ? opener : invite.current;
    },
  }));
  const [picking, setPicking] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(accepted);
  // A receipt the watch made (below) is not in the URL, so the reconcile here does not reach it: it is put away
  // once a redraw that listed its friend is followed by one that does not (the friendship ended). Until the first
  // redraw lists them, it stands, since the refresh that brings their row may still be on its way.
  const [watchReceiptListed, setWatchReceiptListed] = useState<boolean | null>(null);
  // A redraw that resolves a different friend (or none: the friendship ended) replaces the receipt; the same one
  // keeps a receipt the reader closed, closed.
  const acceptedId = accepted?.publicId ?? null;
  const [drawnAccepted, setDrawnAccepted] = useState(acceptedId);
  if (acceptedId !== drawnAccepted) {
    setDrawnAccepted(acceptedId);
    setReceipt(accepted);
    setWatchReceiptListed(null);
  }
  const [removing, setRemoving] = useState<string | null>(null);
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [revoked, setRevoked] = useState<ReadonlySet<string>>(new Set());
  // A redraw is the server's word on who is a friend and which links are open, so it retires every local
  // override: a removed friend who accepts a new link later is drawn again (during render, not in an effect).
  const [drawnFriends, setDrawnFriends] = useState(friends);
  if (friends !== drawnFriends) {
    setDrawnFriends(friends);
    if (receipt && watchReceiptListed !== null) {
      const listed = friends.some((f) => f.publicId === receipt.publicId);
      if (listed) setWatchReceiptListed(true);
      else if (watchReceiptListed) {
        setReceipt(null);
        setWatchReceiptListed(null);
      }
    }
    setGone(new Set());
  }
  const [drawnLinks, setDrawnLinks] = useState(links);
  if (links !== drawnLinks) {
    setDrawnLinks(links);
    setRevoked(new Set());
  }
  const [making, setMaking] = useState(false);
  // The guard reads a ref: a Try again toast from an earlier failure holds a callback from that render.
  const makingNow = useRef(false);
  const [shown, setShown] = useState<Shown | null>(null);
  // Add a friend's chooser (invites on): the screen it shows, null while closed. Read by `makeLink` through a ref,
  // since a link made from the chooser opens as its path 1 and one made anywhere else opens the dialog.
  const [adding, setAdding] = useState<InviteScreen | null>(invites && openInviteNew ? "new" : null);
  // `?invite=new` is one-time: the address drops it once the screen it asked for is open.
  useEffect(() => {
    if (!openInviteNew) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(INVITE_PARAM)) return;
    url.searchParams.delete(INVITE_PARAM);
    mirrorUrl(url);
  }, [openInviteNew]);
  const addingNow = useRef(adding);
  useEffect(() => {
    addingNow.current = adding;
  }, [adding]);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  // A counter, not the clock: two toasts in one millisecond are still two toasts.
  const toastSeq = useRef(0);
  const say = (text: string, retry?: SocialToastState["retry"]) => setToast({ id: ++toastSeq.current, text, retry });
  // A toast the chooser's own screens raised (a QR or an email that could not be made): its Try again runs that
  // screen's handler, so it leaves with the sheet. One left standing would call an unmounted screen, which would run
  // its action (reserving an invite) and draw nothing.
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
  const writeName = useFieldWrite(profile.displayName, setName);
  const writeCommander = useFieldWrite<ProfileCommander | null>(profile.commander, setCommander);

  const listed = friends.filter((f) => !gone.has(f.publicId));
  const open = links.filter((l) => !revoked.has(l.token) && l.expiresAt.getTime() > now.getTime());
  const held = open.length >= maxLinks;
  // While links are open the clock runs on once a minute, from the server's draw plus the client's elapsed time:
  // each row's time left and its last-day warning stay true between redraws, and a link that expires leaves the
  // list and stops counting toward the ten. A tab woken late catches up on its first tick.
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
  // A link redeemed while it is shown or open (a friend scanned the QR code and accepted) redraws the page, so
  // the friend row arrives without a refresh. A new friend turns the dialog into the receipt Accept draws; a
  // link that ended any other way (declined, revoked elsewhere, or a friend you already had) only redraws.
  const router = useRouter();
  // The receipt is the shown link's alone (the dialog turns into it): a link redeemed with no dialog open only
  // redraws, and the friend row arrives with that. Whether the redeemer is new is judged against the friends as
  // they stood when the dialog opened, never the list at the answer: a focus redraw can land first and already
  // hold them. The watch follows the server's links, not the minute tick's `open`, so a link accepted just before
  // it expired still redraws.
  const serverLinks = links.filter((l) => !revoked.has(l.token)).map((l) => l.token);
  const watched = shown ? [shown.token, ...serverLinks] : serverLinks;
  const listedIds = useRef(new Set<string>());
  useEffect(() => {
    listedIds.current = new Set(friends.map((f) => f.publicId));
  }, [friends]);
  const shownNow = useRef(shown);
  useEffect(() => {
    shownNow.current = shown;
  }, [shown]);
  const onEnded = useCallback((ended: InviteOutcome[]) => {
    router.refresh();
    const s = shownNow.current;
    const friend = s ? ended.find((l) => l.token === s.token)?.friend : null;
    if (!s || !friend || s.friendsBefore.has(friend.publicId)) return;
    setReceipt(friend);
    setWatchReceiptListed(listedIds.current.has(friend.publicId));
    setShown(null);
    // The chooser's path 1 was that link: it turns into the receipt as the dialog does.
    setAdding((a) => (a === "link" ? null : a));
  }, [router]);
  useInviteWatch(watched, onEnded);
  // Coming back to the window redraws the page, so anything that moved while it was away (a friend who accepted
  // on another device, a removal) arrives without a refresh.
  const focusedAt = useRef(0);
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - focusedAt.current < FOCUS_REFRESH_MS) return;
      focusedAt.current = Date.now();
      router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);
  const refresh = useCallback(() => router.refresh(), [router]);
  // A live QR holds one invite until it expires (state C4). With its sheet closed nothing else watches that
  // moment, so the page redraws just after it and the count line returns to `N invites left`. The delay is read
  // against the server's clock at the draw (`nowMs`), and each redraw schedules afresh.
  const qrUntilMs = invites?.qrUntil ? invites.qrUntil.getTime() : null;
  useEffect(() => {
    if (qrUntilMs === null) return;
    const t = setTimeout(() => router.refresh(), Math.max(0, qrUntilMs - nowMs) + QR_EXPIRY_REFRESH_SLACK_MS);
    return () => clearTimeout(t);
  }, [qrUntilMs, nowMs, router]);
  // While the chooser is open the toast is drawn inside its dialog, since the dialog keeps Tab within itself and a
  // Try again outside it could not be reached from the keyboard.
  const toastEl = <SocialToast toast={toast} onDone={() => setToast(null)} />;
  function openChooser() {
    // Closing it returns focus to Add a friend, never to a Show pressed earlier.
    showOpener.current = null;
    setToast(null);
    setAdding("choose");
  }
  const linkUrl = (token: string) => `${origin ?? window.location.origin}${invitePath(token)}`;

  async function rename(next: string) {
    // A second save while one is in flight is refused and changes nothing on screen.
    const done = await writeName(next, async () => (await setDisplayNameAction(next)).ok);
    if (done === "failed") say(p.nameField.failed);
  }

  async function pick(tile: CommanderTile | null) {
    setPicking(false);
    const done = await writeCommander(tile, async () => (await setCommanderAction(tile?.oracleId ?? null)).ok);
    if (done === "failed") say(socialCopy.commander.failed);
  }

  async function remove(friend: Friend) {
    setRemoving(friend.publicId);
    const out = await unfriendAction(friend.publicId).catch(() => null);
    setRemoving(null);
    // `notFriend`: already gone, which is done (E12).
    if (out?.ok || (out && !out.ok && out.reason === "notFriend")) {
      setGone((g) => new Set(g).add(friend.publicId));
      if (receipt?.publicId === friend.publicId) setReceipt(null);
    } else say(socialCopy.friends.removeFailed);
  }

  async function makeLink() {
    if (makingNow.current) return;
    makingNow.current = true;
    // The chooser screen the press was made on (null: no chooser open). Card 2 stays live while card 1's link is
    // made, so a reader who has moved on (to path 2, or closed the sheet) by the answer gets nothing drawn: the
    // link stands, and the redraw the write revalidates lists it under Open links.
    const began = addingNow.current;
    setToast(null);
    setMaking(true);
    const out = await createInviteAction().catch(() => null);
    makingNow.current = false;
    setMaking(false);
    if (began !== null && addingNow.current !== "choose") return;
    if (out?.ok) {
      showOpener.current = null;
      setShown({ token: out.token, url: out.url, expiresAt: new Date(out.expiresAt), friendsBefore: new Set(listedIds.current) });
      if (addingNow.current === "choose") setAdding("link");
    }
    // A press made in the chooser raises the sheet's own toast, so leaving that screen puts it away like the others.
    else {
      const tell = began !== null ? sheetSay : say;
      if (out && !out.ok && out.reason === "tooMany") tell(socialCopy.invites.tooMany);
      else tell(socialCopy.invites.createFailed, { label: socialCopy.invites.retry, run: () => void makeLink() });
    }
  }

  async function revoke(link: OpenInvite) {
    // At once, no confirm (decision 5): a link already ended is gone either way (E12), so any `ok` is done.
    // The Revoke press leaves with its row (the whole section, for the last link): focus goes to Add a friend first.
    invite.current?.focus();
    setRevoked((r) => new Set(r).add(link.token));
    const out = await revokeInviteAction(link.token).catch(() => null);
    if (out?.ok) return;
    setRevoked((r) => {
      const next = new Set(r);
      next.delete(link.token);
      return next;
    });
    say(socialCopy.invites.revokeFailed);
  }

  function closeReceipt() {
    setReceipt(null);
    const url = new URL(window.location.href);
    url.searchParams.delete(ACCEPTED_PARAM);
    mirrorUrl(url);
  }

  return (
    <FriendInviteContext.Provider value={{ invite: () => void makeLink(), pending: making, held, inviteNew: invites ? (returnTo) => {
      inviteReturn.current = returnTo;
      setNestedInvite(true);
      setAdding("new");
    } : undefined }}>
      {receipt ? (
        <div role="status" className="flex min-h-[52px] items-center gap-[10px] bg-[color:var(--surface-rail)] pl-[16px] pr-[6px] text-[13px] text-[color:var(--fg)] [border-bottom:1px_solid_var(--border)] md:gap-[11px] md:py-[4px] md:pl-[30px] md:pr-[18px] md:text-[13.5px]">
          <span aria-hidden className="text-[14px] text-[color:var(--success)]">✓</span>
          <span className="min-w-0 flex-1">{p.accepted(receipt.displayName)}</span>
          <button
            type="button"
            aria-label={p.close}
            onClick={closeReceipt}
            className="flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[15px] text-[color:var(--fg-muted)]"
          >
            {"✕"}
          </button>
        </div>
      ) : null}

      <div className="mx-auto box-border w-full max-w-[720px] px-[16px] pb-[60px] pt-[22px] md:px-0 md:pt-[36px]">
        <FriendsHead
          name={name}
          commander={commander}
          onRename={rename}
          onOpenPicker={() => setPicking(true)}
          faceRef={face}
          picking={picking}
          invitePending={making}
          held={held}
          onInvite={invites ? openChooser : makeLink}
          inviteRef={invite}
          inviteCount={invites ? <InviteCountLine count={invites} /> : undefined}
        />
        <FriendsList
          friends={listed}
          now={now}
          timeZone={timeZone}
          fresh={receipt?.publicId ?? null}
          removing={removing}
          onRemove={remove}
          linkable={friendPages}
        />
        {pods}
        <OpenLinks
          links={open}
          now={now}
          timeZone={timeZone}
          onShow={(l) => {
            showOpener.current = document.activeElement as HTMLElement | null;
            setShown({ token: l.token, url: linkUrl(l.token), expiresAt: l.expiresAt, friendsBefore: new Set(listedIds.current) });
          }}
          onRevoke={revoke}
        />
      </div>

      {invites && adding ? (
        <InviteSheet
          screen={adding}
          onScreen={(next) => {
            // Back from path 1 leaves the link made and open: it is in the open links, and Show opens it again.
            if (adding === "link") setShown(null);
            // A toast belongs to the screen that raised it: its Try again would run that screen's action unseen.
            if (next !== adding) closeSheetToast();
            setAdding(next);
          }}
          count={invites}
          linkHeld={held}
          linkPending={making}
          onFriendLink={() => void makeLink()}
          link={adding === "link" && shown ? { url: shown.url, expiresAt: shown.expiresAt, now, timeZone } : null}
          onClose={() => {
            if (adding === "link") setShown(null);
            closeSheetToast();
            setAdding(null);
            setNestedInvite(false);
            // Read at the close above, so it goes only once that close has returned focus.
            queueMicrotask(() => {
              inviteReturn.current = null;
            });
          }}
          returnFocusRef={dialogReturn}
          raised={nestedInvite}
          say={sheetSay}
          onRefresh={refresh}
          toast={toastEl}
          clearToast={() => setToast(null)}
        />
      ) : null}
      {shown && !(invites && adding) ? <AddFriendDialog url={shown.url} expiresAt={shown.expiresAt} now={now} timeZone={timeZone} onClose={() => setShown(null)} returnFocusRef={dialogReturn} /> : null}
      {picking ? <CommanderPicker current={commander?.oracleId ?? null} onPick={pick} onClose={() => setPicking(false)} returnFocusRef={face} /> : null}
      {invites && adding ? null : toastEl}
    </FriendInviteContext.Provider>
  );
}
