"use client";
// Step 4, a deck as the deck page draws it: the commander line, the mark key, and the groups of rows with their marks, from the
// played deck's projection. The rows are the signed-in `DecklistRow`, so a mark is the real mark; the demo's inert row wiring
// (`INERT_ROW_WIRING`) is what keeps every press that would write from reaching anything. The key decodes the marks the rows
// carry, by the same rule the deck page uses (`buildMarkKeyEntries`).

import { useState } from "react";
import { CardDetailTrigger } from "../../cards/card-detail-context";
import { DecklistGroupHeader } from "../../decks/decklist-group-header";
import { DecklistRow } from "../../decks/decklist-row";
import { MarkKey } from "../../decks/mark-key";
import { buildMarkKeyEntries } from "../../decks/mark-key-entries";
import { commanderDisplayName, printedNameOf } from "../../../lib/cards/printed-name";
import { cardCopies, groupByCardType, isBasicLand, type DeckDetailCard } from "../../../lib/decks/grouping";
import { deckCardComparator } from "../../../lib/decks/sort-cards";
import { DEFAULT_DECK_SORT } from "../../../lib/decks/sort-memory";
import { availabilityState } from "../../../lib/cards/availability";
import { deckRowTag } from "../../../lib/decks/row-tag";
import { isShoppingCard } from "../../../lib/decks/shopping";
import { landingCopy } from "../../../lib/copy/landing";
import { proxyCopy } from "../../../lib/copy/proxies";
import { DEMO_PLAYER } from "../../../lib/demo/player";
import type { DemoDeck } from "../../../lib/demo/project-decks";
import type { Projected } from "../../../lib/demo/projected";
import { DemoHead } from "./demo-tabs";

/** The commanders, each a press that opens its card (the demo's read-only card details). */
function CommanderLine({ deck }: { deck: DemoDeck }) {
  const commanders = [deck.commander, deck.partner].flatMap((c) => (c ? [c] : []));
  return (
    <p className="m-0 mb-[12px] flex flex-wrap items-baseline gap-x-[8px] text-[13.5px] text-[color:var(--fg-body)]">
      {commanders.map((c, i) => (
        <span key={c.oracleId} className="inline-flex items-baseline gap-[8px]">
          {i > 0 ? <span aria-hidden className="text-[color:var(--fg-faint)]">{"+"}</span> : null}
          <CardDetailTrigger oracleId={c.oracleId} name={commanderDisplayName(c)} imageUri={c.imageUri} siblings={deck.siblings} preview className="cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-[color:var(--fg)] [border-bottom:1px_dotted_var(--accent)]">
            {commanderDisplayName(c)}
          </CardDetailTrigger>
        </span>
      ))}
    </p>
  );
}

/** One group of the list: the heading with its count, and the rows in one column at every width (the board's), without the ✕:
 *  the demo is read-only. */
export function DeckGroups({ deck, cards }: { deck: DemoDeck; cards: DeckDetailCard[] }) {
  const sort = DEFAULT_DECK_SORT.all;
  const groups = groupByCardType(cards, deckCardComparator(sort.key, sort.direction, deck.newestAsOf));
  return (
    <>
      {groups.map(([label, groupCards]) => (
        <div key={label} className="mb-[16px] md:mb-[20px]">
          <DecklistGroupHeader label={label} count={cardCopies(groupCards)} />
          <div className="flex flex-col gap-[3px]">
            {groupCards.map((card) => (
              <DecklistRow key={card.oracleId} deckId={deck.id} card={card} siblings={deck.siblings} newestAsOf={deck.newestAsOf} hideRemove />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * The deck's split under the commander, the board's line: copies built of 99, the ones owned, the ones to buy (Shopping's own
 * rule). The buy count is the Shopping pill's: the commanders' Shopping rows (`commanderShopping`, one copy each, billed though
 * neither is a list row) join the list's own, so the line and the key's buy mark describe the same basket. Owned is the 99's.
 */
function deckFigure(deck: DemoDeck): string {
  const built = cardCopies(deck.cards);
  const listBuy = cardCopies(deck.cards.filter(isShoppingCard));
  return landingCopy.demo.deckFigure(built, built - listBuy, listBuy + cardCopies(deck.commanderShopping));
}

/** The first row that is short because another deck holds the player's one copy: the card the note names. Null when none is. */
function shortRowOf(deck: DemoDeck): DeckDetailCard | null {
  return deck.cards.find((c) => c.owned && c.availability && c.availability.owned === 1 && availabilityState(c.availability, { selfExcluded: true }) === "over") ?? null;
}

/**
 * Whether a row draws a mark the key decodes: the buy mark, a proxy, a lock, a foil glint, a bracket fact or a combo partner. The
 * same tests `buildMarkKeyEntries` runs per entry (a deck is a closed set, so the rows that carry a mark are knowable).
 */
export function carriesMark(c: DeckDetailCard): boolean {
  return deckRowTag(c, false) === "buy" || c.proxied === true || c.locked === true || Boolean(c.imageUri && c.foil && !isBasicLand(c.typeLine)) || (c.facts?.length ?? 0) > 0 || Boolean(c.comboPartner);
}

export function StepDeck({ data }: { data: Projected }) {
  const deck = data.decks.played;
  const key = buildMarkKeyEntries({ cards: deck.cards, filter: "all", inCardView: false, commanderRows: deck.commanderShopping });
  const short = shortRowOf(deck);
  // The step shows only the cards that carry a mark, and Show all expands the shipped list in place.
  const [all, setAll] = useState(false);
  const marked = deck.cards.filter(carriesMark);
  const total = cardCopies(deck.cards);
  return (
    <div data-testid="demo-deck">
      <DemoHead deckName={deck.deckName} />
      <CommanderLine deck={deck} />
      <p data-testid="demo-deck-figure" className="m-0 mb-[12px] font-mono text-[12px] text-[color:var(--fg-muted)]">{deckFigure(deck)}</p>
      <div className="mb-[14px]">
        <MarkKey marks={key} regionAria={proxyCopy.key.regionAria} />
      </div>
      {all ? null : (
        <p data-testid="demo-deck-marked" className="m-0 mb-[10px] font-mono text-[12px] text-[color:var(--fg-muted)]">
          {landingCopy.demo.markedCount(cardCopies(marked), total)}
        </p>
      )}
      <DeckGroups deck={deck} cards={all ? deck.cards : marked} />
      {all ? null : (
        <button type="button" data-testid="demo-show-all" onClick={() => setAll(true)} className="mb-[16px] mt-[4px] inline-flex min-h-[44px] cursor-pointer items-center rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] text-[13.5px] text-[color:var(--fg)] md:min-h-[36px]">
          {landingCopy.demo.showAll(total)}
        </button>
      )}
      {short ? (
        <p data-testid="demo-deck-note" className="m-0 rounded-r-[8px] border-0 border-l-2 border-solid border-l-[color:var(--danger)] bg-[color:var(--surface-inset)] px-[10px] py-[6px] text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">
          <b className="font-semibold text-[color:var(--fg)]">{printedNameOf(short)}</b>
          {landingCopy.demo.shortNoteRest(DEMO_PLAYER)}
        </p>
      ) : null}
    </div>
  );
}
