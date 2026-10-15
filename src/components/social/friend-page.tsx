"use client";
// A friend's page (Social R2 P2, P3, PP2, PP3): `‹ Friends`, Round 1's head (face, name, since and their commander)
// with the row's same … menu, then their wishlist, view only. Cards are the collection's own tiles, captioned
// `wants N` and never an owned count; a collected card has left the list (round 3), so there is no collected state.
// Removing the friend from here leaves for `/friends`, where the list is the receipt.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Friend } from "../../lib/social/access";
import type { FriendWishlistLine } from "../../lib/social/wishlist";
import { socialCopy } from "../../lib/copy/social";
import { sinceDay } from "../../lib/social/when";
import { unfriendAction } from "../../app/friends/actions";
import { CARD_GRID_TRACKS } from "../ui/card-grid";
import { CardTileCaption, TILE_ART_CLIP, TILE_ART_RATIO, TILE_SHELL } from "../ui/card-tile-caption";
import { HydratedImg, useHydrated } from "../ui/hydrated-art";
import { Face } from "./face";
import { PendingReporter } from "../shell/pending-reporter";
import { FriendMenu } from "./friends-list";
import { SocialToast, type SocialToastState } from "./social-toast";

const p = socialCopy.friendPage;
const f = socialCopy.friends;

/** How many tiles ask for their art in the server HTML: the first screen, as the collection grid does. */
const EAGER_TILES = 4;

export function FriendPage({ friend, lines, nowMs }: { friend: Friend; lines: FriendWishlistLine[]; nowMs: number }) {
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
    <div className="mx-auto w-full max-w-[1300px] px-[14px] pt-[18px] pb-[34px] md:px-[34px] md:pt-[28px]">
      <Link href="/friends" className="text-[14px] text-[color:var(--fg-muted)] no-underline hover:text-[color:var(--fg)]">
        {p.back}
        <PendingReporter href="/friends" />
      </Link>
      <div className="mt-[14px] flex items-center gap-[16px]">
        <Face name={friend.displayName} commander={friend.commander} size={64} />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <h1 className="m-0 truncate font-display text-[24px] font-bold text-[color:var(--fg)] md:text-[28px]">{friend.displayName}</h1>
          <p className="m-0 truncate text-[13px] text-[color:var(--fg-muted)] md:text-[14px]">
            {p.since(since)}
            {friend.commander ? ` · ${friend.commander.name}` : ""}
          </p>
        </div>
        <FriendMenu friend={friend} removing={removing} onRemove={() => void remove()} />
      </div>

      <h2 className="m-0 mt-[22px] flex items-baseline gap-[10px] pb-[10px] [border-bottom:1px_solid_var(--border)] md:mt-[28px]">
        <span className="font-sans text-[16px] font-semibold text-[color:var(--fg)] md:text-[19px]">{p.head(friend.displayName)}</span>
        <span className="font-mono text-[13px] font-normal text-[color:var(--fg-faint)]">{lines.length}</span>
        <span className="ml-auto font-mono text-[13px] font-normal text-[color:var(--fg-faint)]">{p.viewOnly}</span>
      </h2>

      {lines.length === 0 ? (
        <div className="mt-[16px] flex items-center gap-[28px] rounded-[12px] px-[20px] py-[22px] [border:1px_dashed_var(--border-dashed)] md:mt-[18px] md:px-[32px] md:py-[30px]">
          <div aria-hidden className="relative hidden h-[103px] w-[104px] flex-none md:block">
            <span className="absolute left-0 top-0 h-[103px] w-[74px] rounded-[7px] [border:1px_dashed_var(--border-dashed)]" />
            <span className="absolute left-[30px] top-0 h-[103px] w-[74px] rotate-[4deg] rounded-[7px] [border:1px_dashed_var(--border-dashed)]" />
          </div>
          <div className="flex flex-col gap-[6px]">
            <p className="m-0 font-display text-[18px] font-bold text-[color:var(--fg)] md:text-[19px]">{p.emptyTitle(friend.displayName)}</p>
            <p className="m-0 max-w-[600px] text-[14px] leading-[1.6] text-[color:var(--fg-muted)]">{p.emptyBody(friend.displayName)}</p>
          </div>
        </div>
      ) : (
        <ul className={`m-0 grid list-none p-0 ${CARD_GRID_TRACKS} gap-[8px] pt-[12px] md:gap-[20px] md:pt-[16px]`}>
          {lines.map((line, i) => (
            <li key={line.oracleId} className={`${TILE_SHELL} bg-[color:var(--surface)] [border:1px_solid_var(--border)]`}>
              <div
                className={`relative overflow-hidden ${TILE_ART_CLIP}`}
                style={{ aspectRatio: TILE_ART_RATIO, background: "var(--surface-sunken)" }}
              >
                {line.imageUri ? (
                  <HydratedImg
                    src={line.imageUri}
                    eager={i < EAGER_TILES}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <CardTileCaption
                name={line.name}
                nameSub={<>{p.wants} <b className="font-semibold text-[color:var(--fg-body)]">{line.quantity}</b></>}
                compact
              />
            </li>
          ))}
        </ul>
      )}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
