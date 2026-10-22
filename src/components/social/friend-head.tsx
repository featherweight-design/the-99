"use client";
// A friend page's head (Social R2 P2, PP2; menu and Home PR 7): `‹ Friends`, Round 1's head (face, name, since and
// their commander) with the row's same … menu. The tabs under it are the strip's (`FriendStrip`), mounted once by
// the page group's layout, so this head stays put across a tab press.
// Removing the friend from here leaves for `/friends`, where the list is the receipt.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Friend } from "../../lib/social/access";
import { socialCopy } from "../../lib/copy/social";
import { sinceDay } from "../../lib/social/when";
import { unfriendAction } from "../../app/friends/actions";
import { useHydrated } from "../ui/hydrated-art";
import { Face } from "./face";
import { PendingReporter } from "../shell/pending-reporter";
import { FriendMenu } from "./friends-list";
import { SocialToast, type SocialToastState } from "./social-toast";

const p = socialCopy.friendPage;
const f = socialCopy.friends;

export function FriendHead({ friend, nowMs }: { friend: Friend; nowMs: number }) {
  const router = useRouter();
  // Days in UTC until hydrated, as the server drew them, and the reader's own after (as `/friends`).
  const timeZone = useHydrated() ? undefined : "UTC";
  const [removing, setRemoving] = useState(false);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);

  async function remove() {
    setRemoving(true);
    const out = await unfriendAction(friend.publicId).catch(() => null);
    // `notFriend`: already gone, which is done (E12). Either way this page no longer exists for the reader.
    if (out?.ok || (out && !out.ok && out.reason === "notFriend")) {
      router.replace("/friends");
      return;
    }
    setRemoving(false);
    setToast({ id: ++toastSeq.current, text: f.removeFailed });
  }

  const since = f.since(sinceDay(friend.since, new Date(nowMs), timeZone));
  return (
    <div>
      <Link href="/friends" className="text-[14px] text-[color:var(--fg-muted)] no-underline hover:text-[color:var(--fg)]">
        {p.back}
        <PendingReporter href="/friends" />
      </Link>
      <div className="mt-[14px] flex items-center gap-[16px]">
        <Face name={friend.displayName} commander={friend.commander} size={64} />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <h1 className="m-0 truncate font-display text-[24px] font-bold text-[color:var(--fg)] md:text-[28px]">{friend.displayName}</h1>
          <p className="m-0 truncate text-[13px] text-[color:var(--fg-muted)]">{p.since(since)}</p>
        </div>
        <FriendMenu friend={friend} removing={removing} onRemove={() => void remove()} />
      </div>
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
