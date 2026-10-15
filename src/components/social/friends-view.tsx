"use client";
// /friends, drawn (Social R1 PR C): the receipt after Accept, the head, your friends, your pods (PR E) and your
// open friend links, and the modals they open. The page reads; this holds what a press changes until the
// server's redraw lands (every write revalidates `/friends`), and owns the writes' failures, which are the shared
// toast (E15).
//
// The name and the face follow the server: when a redraw brings a profile that differs from the last one drawn,
// they take it, during render (never in an effect, or the old value paints once first). A press's optimistic value
// stands only until that redraw lands, or its own write answers.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ProfileCommander } from "../../lib/social/commander";
import type { Friend } from "../../lib/social/access";
import type { OpenInvite, OwnProfile } from "../../lib/social/friends";
import type { CommanderTile } from "../../lib/decks/commander-picker";
import { socialCopy } from "../../lib/copy/social";
import { ACCEPTED_PARAM, invitePath } from "../../lib/social/client-rules";
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

const p = socialCopy.page;
const CLOCK_TICK_MS = 60_000;

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

type Shown = { url: string; expiresAt: Date };

export function FriendsView({
  profile,
  pods,
  friends,
  links,
  accepted,
  origin,
  nowMs,
  maxLinks,
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
  maxLinks: number;
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
  const [dialogReturn] = useState(() => ({
    get current(): HTMLElement | null {
      const opener = showOpener.current;
      // Safari does not focus a pressed button, so the capture can be the body: that is no opener.
      return opener && opener !== document.body && opener.isConnected ? opener : invite.current;
    },
  }));
  const [picking, setPicking] = useState(false);
  const [receipt, setReceipt] = useState(accepted);
  // A redraw that resolves a different friend (or none: the friendship ended) replaces the receipt; the same one
  // keeps a receipt the reader closed, closed.
  const acceptedId = accepted?.publicId ?? null;
  const [drawnAccepted, setDrawnAccepted] = useState(acceptedId);
  if (acceptedId !== drawnAccepted) {
    setDrawnAccepted(acceptedId);
    setReceipt(accepted);
  }
  const [removing, setRemoving] = useState<string | null>(null);
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [revoked, setRevoked] = useState<ReadonlySet<string>>(new Set());
  // A redraw is the server's word on who is a friend and which links are open, so it retires every local
  // override: a removed friend who accepts a new link later is drawn again (during render, not in an effect).
  const [drawnFriends, setDrawnFriends] = useState(friends);
  if (friends !== drawnFriends) {
    setDrawnFriends(friends);
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
  const [toast, setToast] = useState<SocialToastState | null>(null);
  // A counter, not the clock: two toasts in one millisecond are still two toasts.
  const toastSeq = useRef(0);
  const say = (text: string, retry?: SocialToastState["retry"]) => setToast({ id: ++toastSeq.current, text, retry });
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
    setToast(null);
    setMaking(true);
    const out = await createInviteAction().catch(() => null);
    makingNow.current = false;
    setMaking(false);
    if (out?.ok) {
      showOpener.current = null;
      setShown({ url: out.url, expiresAt: new Date(out.expiresAt) });
    }
    else if (out && !out.ok && out.reason === "tooMany") say(socialCopy.invites.tooMany);
    else say(socialCopy.invites.createFailed, { label: socialCopy.invites.retry, run: () => void makeLink() });
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
    <FriendInviteContext.Provider value={{ invite: () => void makeLink(), pending: making, held }}>
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
          onInvite={makeLink}
          inviteRef={invite}
        />
        <FriendsList
          friends={listed}
          now={now}
          timeZone={timeZone}
          fresh={receipt?.publicId ?? null}
          removing={removing}
          onRemove={remove}
        />
        {pods}
        <OpenLinks
          links={open}
          now={now}
          timeZone={timeZone}
          onShow={(l) => {
            showOpener.current = document.activeElement as HTMLElement | null;
            setShown({ url: linkUrl(l.token), expiresAt: l.expiresAt });
          }}
          onRevoke={revoke}
        />
      </div>

      {shown ? <AddFriendDialog url={shown.url} expiresAt={shown.expiresAt} now={now} timeZone={timeZone} onClose={() => setShown(null)} returnFocusRef={dialogReturn} /> : null}
      {picking ? <CommanderPicker current={commander?.oracleId ?? null} onPick={pick} onClose={() => setPicking(false)} returnFocusRef={face} /> : null}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </FriendInviteContext.Provider>
  );
}
