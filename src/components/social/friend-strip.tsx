"use client";
// The strip under a friend's head: Spares, Wishlist, Decks (menu and Home PR 7), the Collection place's own `PlaceStrip`
// with each tab's figure after its label. Mounted once by the page group's layout, so a tab press swaps the page below
// and never remounts it. A tab with no figure is absent (every tab follows Friends alone now the wishlist's switch is retired).

import { usePathname } from "next/navigation";
import { socialCopy } from "../../lib/copy/social";
import { PlaceStrip, type PlaceTab } from "../place/place-strip";

const p = socialCopy.friendPage;

export type FriendTab = "spares" | "wishlist" | "decks";

/** Which tab a path is, for a friend's public id; null for any other path. */
export function friendTabFromPathname(pathname: string, publicId: string): FriendTab | null {
  const base = `/friends/${publicId}`;
  if (pathname === base) return "spares";
  if (pathname === `${base}/wishlist`) return "wishlist";
  if (pathname === `${base}/decks`) return "decks";
  return null;
}

/** The board's friend strip: 18 under the head and bled to the phone's edges, flush left from desktop. */
const FRIEND_STRIP_FRAME = "mt-[18px] -mx-[14px] pl-[6px] pr-[4px] md:mx-0 md:mt-[22px] md:px-0";

export function FriendStrip({
  publicId,
  counts,
}: {
  publicId: string;
  /** Each drawn tab's figure; a tab with no entry is not drawn. Spares is first, as the board draws. */
  counts: Partial<Record<FriendTab, number>>;
}) {
  const current = friendTabFromPathname(usePathname(), publicId) ?? "spares";
  const base = `/friends/${publicId}`;
  const all: (PlaceTab & { place: FriendTab })[] = [
    { place: "spares", href: base, label: p.tabs.spares, count: counts.spares },
    { place: "wishlist", href: `${base}/wishlist`, label: p.tabs.wishlist, count: counts.wishlist },
    { place: "decks", href: `${base}/decks`, label: p.tabs.decks, count: counts.decks },
  ];
  const tabs = all.filter((t) => t.count !== undefined || t.place === current);
  return <PlaceStrip tabs={tabs} current={current} ariaLabel={p.tabsAria} testIdPrefix="friend-tab" frame={FRIEND_STRIP_FRAME} />;
}
