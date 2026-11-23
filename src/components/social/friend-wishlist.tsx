"use client";
// A friend's wishlist, view only (Social R2 P3; menu and Home PR 7: the Wishlist tab). Its tiles are the Wishlist tab's own
// (`WishlistTileFace`), captioned `wants N` and never an owned count, with no stepper; a press opens card details as on the
// tab. A collected card has left the list (round 3), so there is no collected state.

import { useState } from "react";
import type { FriendWishlistLine } from "../../lib/social/wishlist";
import type { HaveItCard } from "../../lib/social/spare-offers";
import { PersonText, type ThirdPartyName } from "../../lib/person-name";
import { socialCopy } from "../../lib/copy/social";
import { CARD_GRID_TRACKS } from "../ui/card-grid";
import { CardDetailProvider, CardDetailTrigger, cardDetailCopy, type SiblingCard } from "../cards/card-detail-provider";
import { WISHLIST_TILE_SHELL, wishlistCaptionText, type WishlistTileCard } from "../wishlist/wishlist-tile";
import { HaveCallout, HavePress, HaveSheet, HaveTileFace, type HaveFilter } from "./friend-wishlist-have";

const p = socialCopy.friendPage;

/** How many tiles ask for their art in the server HTML: the first screen, as the collection grid does. */
const EAGER_TILES = 4;

export function FriendWishlist({ name, friendPublicId, lines, haves }: {
  name: ThirdPartyName; friendPublicId: string; lines: FriendWishlistLine[]; haves: HaveItCard[];
}) {
  // The cards the reader can spare, as the read found them; a write's reply patches one card for the visit.
  const [patches, setPatches] = useState<Record<string, Partial<HaveItCard>>>({});
  const [filter, setFilter] = useState<HaveFilter>("all");
  const [opened, setOpened] = useState<string | null>(null);
  const have = new Map(haves.map((c) => [c.oracleId, { ...c, ...patches[c.oracleId] }]));
  const spareLines = lines.filter((l) => have.has(l.oracleId));
  const shown = filter === "spare" ? spareLines : lines;
  const openedLine = opened ? lines.find((l) => l.oracleId === opened) : undefined;
  const openedHave = opened ? have.get(opened) : undefined;
  // The tiles in their order, so card details steps through the friend's list.
  const siblings: SiblingCard[] = lines.map((l) => ({ oracleId: l.oracleId, name: l.name, imageUri: l.imageUri }));
  return (
    <>
      <h2 className="m-0 mt-[22px] flex items-baseline gap-[10px] pb-[10px] [border-bottom:1px_solid_var(--border)] md:mt-[28px]">
        {/* A name may be 30 unbroken characters: the title shrinks and truncates, and the count and `view only` keep their place. */}
        <span className="min-w-0 truncate font-sans text-[16px] font-semibold text-[color:var(--fg)] md:text-[19px]"><PersonText text={p.head(name)} /></span>
        <span className="flex-none font-mono text-[13px] font-normal text-[color:var(--fg-faint)]">{lines.length}</span>
        <span className="ml-auto flex-none font-mono text-[13px] font-normal text-[color:var(--fg-faint)]">{p.viewOnly}</span>
      </h2>

      <HaveCallout
        names={spareLines.map((l) => l.name)}
        haves={spareLines.map((l) => have.get(l.oracleId)!)}
        total={lines.length}
        filter={filter}
        onFilter={setFilter}
      />

      {lines.length === 0 ? (
        <div className="mt-[16px] flex items-center gap-[28px] rounded-[12px] px-[20px] py-[22px] [border:1px_dashed_var(--border-dashed)] md:mt-[18px] md:px-[32px] md:py-[30px]">
          <div aria-hidden className="relative hidden h-[103px] w-[104px] flex-none md:block">
            <span className="absolute left-0 top-0 h-[103px] w-[74px] rounded-[7px] [border:1px_dashed_var(--border-dashed)]" />
            <span className="absolute left-[30px] top-0 h-[103px] w-[74px] rotate-[4deg] rounded-[7px] [border:1px_dashed_var(--border-dashed)]" />
          </div>
          <div className="flex min-w-0 flex-col gap-[6px]">
            <p className="m-0 font-display text-[18px] font-bold text-[color:var(--fg)] [overflow-wrap:anywhere] md:text-[19px]"><PersonText text={p.emptyTitle(name)} /></p>
            <p className="m-0 max-w-[600px] text-[14px] leading-[1.6] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]"><PersonText text={p.emptyBody(name)} /></p>
          </div>
        </div>
      ) : (
        <CardDetailProvider>
          <ul className={`m-0 grid list-none p-0 ${CARD_GRID_TRACKS} gap-[8px] pt-[12px] md:gap-[20px] md:pt-[16px]`}>
            {shown.map((line, i) => {
              const tile: WishlistTileCard = { name: line.name, imageUri: line.imageUri, want: line.quantity, have: null };
              const mine = have.get(line.oracleId);
              return (
              <li key={line.oracleId} className="relative flex flex-col">
                {/* The whole tile is the press that opens card details, as on the Wishlist tab. */}
                <CardDetailTrigger
                  oracleId={line.oracleId}
                  name={line.name}
                  siblings={siblings}
                  imageUri={line.imageUri}
                  ariaLabel={`${cardDetailCopy.triggerAria(line.name)}, ${wishlistCaptionText(tile)}`}
                  className={`${WISHLIST_TILE_SHELL} art-lift-host md:hover:border-[color:var(--accent)] transition-colors`}
                >
                  <HaveTileFace tile={tile} eager={i < EAGER_TILES} press={spareLines.length > 0} />
                </CardDetailTrigger>
                {mine ? <HavePress line={line} have={mine} open={opened === line.oracleId} onOpen={() => setOpened(line.oracleId)} /> : null}
              </li>
              );
            })}
          </ul>
          {openedLine && openedHave ? (
            <HaveSheet
              line={openedLine}
              have={openedHave}
              friend={name}
              friendPublicId={friendPublicId}
              onClose={() => setOpened(null)}
              onChange={(patch) => setPatches((p) => ({ ...p, [openedLine.oracleId]: { ...p[openedLine.oracleId], ...patch } }))}
            />
          ) : null}
        </CardDetailProvider>
      )}
    </>
  );
}
