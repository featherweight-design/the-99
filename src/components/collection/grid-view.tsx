"use client";
// Card-art gallery per property table §Grid Tile (State 1b).
// Grid: 2-up mobile / 5-up desktop.
// Missing art → color-identity gradient (READINESS #4).

import type { BrowseListCard } from "../../lib/collection/browse";
import { cssUrl } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import { availabilityState } from "../../lib/decks/availability";
import { AvailabilityMarker } from "../ui/availability-marker";
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
    // §Grid Container: grid, 1fr 1fr mobile / repeat(5,1fr) desktop, gap 12/20px (desktop +4 per Surfaces v2 browse loosening; mobile stays v1), padding 4px 14px 14px mobile / 20px 34px 34px desktop
    <div className="grid grid-cols-2 md:grid-cols-5 gap-[12px] md:gap-[20px] px-[14px] md:px-[34px] pt-[4px] md:pt-[20px] pb-[14px] md:pb-[34px]">
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
            className="relative shadow-[inset_0_-40px_40px_-30px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(0,0,0,0.25)] md:shadow-[inset_0_-50px_50px_-34px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(0,0,0,0.25)]"
            style={{
              aspectRatio: "63/88",
              background: c.imageUri ? undefined : identityGradient(c.colorIdentity),
              backgroundImage: c.imageUri ? cssUrl(c.imageUri) : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* §Grid Tile: Quantity Badge — mono 11/12px 600, --bg on --accent, radius 6px */}
            <span
              className="absolute font-mono font-semibold text-[11px] md:text-[12px] rounded-md top-[6px] md:top-[8px] right-[6px] md:right-[8px] px-[6px] md:px-[7px] py-[2px]"
              style={{ background: "var(--accent)", color: "var(--bg)" }}
            >
              ×{c.quantity}
            </span>

            {/* Availability chip — Addendum 2 §2, top-left on the art. The
                quantity badge owns top-right. Chip density positions itself
                (row 2.1) and forces count-only, so no wrapper: a second
                positioned element here would offset the chip by its own inset.

                `spoken` because this tile, unlike the row, has no aria-label to
                hoist the prose into — the same call `suggestion-tile` makes. */}
            {c.availability && (
              <AvailabilityMarker availability={c.availability} density="chip" spoken />
            )}
          </div>

          {/* Caption — §Grid Tile: Caption Area */}
          <div className="px-[9px] md:px-[15px] py-[7px] md:py-[13px] pb-[9px] md:pb-[15px]">
            {/* Name — 12/13px 600, ellipsis */}
            <div className="truncate text-[12px] md:text-[13px] font-semibold" style={{ color: "var(--fg)" }}>
              {c.name}
            </div>
            {/* Set/rarity caption — mono 9.5/10px, --fg-faint */}
            <div className="font-mono text-[9.5px] md:text-[10px] mt-[2px] md:mt-[3px]" style={{ color: "var(--fg-faint)" }}>
              <span className="md:hidden">{c.primarySetCode}</span>
              <span className="hidden md:inline">{c.primarySetCode} · {c.rarity}</span>
            </div>
          </div>
        </button>
        );
      })}

      {cards.length < totalCards && (
        <GhostButton
          type="button"
          onClick={onShowMore}
          className="col-span-2 md:col-span-5 mx-auto text-[13px] px-[16px] py-[9px] mt-[6px]"
        >
          Show more ({(totalCards - cards.length).toLocaleString()} more)
        </GhostButton>
      )}
    </div>
  );
}
