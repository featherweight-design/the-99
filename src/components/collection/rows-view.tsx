"use client";
// Dense rows view per property table §Collection Row (State 1a).
// Grid columns:
//   mobile:  38px 40px 1fr auto              (qty · pips · name+type · set)
//   desktop: 52px 54px 1fr 150px 92px 18px   (qty · pips · name · type · set/rarity · chevron)
// Rarity dot colors per §Rarity Dot Colors.

import type { BrowseCard } from "../../lib/collection/browse";
import { WUBRG_HEX } from "../../lib/collection/browse";

const RARITY_DOT: Record<BrowseCard["rarity"], string> = {
  common: "#A89B84", uncommon: "#B7C4CE", rare: "#C9A24B", mythic: "#E0913C",
};

export function RowsView({
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
    // §Rows Scroll Container: flex-1, padding 2px 12px 12px mobile / 12px 34px 34px desktop, flex column, gap 6/7px
    <div className="flex-1 flex flex-col gap-[6px] md:gap-[7px] px-[12px] md:px-[34px] pt-[2px] md:pt-[12px] pb-[12px] md:pb-[34px]">
      {cards.map((c) => (
        <button
          key={c.oracleId}
          type="button"
          onClick={() => onOpen(c.oracleId)}
          // §Row Container: grid template columns, gap 10/16px, padding 10px 12px / 12px 18px, radius 8px, bg #1E1A15 (--surface), border 1px #2A241D (--border)
          className="grid items-center text-left rounded-lg gap-[10px] md:gap-[16px] py-[10px] md:py-[12px] px-[12px] md:px-[18px] md:cursor-pointer hover:bg-[color:var(--surface-raised)] hover:[border:1px_solid_var(--border-strong)] md:[grid-template-columns:52px_54px_1fr_150px_92px_18px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            gridTemplateColumns: "38px 40px 1fr auto",
          }}
        >
          {/* Quantity — §Row: Quantity Column: mono 13px mobile / 14px desktop, #C9A24B (--brass), font-weight 500 */}
          <span className="font-mono text-[13px] md:text-[14px] font-medium" style={{ color: "var(--brass)" }}>
            ×{c.quantity}
          </span>

          {/* Color pips — §Row: Color Pip Container: gap 3/4px; pips 11×11 mobile / 13×13 desktop */}
          <span className="flex gap-[3px] md:gap-[4px]">
            {c.colorIdentity.length === 0 ? (
              <span
                aria-hidden
                className="w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-full"
                style={{ background: "#8E8269", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)" }}
              />
            ) : c.colorIdentity.map((col) => (
              <span
                key={col}
                aria-hidden
                className="w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-full"
                style={{ background: WUBRG_HEX[col] ?? "#8E8269", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)" }}
              />
            ))}
          </span>

          {/* Name column — §Row: Name Column Container: min-width 0 */}
          <span className="min-w-0">
            {/* §Row: Card Name — 14/15px 600, #EDE6D8 (--fg), ellipsis */}
            <span className="block truncate text-[14px] md:text-[15px] font-semibold" style={{ color: "var(--fg)" }}>
              {c.name}
            </span>
            {/* Mobile type line — §Row: Type Line (mobile): 11.5px, #8E8269 (--fg-faint), truncate */}
            <span className="block md:hidden truncate text-[11.5px]" style={{ color: "var(--fg-faint)" }}>
              {c.typeLine}
            </span>
          </span>

          {/* SetRarityColumn: mobile set code + desktop type/set/rarity/chevron columns */}
          <SetRarityColumn card={c} />
        </button>
      ))}

      {cards.length < totalCards && (
        <button
          type="button"
          onClick={onShowMore}
          className="mt-[6px] mx-auto rounded-lg font-sans text-[13px] font-semibold px-[16px] py-[9px]"
          style={{
            color: "var(--brass)",
            background: "transparent",
            border: "1px solid var(--border-strong)",
          }}
        >
          Show more ({(totalCards - cards.length).toLocaleString()} more)
        </button>
      )}
    </div>
  );
}

function SetRarityColumn({ card }: { card: BrowseCard }) {
  return (
    <>
      {/* Mobile: single trailing set code — §Row: Set Code (mobile): mono 10.5px, #8E8269 (--fg-faint), letter-spacing 0.04em */}
      <span
        className="md:hidden font-mono text-[10.5px] tracking-[0.04em] text-right"
        style={{ color: "var(--fg-faint)" }}
      >
        {card.primarySetCode}
      </span>

      {/* Desktop-only trailing spans — displayed only ≥md */}
      <span
        className="hidden md:block truncate font-sans text-[12.5px]"
        style={{ color: "var(--fg-muted)" }}
      >
        {card.typeLine}
      </span>
      <span className="hidden md:flex items-center gap-[8px]">
        <span
          aria-hidden
          className="w-[7px] h-[7px] rounded-full block"
          style={{ background: RARITY_DOT[card.rarity] }}
        />
        <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {card.primarySetCode}
        </span>
      </span>
      <span className="hidden md:block text-[14px]" style={{ color: "var(--fg-faint)" }}>
        ›
      </span>
    </>
  );
}
