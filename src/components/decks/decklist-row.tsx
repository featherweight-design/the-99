"use client";

// Decklist Row — single card row with ownership dot, name, buy tag, remove button.
// §Decklist Row (design table), §3 #179 and §4 #185 (add-panel addendum table).

import { addCardToDeck, removeCardFromDeck } from "../../app/decks/actions";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { OwnershipDot } from "../ui/ownership-dot";
import { CardDetailTrigger } from "./card-detail-provider";
import { MutationError } from "./mutation-error";
import {
  useAnnounceUndo,
  useMarkSlotSpent,
  useRemoveOptimisticCard,
  useReportRemoveFailure,
  useSettleUndo,
  useUndoRemovedCard,
} from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";

// Both rows are the same slot at both widths: phone 44px with the ✕'s own hit
// box making up the vertical padding, desktop 34px with real padding.
const ROW_SHELL =
  "flex items-center gap-[9px] md:gap-[10px] pl-[8px] pr-[4px] md:px-[9px] md:py-[7px]" +
  " min-h-[44px] md:min-h-[34px] rounded-[6px] md:rounded-[7px]";

interface DecklistRowProps {
  deckId: string;
  card: DeckDetailCard;
  /** When true, this is a "+N more" meta row for basic lands with quantity > 1. */
  isMeta?: boolean;
  /** Label override for meta rows ("+N more"). */
  metaLabel?: string;
  /** The decklist in display order, so the modal's Prev/Next page through it. */
  siblings?: string[];
  /**
   * The decklist says this card's slot is spent, so the row draws its undo
   * receipt instead. Decklist state rather than row state: the row unmounts
   * with the card, and a receipt that lived here would not survive a tab
   * switch to Consider and back.
   */
  spent?: boolean;
}

