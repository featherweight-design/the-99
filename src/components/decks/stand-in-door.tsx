"use client";

/**
 * The card modal's door to a Shopping row's cheaper stand-ins (swap tools PR 4c, addendum §2). Drawn
 * only on a card opened from a Shopping row (audit F17): in the desktop art column under the price
 * tag, and as a 44px strip under the phone's art header.
 *
 * The limit line carries over or under in its own ink, and the price tag is left alone (audit F20).
 * After a take the link goes and the line says what came in, in `--success` and not a control: Undo
 * swap lives in the sheet and on the receipt only.
 */
import { useEffect, useRef } from "react";

import { useCardDetail } from "../cards/card-detail-provider";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { useSwapTools } from "../../lib/swaps/context";
import { formatLimit, isOverLimit } from "../../lib/swaps/limit";

const copy = swapToolsCopy.modal;

export function StandInDoor({
  card,
  layout,
  newestAsOf,
}: {
  card: DeckDetailCard;
  layout: "art" | "strip";
  newestAsOf: Date | null;
}) {
  const tools = useSwapTools();
  const button = useRef<HTMLButtonElement>(null);

  // Back from the sheet, focus lands on the door (addendum §3). The sheet's own focus return cannot
  // do it: at its unmount this card is still inert under it, and an inert control takes no focus.
  const open = tools?.standInsFromCard && tools.standIns?.oracleId === card.oracleId;
  const wasOpen = useRef(false);
  useEffect(() => {
    const closed = wasOpen.current && !open;
    wasOpen.current = Boolean(open);
    if (!closed) return;
    // The card comes back live a render after the sheet goes, so wait out the `inert` a frame at a time.
    let frame = 0;
    let tries = 0;
    const land = () => {
      const el = button.current;
      if (el && el.closest("[inert]") === null) el.focus();
      else if (tries++ < 10) frame = requestAnimationFrame(land);
    };
    frame = requestAnimationFrame(land);
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!tools) return null;
  const taken = tools.receipts.findLast((r) => r.cutOracleId === card.oracleId);
  const figure = formatLimit(tools.limitCents);
  const over = isOverLimit(card.price, newestAsOf, tools.limitCents);
  const line = taken ? copy.swapped(taken.add) : over ? copy.overLimit(figure) : copy.underLimit(figure);
  const ink = taken ? "var(--success)" : over ? "var(--warning)" : "var(--fg-faint)";

  const link = taken ? null : (
    <button
      ref={button}
      type="button"
      onClick={() => tools.openStandIns(card, "card")}
      className={
        "inline-flex items-center gap-[7px] whitespace-nowrap bg-transparent border-0 p-0 cursor-pointer "
        + "text-[13px] font-semibold text-[color:var(--accent)] "
        + (layout === "strip" ? "flex-none min-h-[44px] px-[10px]" : "")
      }
    >
      <span aria-hidden="true" className="font-mono">⇄</span>
      <span className="[border-bottom:1px_solid_var(--accent-shadow)]">{copy.seeStandIns}</span>
    </button>
  );

  if (layout === "strip") {
    return (
      <div
        data-testid="stand-in-door"
        className="flex items-center gap-[10px] min-h-[44px] pl-[16px] pr-[6px] border-b border-[color:var(--border)]"
        style={{ background: "var(--bg)" }}
      >
        <span className="flex-1 min-w-0 whitespace-nowrap font-mono text-[10.5px]" style={{ color: ink }}>{line}</span>
        {link}
      </div>
    );
  }
  return (
    <div data-testid="stand-in-door" className="flex flex-col items-center gap-[8px]">
      <span className="whitespace-nowrap font-mono text-[10.5px]" style={{ color: ink }}>{line}</span>
      {link}
    </div>
  );
}

/**
 * Hands the deck page's card modal its door (audit F17). The modal draws it only for a card a
 * Shopping row opened, and this finds that card among the rows, or among the takes' cuts once the
 * row has gone, so the door can say what came in.
 */
export function StandInDoorRegistration({
  shoppingCards,
  newestAsOf,
}: {
  shoppingCards: DeckDetailCard[];
  newestAsOf: Date | null;
}) {
  const tools = useSwapTools();
  const { registerDoor } = useCardDetail();
  const rows = useRef({ shoppingCards, receipts: tools?.receipts ?? [], newestAsOf });
  useEffect(() => {
    rows.current = { shoppingCards, receipts: tools?.receipts ?? [], newestAsOf };
  });
  useEffect(
    () =>
      registerDoor((oracleId, layout) => {
        const { shoppingCards: list, receipts, newestAsOf: asOf } = rows.current;
        const card = list.find((c) => c.oracleId === oracleId)
          ?? receipts.findLast((r) => r.cutOracleId === oracleId)?.cutCard;
        return card ? <StandInDoor card={card} layout={layout} newestAsOf={asOf} /> : null;
      }),
    [registerDoor],
  );
  return null;
}
