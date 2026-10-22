// The Wishlist tab's tile, as it draws (Social R2 PR 4, boards W1–W5 and WP1–WP5): the full card at the collection
// grid's 63/88 and the `have M of N` caption. Its own module so the tab, a friend's page (whose tiles read
// `wants N`, `have: null`) and About's `wishlist` specimen (the addendum's E1) render one tree, and so About imports
// the drawing alone: the tab's view also holds its search, its writes and the card details provider, none of which an
// inert specimen may reach.

import { wishlistCopy, type CopyPart } from "../../lib/copy/wishlist";
import { TILE_ART_CLIP, TILE_ART_RATIO, TILE_SHELL } from "../ui/card-tile-caption";
import { HydratedImg } from "../ui/hydrated-art";

/** What a tile draws. The tab's `WishlistViewTile` carries this and more. `have` is null on a friend's tile, which
 * reads `wants N` and never an owned count. */
export type WishlistTileCard = { name: string; imageUri: string | null; want: number; have: number | null };

/** The tile's outer box: the press on the tab and on a friend's page, a plain box in the specimen. */
export const WISHLIST_TILE_SHELL = `${TILE_SHELL} w-full text-left bg-[color:var(--surface)] border border-solid border-[color:var(--border)]`;

/** The caption's parts: `have M of N`, or `wants N` on a friend's tile (`have: null`). */
function captionParts(tile: WishlistTileCard): CopyPart[] {
  return tile.have === null ? wishlistCopy.tile.wants(tile.want) : wishlistCopy.tile.caption(tile.want, tile.have);
}

/** The caption as words, for the press's accessible name: the press's own label replaces its content's, so a name
 * without this would never speak the count. */
export function wishlistCaptionText(tile: WishlistTileCard): string {
  return captionParts(tile).map((p) => p.text).join("");
}

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
          <Parts
            parts={captionParts(tile)}
            strong="font-semibold text-[color:var(--fg-body)]"
          />
        </span>
      </span>
    </>
  );
}
