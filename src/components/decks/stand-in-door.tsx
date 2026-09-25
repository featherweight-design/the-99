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
import { priceOf, priceState } from "../../lib/decks/price";
import { formatLimit, isOverLimit } from "../../lib/swaps/limit";
import { landOnReceipt } from "./swap-receipt";

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

  const taken = tools?.receipts.findLast((r) => r.cutOracleId === card.oracleId);
  // Closing a card that has been swapped out lands on its receipt, where Undo swap lives (addendum
  // §3). The row that opened the card is gone with its last copy, so the dialog's own focus return
  // drops to the page. Read at unmount through a ref, since paging changes the card under this door.
  const takenId = useRef<string | null>(null);
  useEffect(() => {
    takenId.current = taken?.swapId ?? null;
  });
  // The same hold the sheet's close uses (`landOnReceipt`): a card closed before the take's revalidated
  // page lands would otherwise focus a receipt the page then draws again, dropping focus to the body.
  // Only when the card itself closed: paging or a combo partner replaces the door under a modal that
  // stays open, and the helper leaves focus in that modal.
  useEffect(
    () => () => {
      if (takenId.current) landOnReceipt(takenId.current);
    },
    [],
  );

  if (!tools) return null;
  const figure = formatLimit(tools.limitCents);
  const over = isOverLimit(card.price, newestAsOf, tools.limitCents);
  // "Under your limit" is a claim about a figure, so a card with no figure to draw (no price, or
  // sold out at the newest run) makes no claim at all: `isOverLimit` is false for those too, and
  // reading its negation as "under" would make an unknown price sound cheap.
  const priced = card.price ? priceOf(card.price, priceState(card.price, newestAsOf)) !== null : false;
  const line = taken ? copy.swapped(taken.add) : over ? copy.overLimit(figure) : priced ? copy.underLimit(figure) : null;
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
      {line ? <span className="whitespace-nowrap font-mono text-[10.5px]" style={{ color: ink }}>{line}</span> : null}
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
  // The locked cards among the rows, as one key. The provider calls the renderer during its OWN
  // render, before the effect above refreshes `rows`, so a lock that lands, settles or reverts while
  // a card is open would leave its door as it was. Re-registering on this key hands the provider a
  // new renderer, which re-renders it against the fresh rows; nothing else churns the registration.
  const lockedKey = shoppingCards.filter((c) => c.locked).map((c) => c.oracleId).join(" ");
  useEffect(
    () =>
      registerDoor((oracleId, layout) => {
        const { shoppingCards: list, receipts, newestAsOf: asOf } = rows.current;
        const card = list.find((c) => c.oracleId === oracleId)
          ?? receipts.findLast((r) => r.cutOracleId === oracleId)?.cutCard;
        // No door for a card the player LOCKED in this deck (Locked, L4 and PR 6): offering stand-ins
        // is offering to cut it. The modal says nothing else about the lock; the door is simply
        // absent, as the Shopping row's ⇄ is. `locked` comes off the list the page draws, so a lock
        // pressed a moment ago hides it before the server has settled.
        return card && !card.locked ? <StandInDoor card={card} layout={layout} newestAsOf={asOf} /> : null;
      }),
    // `lockedKey` is read by nothing inside: it is here to re-register (see above).
    [registerDoor, lockedKey],
  );
  return null;
}
