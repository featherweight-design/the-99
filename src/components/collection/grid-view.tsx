"use client";
// Card-art gallery per property table §Grid Tile (State 1b).
// Grid: 2-up mobile / 5-up desktop.
// Missing art → color-identity gradient (READINESS #4).

import type { BrowseListCard } from "../../lib/collection/browse";
import { cssUrl, printedFaceName, printedNameOf } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import { availabilityState } from "../../lib/decks/availability";
import { AvailabilityMarker } from "../ui/availability-marker";
import { CardTileCaption } from "../ui/card-tile-caption";
import { GhostButton } from "../ui/button";

export function GridView({
  cards,
  totalCards,
  onShowMore,
  onOpen,
  pendingOracleId = null,
}: {
  cards: BrowseListCard[];
  totalCards: number;
  onShowMore: () => void;
  onOpen: (oracleId: string) => void;
  /** The tile whose card is being fetched, which shows the click landed. */
  pendingOracleId?: string | null;
}) {
  return (
    /* §Grid Container. The desktop track is a TILE FLOOR rather than a column
       count (card-captions readiness, erratum 5): `md:grid-cols-6` would begin
       at 768px, where this container has 638px of track and six columns is a
       90px tile — half the phone tile whose parity is the whole argument for the
       178px figure. A floor holds the tile and lets the count fall out: six at
       the 1300px reference width, three at 768.

       The phone keeps an explicit 2-up. At 390px the track is 362px, which one
       178px floor plus a gap already exceeds, so auto-fill there would collapse
       to a single column. */
    <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(178px,1fr))] gap-[12px] md:gap-[20px] px-[14px] md:px-[34px] pt-[4px] md:pt-[20px] pb-[14px] md:pb-[34px]">
      {cards.map((c) => {
        const state = c.availability ? availabilityState(c.availability) : "free";
        // Addendum 2 §2, matching the row: over-committed keeps its border tint
        // and nothing else.
        const border =
          state === "over"
            ? "[border:1px_solid_var(--avail-over-border)] hover:[border:1px_solid_var(--avail-over-border)]"
            : "[border:1px_solid_var(--border)] hover:[border:1px_solid_var(--accent)]";
        const pending = pendingOracleId === c.oracleId;
        return (
        <button
          key={c.oracleId}
          type="button"
          onClick={() => onOpen(c.oracleId)}
          // Never `disabled`, for the reason CardDetailTrigger states: disabling
          // the focused tile blurs it, and the modal's focus-return would then
          // have nothing to hand focus back to on close.
          aria-busy={pending}
          style={pending ? { opacity: 0.55 } : undefined}
          // §Grid Tile Container: radius 9/10px, overflow hidden, bg --surface, border 1px --border
          // Background and border are utilities, not inline style: an inline
          // border outranks the hover: variant and the accent hover never lands.
          className={`text-left overflow-hidden rounded-[9px] md:rounded-[10px] md:cursor-pointer bg-[color:var(--surface)] ${border}`}
        >
          {/* Art region — §Grid Tile: Art Region */}
          <div
            /* The bottom wash is gone with the marks it was holding off the art
               (call D). The 1px inner edge stays: it is not a scrim for a mark,
               it keeps a pale card frame from bleeding into the tile plate. */
            className="relative shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]"
            style={{
              aspectRatio: "63/88",
              background: c.imageUri ? undefined : identityGradient(c.colorIdentity),
              backgroundImage: c.imageUri ? cssUrl(c.imageUri) : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          {/* Caption. Everything that used to sit on the art is on the meta
              line: the availability chip in the slot, then the count. The set
              line right-aligns on that same line rather than taking a third row
              — it is already mono `--fg-faint`, so it belongs there. */}
          <CardTileCaption
            meta={
              <>
                {c.availability && (
                  <AvailabilityMarker
                    availability={c.availability}
                    density="chip"
                    plate={false}
                    spoken
                  />
                )}
                <span aria-hidden style={{ color: "var(--fg-body)" }}>
                  ×{c.quantity}
                </span>
              </>
            }
            metaTrail={
              <span style={{ color: "var(--fg-faint)" }}>
                <span className="md:hidden">{c.primarySetCode}</span>
                <span className="hidden md:inline">{c.primarySetCode} · {c.rarity}</span>
              </span>
            }
            /* The name printed on the copy the player owns, front face only,
               single line and never clamped. This surface carries no `//` mark
               (spec errata 3) — the set code below is the fact that explains the
               name.

               The tile is a real <button> whose accessible name is its text
               content, so the clipped caption is hidden from assistive tech and
               the whole name spoken from an sr-only sibling — rather than a
               renamed two-faced card being announced as its front face alone.
               For every card that is not renamed the two strings are identical
               and nothing moves. */
            name={printedFaceName(c)}
            nameHidden
            nameSpoken={<span className="sr-only">{printedNameOf(c)}</span>}
          />
        </button>
        );
      })}

      {cards.length < totalCards && (
        <GhostButton
          type="button"
          onClick={onShowMore}
          className="col-span-full mx-auto text-[13px] px-[16px] py-[9px] mt-[6px]"
        >
          Show more ({(totalCards - cards.length).toLocaleString()} more)
        </GhostButton>
      )}
    </div>
  );
}
