import { ArtWash } from "../ui/art-wash";

/**
 * The deck header's desktop art, drawn by the loaded header and by its loading skeleton alike, so the two cannot disagree on
 * the crop, the portrait's width or its position: a skeleton that drew its own wash jumped the art when the page arrived.
 *
 * TWO geometries, both mounted, one shown by a CONTAINER query on the row that holds them (the caller's element carries
 * `@container`). The wash's stops are inline gradients computed from numbers, so no stylesheet can switch them. The
 * floor is 1200px OF ROW, not of viewport: the row sits beside a 62px desktop rail.
 */
export function DeckHeaderArt({ artCropUri, colorIdentity }: { artCropUri: string | null; colorIdentity: string[] }) {
  return (
    <>
      <div className="hidden @min-[1200px]:block" data-deck-header-art="wide">
        <ArtWash strategy="left-portrait" height={288} portrait={560} labelAtPx="flat" artCropUri={artCropUri} colorIdentity={colorIdentity} />
      </div>
      <div className="@min-[1200px]:hidden" data-deck-header-art="narrow">
        <ArtWash strategy="left-portrait" height={288} portrait={340} labelAtPx="flat" artCropUri={artCropUri} colorIdentity={colorIdentity} />
      </div>
    </>
  );
}

/** The label column's left inset on the same two geometries: past each portrait's flat stop (356px for 340, 560 for 560). */
export const DECK_HEADER_LABEL_INSET = "pl-[364px] @min-[1200px]:pl-[592px]";
