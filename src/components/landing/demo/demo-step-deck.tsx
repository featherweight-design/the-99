"use client";
// Step 4, a deck as the deck page draws it: the commander line, the mark key, and the groups of rows with their marks, from the
// played deck's projection. The rows are the signed-in `DecklistRow`, so a mark is the real mark; the demo's inert row wiring
// (`INERT_ROW_WIRING`) is what keeps every press that would write from reaching anything. The key decodes the marks the rows
// carry, by the same rule the deck page uses (`buildMarkKeyEntries`).

import { CardDetailTrigger } from "../../cards/card-detail-context";
import { DecklistGroupHeader } from "../../decks/decklist-group-header";
import { DecklistRow } from "../../decks/decklist-row";
import { MarkKey } from "../../decks/mark-key";
import { buildMarkKeyEntries } from "../../decks/mark-key-entries";
import { commanderDisplayName } from "../../../lib/cards/printed-name";
import { cardCopies, groupByCardType, type DeckDetailCard } from "../../../lib/decks/grouping";
import { deckCardComparator } from "../../../lib/decks/sort-cards";
import { DEFAULT_DECK_SORT } from "../../../lib/decks/sort-memory";
import { proxyCopy } from "../../../lib/copy/proxies";
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
          <CardDetailTrigger oracleId={c.oracleId} name={commanderDisplayName(c)} imageUri={c.imageUri} siblings={deck.siblings} className="cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-[color:var(--fg)] [border-bottom:1px_dotted_var(--accent)]">
            {commanderDisplayName(c)}
          </CardDetailTrigger>
        </span>
      ))}
    </p>
  );
}

/** One group of the list: the heading with its count, and the rows two to a line on a desktop. */
export function DeckGroups({ deck, cards }: { deck: DemoDeck; cards: DeckDetailCard[] }) {
  const sort = DEFAULT_DECK_SORT.all;
  const groups = groupByCardType(cards, deckCardComparator(sort.key, sort.direction, deck.newestAsOf));
  return (
    <>
      {groups.map(([label, groupCards]) => (
        <div key={label} className="mb-[16px] md:mb-[20px]">
          <DecklistGroupHeader label={label} count={cardCopies(groupCards)} />
          <div className="flex flex-col gap-[3px] md:grid md:gap-x-[20px] md:gap-y-[4px]" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
            {groupCards.map((card) => (
              <DecklistRow key={card.oracleId} deckId={deck.id} card={card} siblings={deck.siblings} newestAsOf={deck.newestAsOf} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function StepDeck({ data }: { data: Projected }) {
  const deck = data.decks.played;
  const key = buildMarkKeyEntries({ cards: deck.cards, filter: "all", inCardView: false, commanderRows: deck.commanderShopping });
  return (
    <div data-testid="demo-deck">
      <DemoHead deckName={deck.deckName} />
      <CommanderLine deck={deck} />
      <div className="mb-[14px]">
        <MarkKey marks={key} regionAria={proxyCopy.key.regionAria} />
      </div>
      <DeckGroups deck={deck} cards={deck.cards} />
    </div>
  );
}