export function DecklistRow({
  deckId,
  card,
  isMeta = false,
  metaLabel,
  siblings,
  spent = false,
}: DecklistRowProps) {
  const label = isMeta ? metaLabel! : card.name;
  const nameClass =
    "flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-left text-[12.5px] md:text-[13.5px]";
  const { isPending, error, run } = useDeckMutation(false, DECK_REMOVE_FALLBACK_MESSAGE);
  const removeOptimisticCard = useRemoveOptimisticCard();
  const markSlotSpent = useMarkSlotSpent();
  const reportRemoveFailure = useReportRemoveFailure();
  // A last-copy failure is the shell's to report: the row survives it now (the
  // spent slot keeps it mounted), so drawing its own message too would say the
  // same thing twice. A decremented stack, and a row with no shell above it,
  // still speak for themselves.
  const shellReportsFailure = reportRemoveFailure !== null && card.quantity <= 1;

  function handleRemove() {
    // Outside `run`: the slot and its announcement are ordinary state, which
    // React holds for the length of an async transition. Inside, they would
    // land only once the server answered — after the window they exist for.
    markSlotSpent(card);
    // Dispatched into the deck-wide list as well as this row's own state, or
    // the row vanishes while the header, the tab counts, the role strip and the
    // group heading all keep claiming it for the length of the round-trip.
    run(
      async () => {
        try {
          await removeCardFromDeck(deckId, card.oracleId);
        } catch (cause) {
          // Only when this was the last copy, because only then has the
          // prediction unmounted the row and left `run`'s message with nothing
          // to draw on. A decremented stack still has its own line to say it.
          if (shellReportsFailure) reportRemoveFailure(card.name);
          throw cause;
        }
      },
      () => removeOptimisticCard(card),
    );
  }

  // The decklist's spent slot is the sole trigger for the receipt, and the
  // decklist's optimistic removal is what makes the row disappear. Reading this
  // row's own mutation state as well would key the receipt to something that
  // outlives what it describes — that state never returns to false, so once a
  // card had been removed and put back, React reusing the row under the same
  // key would draw the receipt over a card that is in the deck.
  if (spent) return <UndoRow deckId={deckId} card={card} />;

  return (
    // Wrapper keeps the row and any error message as a single grid item.
    <div>
      {/* Row container */}
      <div className={`group ${ROW_SHELL} bg-[#1A160F] md:hover:bg-[#211C15]`}>
        {/* Ownership dot: solid green (owned) vs dashed hollow (unowned) */}
        {!isMeta && (
          <OwnershipDot
            owned={card.owned}
            className="w-[7px] h-[7px] md:w-[8px] md:h-[8px]"
            label={card.owned ? "Owned" : "Not owned"}
          />
        )}
        {/* For meta rows render a same-sized empty spacer so name aligns */}
        {isMeta && <span className="flex-none w-[7px] h-[7px] md:w-[8px] md:h-[8px]" aria-hidden />}

        {/* Card name — the click target for the detail modal (#127). A meta row names no card
            of its own, so it stays inert text. */}
        {isMeta ? (
          <span className={nameClass} style={{ color: "#8E8269" }}>
            {label}
          </span>
        ) : (
          <CardDetailTrigger
            oracleId={card.oracleId}
            name={card.name}
            siblings={siblings}
            className={nameClass}
            style={{ color: "#EDE6D8", background: "transparent", border: "none", padding: 0 }}
          >
            {label}
          </CardDetailTrigger>
        )}

        {/* Buy tag — unowned non-meta only */}
        {!isMeta && !card.owned && (
          <span
            className="font-mono text-[9px] md:text-[9.5px] rounded-[4px] px-[5px] py-[1px] flex-none"
            style={{ color: "#E0913C", background: "rgba(224,145,60,0.13)" }}
          >
            buy
          </span>
        )}

        {/* Remove ✕ — at both widths now, never on a meta row. The glyph stays
            13px at both: the phone target is the padding around it. */}
        {!isMeta && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="flex-none flex items-center justify-center w-[44px] h-[44px] md:w-auto md:h-auto
              rounded-[6px] bg-transparent border-none text-[13px] leading-none text-[#4A4033]
              active:bg-[#2A241D] active:text-[#C6B79A] md:active:bg-transparent
              md:group-hover:text-[#C6B79A] cursor-pointer disabled:opacity-50 disabled:cursor-default"
            aria-label={
              card.quantity > 1
                ? addPanelCopy.row.removeCopyAria(card.name, card.quantity)
                : addPanelCopy.row.removeAria(card.name)
            }
          >
            {addPanelCopy.row.remove}
          </button>
        )}
      </div>
      {error && !shellReportsFailure && <MutationError message={error} />}
    </div>
  );
}

/**
 * The receipt a spent slot leaves behind. No toast and no timer: #185 exists
 * because the optimistic path makes the row vanish faster than a mis-click is
 * noticed, and a five-second toast that also vanishes fixes half of that.
 *
 * Undo is a re-add rather than a rollback — the same `addCardToDeck` the
 * suggestion tile calls, with this row's own optimistic add. No new server
 * action and no new server state.
 */
function UndoRow({ deckId, card }: { deckId: string; card: DeckDetailCard }) {
  const { isPending, error, run } = useDeckMutation(false, addPanelCopy.undo.failed);
  const undoRemovedCard = useUndoRemovedCard();
  const announceUndo = useAnnounceUndo();
  const settleUndo = useSettleUndo();

  function handleUndo() {
    // Announced from the click for the same reason the removal is: see
    // `handleRemove` above.
    announceUndo(card);
    run(
      async () => {
        const result = await addCardToDeck(deckId, card.oracleId);
        // Only a successful re-add settles the slot. Dropping it on the click
        // would unmount this row, and a refused undo would have nowhere left
        // to say so.
        if (!result || result.ok) settleUndo();
        return result;
      },
      () => undoRemovedCard(card),
    );
  }

  return (
    <div>
      <div className={`${ROW_SHELL} bg-surface-sunken border border-dashed border-border-strong`}>
        {/* No dot on a spent slot — the spacer keeps the name aligned with the
            live rows above and below it. */}
        <span className="flex-none w-[7px] h-[7px] md:w-[8px] md:h-[8px]" aria-hidden />
        <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis font-mono text-[11.5px] md:text-[12px] text-fg-locked">
          {addPanelCopy.undo.removed(card.name)}
        </span>
        {/* Absent once the undo has been refused: the message below tells the
            player where to go instead. */}
        {!error && (
          <button
            type="button"
            onClick={handleUndo}
            disabled={isPending}
            className="flex-none flex items-center h-[44px] px-[12px] md:h-auto md:px-0
              bg-transparent border-0 md:border-b md:border-brass-shadow
              text-[13px] md:text-[12.5px] font-semibold md:leading-[1.4]
              text-brass md:hover:text-brass-hover cursor-pointer disabled:opacity-50 disabled:cursor-default"
            aria-label={addPanelCopy.undo.actionAria(card.name)}
          >
            {addPanelCopy.undo.action}
          </button>
        )}
      </div>
      {error && <MutationError message={error} />}
    </div>
  );
}
