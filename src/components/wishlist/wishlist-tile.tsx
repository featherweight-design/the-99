// The Wishlist tab's tile, as it draws (Social R2 PR 4, boards W1–W5 and WP1–WP5): the full card at the collection
// grid's 63/88 and the `want N · have M` caption. Its own module so the tab and About's `wishlist` specimen (the
// addendum's E1) render one tree, and so About imports the drawing alone: the tab's view also holds its search, its
// writes and the card details provider, none of which an inert specimen may reach.

import { wishlistCopy, type CopyPart } from "../../lib/copy/wishlist";
import { TILE_ART_CLIP, TILE_ART_RATIO, TILE_SHELL } from "../ui/card-tile-caption";
import { HydratedImg } from "../ui/hydrated-art";

/** What a tile draws. The tab's `WishlistViewTile` carries this and more. */
export type WishlistTileCard = { name: string; imageUri: string | null; want: number; have: number };

/** The tile's outer box: the press on the tab, a plain box in the specimen. */
export const WISHLIST_TILE_SHELL = `${TILE_SHELL} w-full text-left bg-[color:var(--surface)] border border-solid border-[color:var(--border)]`;

/** Copy parts as the boards draw them: a strong part in the caller's strong class. */
export function Parts({ parts, strong }: { parts: readonly CopyPart[]; strong: string }) {
  return (
    <>
      {parts.map((p, i) =>
        p.strong ? (
          <span key={i} className={strong}>
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/**
 * The tile's art and caption, everything inside its shell. Every element is a span, because on the tab the shell is
 * the button that opens card details, and a button holds phrasing content only.
 */
export function WishlistTileFace({ tile, eager }: { tile: WishlistTileCard; eager: boolean }) {
  return (
    <>
      <span
        className={`relative block w-full overflow-hidden ${TILE_ART_CLIP}`}
        style={{ aspectRatio: TILE_ART_RATIO, background: "var(--surface-sunken)" }}
      >
        {tile.imageUri && (
          <HydratedImg
            eager={eager}
            src={tile.imageUri}
            alt=""
            decoding="async"
            className="art-lift absolute inset-0 block h-full w-full object-cover object-center"
          />
        )}
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]" />
      </span>
      <span className="flex min-h-[54px] min-w-0 flex-col justify-center gap-[3px] px-[7px] pb-[8px] pt-[6px] md:min-h-[62px] md:gap-[4px] md:px-[10px] md:pb-[9px] md:pt-[7px]">
        <span className="truncate text-[12px] font-semibold leading-[16px] text-[color:var(--fg)] md:text-[13px] md:leading-[17px]">{tile.name}</span>
        <span data-testid="wishlist-tile-caption" className="truncate font-mono text-[9px] leading-[1.2] text-[color:var(--fg-faint)] md:text-[9.5px]">
          <Parts parts={wishlistCopy.tile.caption(tile.want, tile.have)} strong="font-semibold text-[color:var(--fg-body)]" />
        </span>
      </span>
    </>
  );
}
