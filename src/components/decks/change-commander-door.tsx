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
import { useCardDetail, useCardIntent } from "../cards/card-detail-provider";
import { deckHeaderCopy } from "../../lib/copy/decks-builder";
import { changeCommanderCopy as copy } from "../../lib/copy/change-commander";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SwapGlyph } from "./change-commander-glyph";
import { useChangeCommander } from "./change-commander-context";
import { ChangeCommanderSheet } from "./change-commander-sheet";

const PLATE =
  "pointer-events-none absolute rounded-[7px] border border-[color:var(--border-strong)] bg-[color:var(--bg)]";

type Width = "desktop" | "mobile";

/**
 * Where the sheet portals: a host PREPENDED to `<main>`. Out of the spine, because the other spine
 * is `display: none` and a fixed sheet inside it would never draw; inside `<main>`, where every
 * other sheet on the page lives (and what `onPage` scopes). And FIRST in it: the card modal a
 * candidate's name opens is a later child at the same `z-50`, so it paints above the sheet only
 * while the sheet comes earlier in the document (the receipt's rule, `receipt-modal.tsx`).
 */
function useSheetHost(open: boolean): HTMLElement | null {
  // Made once, on the client (the server never opens a sheet), and attached only while open.
  const [host] = useState<HTMLElement | null>(() => (typeof document === "undefined" ? null : document.createElement("div")));
  // Before paint, so the sheet never draws a frame outside the page.
  useLayoutEffect(() => {
    if (!open || !host) return;
    (document.querySelector("main") ?? document.body).prepend(host);
    return () => host.remove();
  }, [open, host]);
  return host;
}

/** The sheet, from the door that opened it. */
function Sheet({ width }: { width: Width }) {
  const door = useChangeCommander();
  const open = door !== null && door.openFrom === width;
  const host = useSheetHost(open);
  if (!door || !open || !host) return null;
  return createPortal(
    <ChangeCommanderSheet
      deckId={door.deckId}
      deckName={door.deckName}
      pair={door.pair}
      hasVersion={door.hasVersion}
      onClose={door.closeSheet}
    />,
    host,
  );
}

export function ChangeCommanderDoor({
  oracleId, width, hasCrop,
}: {
  oracleId: string;
  width: Width;
  /** With no crop there is no printing to open, so the card-details half is absent (§G) and the
   *  ⇄ half is drawn alone. */
  hasCrop: boolean;
}) {
  const door = useChangeCommander();
  const { open, pendingOracleId } = useCardDetail();
  const intent = useCardIntent(oracleId);
  if (!door) {
    // Today's control, exactly, and exactly when today drew it.
    return hasCrop ? (
      <FullCardTrigger
        oracleId={oracleId}
        placement={width === "desktop" ? "deck-desktop" : "deck-mobile"}
        bandTapTarget={false}
      />
    ) : null;
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
        {hasCrop ? (<>
        <button
          type="button"
          aria-label="View card details"
          aria-busy={pending}
          onClick={() => open(oracleId)}
          {...intent}
          className="relative flex h-[44px] items-center bg-transparent p-0 font-mono whitespace-nowrap text-[color:var(--fg)]"
          style={{ gap: 6, padding: "0 9px", fontSize: 11, cursor: "pointer" }}
        >
          {detailsGlyph}
          <span style={{ lineHeight: 1, opacity: pending ? PENDING_OPACITY : undefined }}>
            {deckHeaderCopy.cardDetails}
          </span>
        </button>
        <span aria-hidden="true" className="relative" style={{ width: 1, height: 26, background: "var(--border-strong)" }} />
        </>) : null}
        <button
          type="button"
          onClick={() => door.openSheet("desktop")}
          className="relative flex h-[44px] items-center bg-transparent p-0 font-mono whitespace-nowrap text-[color:var(--fg)]"
          style={{ gap: 6, padding: "0 9px", fontSize: 11, cursor: "pointer" }}
        >
          <SwapGlyph />
          <span style={{ lineHeight: 1 }}>{label}</span>
        </button>
        <Sheet width="desktop" />
      </div>
    );
  }

  // Phone: a 26px-wide vertical pair, swap over details, 53 tall, its bottom raised to 23 so the
  // lower half's 44px target clears the band's edge. Each half's target overhangs the plate by the
  // same 17.5px outward, so the two meet at the divider and neither covers the other.
  if (!hasCrop) {
    // No crop: the ⇄ half alone, as the icon-only trigger sits (26px plate, 44px target).
    return (
      <div data-testid="change-commander-door" className="absolute z-[2]" style={{ right: 16 - 9, bottom: 14 - 9, width: 44, height: 44 }}>
        <span className={PLATE} style={{ left: 9, right: 9, top: 9, bottom: 9 }} />
        <button
          type="button"
          aria-label={copy.door.aria}
          onClick={() => door.openSheet("mobile")}
          className="absolute inset-0 flex items-center justify-center bg-transparent p-0 text-[color:var(--fg)]"
          style={{ cursor: "pointer" }}
        >
          <SwapGlyph />
        </button>
        <Sheet width="mobile" />
      </div>
    );
  }
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
        // Icon only, so the handoff's one accessible name: `door.aria`.
        aria-label={copy.door.aria}
        onClick={() => door.openSheet("mobile")}
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
        {...intent}
        className="absolute flex items-center justify-center bg-transparent p-0"
        style={{ left: 0, width: 44, top: half, height: 44, paddingBottom: overhang, cursor: "pointer" }}
      >
        {detailsGlyph}
      </button>
      <Sheet width="mobile" />
    </div>
  );
}
