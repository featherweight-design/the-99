"use client";

// The bodies of two chapter-03 figures added in I got it's PR 5: `shopping-got-it` and
// `deck-printings`. Each mounts the shipped component on fixture props, inert like every specimen
// (`Specimen` sets `pointer-events: none`), so nothing here writes or opens anything.

import { CardDetailProvider } from "../cards/card-detail-provider";
import { PrintingRegion } from "../cards/printing-region";
import { ToastFrame } from "../collection/edit-toast";
import { DecklistRow } from "../decks/decklist-row";
import { GotItProvider } from "../decks/got-it";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { DECK_PRINTING, GOT_IT_RECEIPT, GOT_IT_ROWS, PRICES } from "../../lib/about/fixtures";

const NOOP = () => {};
const r = gotItCopy.receipt;
const actionClass = "inline-flex h-[44px] items-center whitespace-nowrap px-[10px] text-[13.5px] text-[color:var(--accent)]";

/**
 * Two Shopping rows whose buy tags are the button (README "Specimen": the A4 precedent), and the
 * receipt the first one leaves, in flow rather than in the deck page's fixed slot, with no timer.
 */
export function GotItFigureBody() {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <GotItProvider deckId="about-figure">
        <div className="flex flex-col gap-[14px]">
          <div className="border-t border-solid border-[color:var(--border)]">
            {GOT_IT_ROWS.map((card) => (
              <DecklistRow key={card.oracleId} deckId="about-figure" card={card} siblings={[]} inShopping newestAsOf={PRICES[0].fact.asOf} />
            ))}
          </div>
          <ToastFrame
            frameRef={{ current: null }}
            placement="inline"
            title={r.added(GOT_IT_RECEIPT.card, GOT_IT_RECEIPT.quantity)}
            detail={r.detail(GOT_IT_RECEIPT.printing, GOT_IT_RECEIPT.finish)}
            actions={
              <>
                <span className={actionClass}>{r.history}</span>
                <span className={`${actionClass} font-semibold`}>{r.undo}</span>
              </>
            }
          />
        </div>
      </GotItProvider>
    </CardDetailProvider>
  );
}

/** The Set region opened from a deck: the deck's own pick among the printings the reader owns. */
export function DeckPrintingFigureBody() {
  return (
    <div className="rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--bg)] p-[14px_16px]">
      <PrintingRegion
        id="about-deck-printing"
        scope="deck"
        notice={null}
        printings={DECK_PRINTING.printings}
        preferred={DECK_PRINTING.pick}
        resolvedKey={null}
        cardName={DECK_PRINTING.cardName}
        colorIdentity={[]}
        onPick={NOOP}
        onReset={NOOP}
        onForget={NOOP}
        onAnnounce={NOOP}
      />
    </div>
  );
}
