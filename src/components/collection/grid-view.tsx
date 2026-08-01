"use client";
// Card-art gallery per property table §Grid Tile (State 1b).
// Grid: 2-up mobile / 5-up desktop.
// Missing art → color-identity gradient (READINESS #4).

import type { BrowseCard } from "../../lib/collection/browse";
import { cssUrl } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import { GhostButton } from "../ui/button";

export function GridView({
  cards,
  totalCards,
  onShowMore,
  onOpen,
}: {
  cards: BrowseCard[];
  totalCards: number;
  onShowMore: () => void;
  onOpen: (oracleId: string) => void;
}) {
  return (
    // §Grid Container: grid, 1fr 1fr mobile / repeat(5,1fr) desktop, gap 12/16px, padding 4px 14px 14px mobile / 20px 34px 34px desktop
    <div className="grid grid-cols-2 md:grid-cols-5 gap-[12px] md:gap-[16px] px-[14px] md:px-[34px] pt-[4px] md:pt-[20px] pb-[14px] md:pb-[34px]">
      {cards.map((c) => (
        <button
          key={c.oracleId}
          type="button"
          onClick={() => onOpen(c.oracleId)}
          // §Grid Tile Container: radius 9/10px, overflow hidden, bg #1E1A15 (--surface), border 1px #2A241D (--border)
          // Background and border are utilities, not inline style: an inline
          // border outranks the hover: variant and the brass hover never lands.
          className="text-left overflow-hidden rounded-[9px] md:rounded-[10px] md:cursor-pointer bg-[color:var(--surface)] [border:1px_solid_var(--border)] hover:[border:1px_solid_var(--brass)]"
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
            {/* §Grid Tile: Quantity Badge — mono 11/12px 600, #14110E (--bg) on #C9A24B (--brass), radius 6px */}
            <span
              className="absolute font-mono font-semibold text-[11px] md:text-[12px] rounded-md top-[6px] md:top-[8px] right-[6px] md:right-[8px] px-[6px] md:px-[7px] py-[2px]"
              style={{ background: "var(--brass)", color: "var(--bg)" }}
            >
              ×{c.quantity}
            </span>
          </div>

          {/* Caption — §Grid Tile: Caption Area */}
          <div className="px-[9px] md:px-[11px] py-[7px] md:py-[9px] pb-[9px] md:pb-[11px]">
            {/* Name — 12/13px 600, ellipsis */}
            <div className="truncate text-[12px] md:text-[13px] font-semibold" style={{ color: "var(--fg)" }}>
              {c.name}
            </div>
            {/* Set/rarity caption — mono 9.5/10px, #8E8269 (--fg-faint) */}
            <div className="font-mono text-[9.5px] md:text-[10px] mt-[2px] md:mt-[3px]" style={{ color: "var(--fg-faint)" }}>
              <span className="md:hidden">{c.primarySetCode}</span>
              <span className="hidden md:inline">{c.primarySetCode} · {c.rarity}</span>
            </div>
          </div>
        </button>
      ))}

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
