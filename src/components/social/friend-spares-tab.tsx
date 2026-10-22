"use client";
// A friend's Spares tab (menu and Home PR 7; board `Friends`): the full cards the friend offers, each with its spare
// count, cards on the reader's wishlist first and marked with the wishlist bookmark. View only: a press opens card
// details, and nothing asks for the card (the request flow is a later round, G5).

import type { FriendSpareList } from "../../lib/social/spares";
import { socialCopy } from "../../lib/copy/social";
import { CARD_GRID_TRACKS } from "../ui/card-grid";
import { CardDetailProvider, CardDetailTrigger, cardDetailCopy, type SiblingCard } from "../cards/card-detail-provider";
import { WISHLIST_TILE_SHELL, WishlistTileFace, wishlistCaptionText, type WishlistTileCard } from "../wishlist/wishlist-tile";
import { Bookmark } from "../wishlist/card-wishlist";

const p = socialCopy.friendPage;
const EAGER_TILES = 4;

export function FriendSparesTab({ name, spares }: { name: string; spares: FriendSpareList | null }) {
  if (spares === null) return <Empty title={p.spares.noneTitle(name)} body={p.spares.noneBody(name)} />;
  if (spares.lines.length === 0) return <Empty title={p.spares.emptyTitle(name)} body={p.spares.emptyBody(name)} />;
  const { lines } = spares;
  const siblings: SiblingCard[] = lines.map((l) => ({ oracleId: l.oracleId, name: l.name, imageUri: l.imageUri }));
  return (
    <>
      <p className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-faint)]">{p.spares.line(spares.pods)}</p>
      <CardDetailProvider>
        <ul className={`m-0 grid list-none p-0 ${CARD_GRID_TRACKS} gap-[8px] pt-[12px] md:gap-[20px] md:pt-[16px]`}>
          {lines.map((line, i) => {
            const tile: WishlistTileCard = {
              name: line.name,
              imageUri: line.imageUri,
              want: line.spare,
              have: null,
              caption: [{ text: p.spares.count(line.spare), strong: true }, ...(line.onWishlist ? [{ text: ` · ${p.spares.onWishlist}` }] : [])],
            };
            return (
              <li key={line.oracleId} className="relative flex flex-col">
                <CardDetailTrigger
                  oracleId={line.oracleId}
                  name={line.name}
                  siblings={siblings}
                  imageUri={line.imageUri}
                  ariaLabel={`${cardDetailCopy.triggerAria(line.name)}, ${wishlistCaptionText(tile)}`}
                  className={`${WISHLIST_TILE_SHELL} art-lift-host md:hover:border-[color:var(--accent)] transition-colors`}
                >
                  <WishlistTileFace tile={tile} eager={i < EAGER_TILES} />
                </CardDetailTrigger>
                {line.onWishlist && (
                  <span aria-hidden data-testid="spare-on-wishlist" className="pointer-events-none absolute right-[7px] top-[7px] flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-[color:var(--bg)] text-[color:var(--accent-text)]">
                    <Bookmark filled />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </CardDetailProvider>
    </>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-[16px] flex flex-col gap-[6px] rounded-[12px] px-[20px] py-[22px] [border:1px_dashed_var(--border-dashed)] md:mt-[18px] md:px-[32px] md:py-[30px]">
      <p className="m-0 font-display text-[18px] font-bold text-[color:var(--fg)] [overflow-wrap:anywhere] md:text-[19px]">{title}</p>
      <p className="m-0 max-w-[600px] text-[14px] leading-[1.6] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">{body}</p>
    </div>
  );
}
