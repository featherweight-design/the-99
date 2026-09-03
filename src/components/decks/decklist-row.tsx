"use client";

// Decklist Row — single card row with ownership dot, name, buy tag, remove button.
// §Decklist Row (design table), §3 #179 and §4 #185 (add-panel addendum table).

import { addCardToDeck, removeCardFromDeck } from "../../app/decks/actions";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { availabilityState } from "../../lib/decks/availability";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { AvailabilityMarker } from "../ui/availability-marker";
import { OwnershipDot } from "../ui/ownership-dot";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { isBasicLand } from "../../lib/decks/grouping";
import { AutoTag } from "./auto-tag";
import { BuyTag } from "./buy-tag";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { MutationError } from "./mutation-error";
import {
  useAnnounceUndo,
  useMarkSlotSpent,
  useRemoveOptimisticCard,
  useReportRemoveFailure,
} from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";

// Both rows are the same slot at both widths: phone 44px with the ✕'s own hit
// box making up the vertical padding, desktop 34px with real padding.
// Exception: Shopping rows carry a meta line under the name (addendum A2), so
// the phone shell grows to 52px to accommodate it.
const ROW_SHELL =
  "flex items-center gap-[9px] md:gap-[10px] pl-[8px] pr-[4px] md:px-[9px] md:py-[7px]" +
  " min-h-[44px] md:min-h-[34px] rounded-[6px] md:rounded-[7px]";

const ROW_SHELL_SHOPPING =
  "flex items-center gap-[9px] md:gap-[10px] pl-[8px] pr-[4px] md:px-[9px] md:py-[7px]" +
  " min-h-[52px] md:min-h-[34px] rounded-[6px] md:rounded-[7px]";

interface DecklistRowProps {
  deckId: string;
  card: DeckDetailCard;
  /** The decklist in display order, so the modal's Prev/Next page through it. */
  siblings?: string[];
  /**
   * The decklist says this card's slot is spent, so the row draws its undo
   * receipt instead. Decklist state rather than row state: the row unmounts
   * with the card, and a receipt that lived here would not survive a tab
   * switch to Consider and back.
   */
  spent?: boolean;
  /**
   * EDHREC inclusion % for the Shopping view's meta line (addendum A2).
   * `undefined` — All view; no meta line is rendered (44px phone row).
   * `null`      — Shopping view; card has no EDHREC figure → prints rowNoFigure.
   * `number`    — Shopping view; prints rowFigure(pct). Never 0 as a stand-in for absent.
   */
  shoppingFigure?: number | null;
}

