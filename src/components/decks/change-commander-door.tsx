"use client";
// The door to Change commander (handoff R3-E): ONE joined plate on the commander's art, the card
// details control and the new one side by side on desktop and stacked on a phone. It takes the
// place `FullCardTrigger` holds on the deck header, and draws exactly that control when the
// feature is off — the provider is only mounted with `CHANGE_COMMANDER_ENABLED` on, so a deck page
// without it reads `useChangeCommander()` as null and renders today's trigger unchanged (audit F6).
//
// THE PLATE is FullCardTrigger's: opaque `--bg` under one `--border-strong` hairline at radius 7,
// 26px drawn, each half its own 44px target. The two halves are divided by a hairline in the same
// ink. Opaque for the same reason as there: ink on `--bg` is the page's own body contrast.

import { FullCardTrigger } from "../commanders/full-card-trigger";
import { PENDING_OPACITY } from "../commanders/pending";
import { useCardDetail } from "../cards/card-detail-provider";
import { deckHeaderCopy } from "../../lib/copy/decks-builder";
import { changeCommanderCopy as copy } from "../../lib/copy/change-commander";
import { useChangeCommander } from "./change-commander-context";

const PLATE =
  "pointer-events-none absolute rounded-[7px] border border-[color:var(--border-strong)] bg-[color:var(--bg)]";

/** The swap mark: two arrows, inline so it inks with `currentColor` in every theme. */
export function SwapGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <path
        d="M2 5h10.5M9.5 2l3 3-3 3M14 11H3.5M6.5 8l-3 3 3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Width = "desktop" | "mobile";

export function ChangeCommanderDoor({ oracleId, width }: { oracleId: string; width: Width }) {
  const door = useChangeCommander();
  const { open, pendingOracleId } = useCardDetail();
  if (!door) {
    return (
      <FullCardTrigger
        oracleId={oracleId}
        placement={width === "desktop" ? "deck-desktop" : "deck-mobile"}
        bandTapTarget={false}
      />
    );
  }
  const pending = pendingOracleId === oracleId;
  const label = door.pair ? copy.door.pair : copy.door.single;
  const detailsGlyph = (
    <span style={{ color: "var(--fg)", fontSize: 14, lineHeight: 1, opacity: pending ? PENDING_OPACITY : undefined }}>
      ⛶
    </span>
  );

  if (width === "desktop") {
    // Bottom-left at 16 / 14, as `deck-desktop` places the trigger: the 44px row is pulled down
    // by 9 so the 26px plate lands on the stated inset.
    return (
      <div
        data-testid="change-commander-door"
        className="absolute z-[2] flex items-center"
        style={{ left: 16, bottom: 14 - 9, height: 44 }}
      >
        <span className={PLATE} style={{ left: 0, right: 0, top: 9, bottom: 9 }} />
        <button
          type="button"
          aria-label="View card details"
          aria-busy={pending}
          onClick={() => open(oracleId)}
          className="relative flex h-[44px] items-center bg-transparent p-0 font-mono whitespace-nowrap text-[color:var(--fg)]"
          style={{ gap: 6, padding: "0 9px", fontSize: 11, cursor: "pointer" }}
        >
          {detailsGlyph}
          <span style={{ lineHeight: 1, opacity: pending ? PENDING_OPACITY : undefined }}>
            {deckHeaderCopy.cardDetails}
          </span>
        </button>
        <span aria-hidden="true" className="relative" style={{ width: 1, height: 26, background: "var(--border-strong)" }} />
        <button
          type="button"
          onClick={door.openSheet}
          className="relative flex h-[44px] items-center bg-transparent p-0 font-mono whitespace-nowrap text-[color:var(--fg)]"
          style={{ gap: 6, padding: "0 9px", fontSize: 11, cursor: "pointer" }}
        >
          <SwapGlyph />
          <span style={{ lineHeight: 1 }}>{label}</span>
        </button>
      </div>
    );
  }

  // Phone: a 26px-wide vertical pair, swap over details, 53 tall, its bottom raised to 23 so the
  // lower half's 44px target clears the band's edge. Each half's target overhangs the plate by the
  // same 17.5px outward, so the two meet at the divider and neither covers the other.
  const half = 53 / 2;
  // How far each 44px target reaches past its half of the plate; padding by it centres the
  // glyph on that half rather than on the target.
  const overhang = 44 - half;
  return (
    <div
      data-testid="change-commander-door"
      className="absolute z-[2]"
      style={{ right: 16 - 9, bottom: 23, width: 44, height: 53 }}
    >
      <span className={PLATE} style={{ left: 9, right: 9, top: 0, bottom: 0 }} />
      <span
        aria-hidden="true"
        className="absolute"
        style={{ left: 9, right: 9, top: half, height: 1, background: "var(--border-strong)" }}
      />
      <button
        type="button"
        aria-label={label}
        onClick={door.openSheet}
        className="absolute flex items-center justify-center bg-transparent p-0 text-[color:var(--fg)]"
        style={{ left: 0, width: 44, top: half - 44, height: 44, paddingTop: overhang, cursor: "pointer" }}
      >
        <SwapGlyph />
      </button>
      <button
        type="button"
        aria-label="View card details"
        aria-busy={pending}
        onClick={() => open(oracleId)}
        className="absolute flex items-center justify-center bg-transparent p-0"
        style={{ left: 0, width: 44, top: half, height: 44, paddingBottom: overhang, cursor: "pointer" }}
      >
        {detailsGlyph}
      </button>
    </div>
  );
}