export function DecklistRow({
  deckId,
  card,
  siblings,
  spent = false,
  shoppingFigure,
}: DecklistRowProps) {
  // `flex-auto`, not `flex-1`, and the difference is the whole bug. `flex-1` is
  // basis-0: the name gets only what the marker has not already claimed as its
  // own intrinsic width, so a 390px over-committed row renders
  // `A ◆◆ short 1 — also in Atraxa Superfriends` and the card it describes is
  // gone. `flex-auto` bases the name on its own text, so a row too narrow for
  // both shrinks the two halves in proportion instead of starving one. Where
  // there is room to spare the two are identical — grow still takes the slack.
  const nameClass =
    "flex-auto min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-left text-[12.5px] md:text-[13.5px]";

  // Multi-copy count (addendum C5): one row per card, the count inline after
  // the name. aria-hidden because the ✕ beside it already speaks the same
  // figure in prose — a reader that voiced both would say the number twice.
  const quantityGlyph = card.quantity > 1 && (
    <span
      aria-hidden
      className="flex-none font-mono text-[11px] tabular-nums text-[color:var(--fg-faint)]"
    >
      {addPanelCopy.row.quantity(card.quantity)}
    </span>
  );

  // Addendum A2: Shopping rows carry an EDHREC figure on a meta line below the
  // name. shoppingFigure is only threaded for unowned deck cards shown in the
  // Shopping filter. undefined = All view (no meta). null or number = Shopping view.
  // The row grows to 52px on phone to hold the extra line.
  // Basic lands are never in Shopping (the fill guarantees it), but guard anyway.
  const hasShoppingMeta = !isBasicLand(card.typeLine) && shoppingFigure !== undefined;
  const rowShell = hasShoppingMeta ? ROW_SHELL_SHOPPING : ROW_SHELL;
  // Phone: prefixed "edhrec 24%" because the figure sits on a detached meta
  // line and needs context. Desktop: bare "24%" because it is inline with the
  // name. Absence: phone gets the full sentence; desktop gets "—" which reads
  // fine beside the name but would be cryptic alone on a dedicated line.
  const figureTextPhone = Number.isFinite(shoppingFigure)
    ? recommendationsCopy.shopping.rowFigure(String(shoppingFigure as number))
    : recommendationsCopy.shopping.rowNoFigure;
  const figureTextDesktop = Number.isFinite(shoppingFigure)
    ? recommendationsCopy.shopping.rowFigureDesktop(String(shoppingFigure as number))
    : recommendationsCopy.shopping.rowNoFigureDesktop;
  const { isPending, error, run } = useDeckMutation(false, DECK_REMOVE_FALLBACK_MESSAGE);
  const removeOptimisticCard = useRemoveOptimisticCard();
  const markSlotSpent = useMarkSlotSpent();
  const reportRemoveFailure = useReportRemoveFailure();
  // A last-copy failure is the shell's to report: the row survives it now (the
  // spent slot keeps it mounted), so drawing its own message too would say the
  // same thing twice. A decremented stack, and a row with no shell above it,
  // still speak for themselves.
  const shellReportsFailure = reportRemoveFailure !== null && card.quantity <= 1;
  // `selfExcluded` unconditionally: every card on this list is claimed by this
  // deck, and the figures came from a query given this deck's id. Addendum 2 §6.
  // A missing read (null) is the free rendering — see DeckDetailCard.
  const availState = card.availability
    ? availabilityState(card.availability, { selfExcluded: true })
    : "free";

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
      {/* --row-bg exists so the over glyph's seam tracks the hover swap; a fixed
          seam string reads as a hairline through the glyph on hover.
          The over tint (design 4.5/4.10) is an inset ring rather than a border:
          a real border would add 2px to one row's height and shunt the list. */}
      <div
        className={`group ${rowShell} bg-[color:var(--surface-rail)] md:hover:bg-[color:var(--elevated-hover)]
          [--row-bg:var(--surface-rail)] md:hover:[--row-bg:var(--elevated-hover)]
          ${availState === "over" ? "shadow-[inset_0_0_0_1px_var(--avail-over-border)]" : ""}`}
      >
        {/* Ownership dot: solid green (owned) vs dashed hollow (unowned) */}
        <OwnershipDot
          owned={card.owned}
          className="w-[7px] h-[7px] md:w-[8px] md:h-[8px]"
          label={card.owned ? "Owned" : "Not owned"}
        />

        {/* Card name — the click target for the detail modal (#127).
            Shopping rows: phone = two lines (name then prefixed figure below);
            desktop = single line (name + bare figure inline). The `edhrec` prefix
            exists only on phone because the figure is detached from the name there
            and needs context; inline on desktop it reads fine without it. */}
        {hasShoppingMeta ? (
          // One trigger at both widths — the layout changes, the card does not.
          // Only the figure's wording differs, so only the figure is drawn twice.
          <div className="flex-auto min-w-0 flex flex-col justify-center md:flex-row md:items-center md:gap-[6px]">
            {/* Name and count share a line so the count stays inline after the
                name at both widths — on phone the figure below is its own line,
                and a count that flowed down with it would read as part of it. */}
            <div className="min-w-0 flex items-center gap-[6px]">
              <CardDetailTrigger
                oracleId={card.oracleId}
                name={card.name}
                siblings={siblings}
                className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-left text-[12.5px] md:text-[13.5px]"
                style={{ color: "var(--fg)", background: "transparent", border: "none", padding: 0 }}
              >
                {card.name}
              </CardDetailTrigger>
              {quantityGlyph}
            </div>
            <span
              className="md:hidden font-mono text-[10px] tabular-nums truncate"
              style={{
                color: Number.isFinite(shoppingFigure)
                  ? "var(--fg-faint)"
                  : "var(--fg-locked)",
              }}
            >
              {figureTextPhone}
            </span>
            <span
              className="hidden md:inline flex-none font-mono text-[10px] tabular-nums"
              style={{
                color: Number.isFinite(shoppingFigure)
                  ? "var(--fg-faint)"
                  : "var(--fg-locked)",
              }}
            >
              {figureTextDesktop}
            </span>
          </div>
        ) : (
          <CardDetailTrigger
            oracleId={card.oracleId}
            name={card.name}
            siblings={siblings}
            className={nameClass}
            style={{ color: "var(--fg)" }}
          >
            {card.name}
          </CardDetailTrigger>
        )}

        {/* Shopping rows draw it inside the name block above, beside the name
            rather than after the EDHREC figure. */}
        {!hasShoppingMeta && quantityGlyph}

        {/* Availability marker */}
        {card.availability && (
          <AvailabilityMarker
            availability={card.availability}
            seam="var(--row-bg)"
            selfExcluded
            // Nothing above this row carries an aria-label to hoist the prose
            // into — the name is its own button — so the marker speaks for
            // itself. Design 17.5 is written for this surface specifically.
            spoken
            // The component sets no size or family of its own (design 3.4: the
            // label inherits the meta line's mono size), and this row has no
            // meta line to inherit — it would otherwise render in the page's
            // sans base and grow a 34px row. The caller supplies both, a step
            // below the card name so the marker stays the quieter half.
            //
            // `shrink-[4]` is the priority, not a width: when the row cannot
            // hold both, the marker gives up its space before the card name
            // gives up any — down to its own floor, which is the fixed prefix
            // plus six characters of deck name. That is Design's ruling that
            // the name is the most useful half, expressed as an order of
            // yielding rather than as a fixed minimum that cannot itself yield.
            className="shrink-[4] font-mono text-[11px] md:text-[11.5px]"
          />
        )}

        {/* Buy tag — unowned only */}
        {!card.owned && <BuyTag variant="row" />}

        {/* Auto tag — one per stack */}
        {card.auto && <AutoTag deckId={deckId} oracleId={card.oracleId} name={card.name} />}

        {/* Remove ✕ — at both widths now. The glyph stays 13px at both: the
            phone target is the padding around it. */}
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="flex-none flex items-center justify-center w-[44px] h-[44px] md:w-auto md:h-auto
            rounded-[6px] bg-transparent border-none text-[13px] leading-none text-[color:var(--border-dashed)]
            active:bg-[color:var(--elevated)] active:text-[color:var(--fg-body)] md:active:bg-transparent
            md:group-hover:text-[color:var(--fg-body)] cursor-pointer disabled:opacity-50 disabled:cursor-default"
          aria-label={
            card.quantity > 1
              ? addPanelCopy.row.removeCopyAria(card.name, card.quantity)
              : addPanelCopy.row.removeAria(card.name)
          }
        >
          {addPanelCopy.row.remove}
        </button>
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
 * suggestion tile calls. No new server action and no new server state.
 *
 * The one mutation in the builder with no optimistic prediction, deliberately.
 * An optimistic re-add puts the card straight back into the deck-wide list,
 * which is the decklist's signal to stop drawing the spent slot — so this row
 * would unmount mid-flight and a refused undo would have nowhere to say so.
 * The disabled control carries the wait instead, and the slot settles when the
 * server list actually comes back with the card in it.
 */
function UndoRow({ deckId, card }: { deckId: string; card: DeckDetailCard }) {
  const { isPending, error, run } = useDeckMutation(false, addPanelCopy.undo.failed);
  const announceUndo = useAnnounceUndo();

  function handleUndo() {
    // Announced from the click for the same reason the removal is: see
    // `handleRemove` above.
    announceUndo(card);
    run(() => addCardToDeck(deckId, card.oracleId));
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
              bg-transparent border-0 md:border-b md:border-accent-shadow
              text-[13px] md:text-[12.5px] font-semibold md:leading-[1.4]
              text-accent md:hover:text-accent-hover cursor-pointer disabled:opacity-50 disabled:cursor-default"
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
