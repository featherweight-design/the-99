"use client";
// Step 8, Buy only what's missing: two tabs. The Shopping list is a deck's own Shopping rows (`DecklistRow` in its Shopping
// form, dearest first, the commanders in a group of their own) under the same mark key the deck page draws. Which deck needs
// it most? is the card view's drawing half, on the card the fixture shares between decks, from its stored read and its free
// list. The read's own press is not here: nothing is asked of a model, and every row's Add and Swap in is held (disabled) as in
// a read-only view. The tab is this step's own state.

import { useRef, useState } from "react";

import { FitsViewDrawing, type FitsViewList } from "../../cards/fits-view-drawing";
import { DecklistGroupHeader } from "../../decks/decklist-group-header";
import { DecklistRow } from "../../decks/decklist-row";
import { MarkKey } from "../../decks/mark-key";
import { buildMarkKeyEntries } from "../../decks/mark-key-entries";
import { cardCopies, groupByCardType } from "../../../lib/decks/grouping";
import { deckCardComparator } from "../../../lib/decks/sort-cards";
import { DEFAULT_DECK_SORT } from "../../../lib/decks/sort-memory";
import { isShoppingCard } from "../../../lib/decks/shopping";
import { proxyCopy } from "../../../lib/copy/proxies";
import { recommendationsCopy } from "../../../lib/copy/recommendations";
import { landingCopy } from "../../../lib/copy/landing";
import type { Allowance } from "../../../lib/model/allowance-rule";
import type { DemoDeck } from "../../../lib/demo/project-decks";
import type { Projected } from "../../../lib/demo/projected";
import type { DemoDeckRole } from "./demo-detail";
import { DemoDeckScope, usePressedOpener } from "./demo-providers";
import { DemoHead, DemoTabs } from "./demo-tabs";

const tabs = landingCopy.demo.tabs;
type Tab = "shopping" | "which";
const TABS: readonly { id: Tab; label: string }[] = [
  { id: "shopping", label: tabs.shopping },
  { id: "which", label: tabs.which },
];

/** The credits the read's drawing is handed: one fixed allowance, never drawn over a stored read (no press is offered). */
const DEMO_ALLOWANCE: Allowance = { used: 0, limit: 1, reopensAt: null, nextAt: null };

const noop = () => {};

/** The deck whose Shopping list the demo draws: the first of the three with a card to buy (the played deck, then the under one). */
export function shoppingDeckOf(data: Projected): DemoDeck | null {
  return [data.decks.played, data.decks.under, data.decks.over].find((d) => d.cards.some(isShoppingCard) || d.commanderShopping.length > 0) ?? null;
}

function DemoShopping({ deck }: { deck: DemoDeck }) {
  const sort = DEFAULT_DECK_SORT.shopping;
  const compare = deckCardComparator(sort.key, sort.direction, deck.newestAsOf);
  const buying = deck.cards.filter(isShoppingCard);
  const key = buildMarkKeyEntries({ cards: deck.cards, filter: "shopping", inCardView: false, commanderRows: deck.commanderShopping });
  const sections = [
    ...(deck.commanderShopping.length > 0
      ? [{ label: recommendationsCopy.shopping.commanderGroupLabel(deck.commanderShopping.length), cards: deck.commanderShopping.slice().sort(compare) }]
      : []),
    ...groupByCardType(buying, compare).map(([label, cards]) => ({ label, cards })),
  ];
  return (
    <div data-testid="demo-shopping">
      <DemoHead deckName={deck.deckName} />
      <div className="mb-[14px]">
        <MarkKey marks={key} regionAria={proxyCopy.key.regionAria} />
      </div>
      {sections.map(({ label, cards }) => (
        <div key={label} className="mb-[16px] md:mb-[20px]">
          <DecklistGroupHeader label={label} count={cardCopies(cards)} />
          <div className="flex flex-col gap-[3px] md:grid md:gap-x-[20px] md:gap-y-[4px]" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
            {cards.map((card) => (
              <DecklistRow key={card.oracleId} deckId={deck.id} card={card} siblings={deck.siblings} newestAsOf={deck.newestAsOf} inShopping hideRemove />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoWhich({ data, onOpenCard }: { data: Projected; onOpenCard: (oracleId: string, opener: HTMLElement | null) => void }) {
  const press = usePressedOpener(onOpenCard);
  const fits = data.fits;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [foldOpen, setFoldOpen] = useState(false);
  const read = fits.list.read;
  const list: FitsViewList = {
    read,
    shown: read?.fits ?? [],
    holds: read?.holds ?? [],
    role: read?.card.role ?? "other",
    loadState: "ready",
    busy: null,
    refused: null,
    noteFor: () => null,
  };
  return (
    <div data-testid="demo-which" onClickCapture={press.capture} className="overflow-hidden rounded-[10px] border border-solid border-[color:var(--border)]">
      <FitsViewDrawing
        card={fits.card}
        name={fits.name}
        owned={fits.owned}
        freeNow={fits.freeNow}
        countsKnown={fits.countsKnown}
        panel={fits.panel ? { ...fits.panel, planSources: {}, allowance: DEMO_ALLOWANCE } : null}
        list={list}
        running={null}
        now={0}
        runCount={null}
        pressFailed={false}
        tooBigFor={null}
        fresh={null}
        foldOpen={foldOpen}
        // Every row's write is held: this view reads, and nothing it draws adds a card to anything.
        busy
        writing={false}
        refused={null}
        actFor={() => null}
        announced=""
        bodyReady
        restored
        leaving={false}
        headingRef={headingRef}
        onBack={noop}
        onOpenCard={press.open}
        onPress={noop}
        onToggleFold={() => setFoldOpen((o) => !o)}
        onRetryList={noop}
        onSwap={noop}
        onAddRead={noop}
        onAddFree={noop}
        // A deck's name is the visitor's to open only when it is theirs: here it is text.
        inert
      />
    </div>
  );
}

/** Which of the fixture's three decks `deck` is, so a card pressed on its Shopping list carries that deck's role (`detailFor` lays that deck's own combos over the card it opens). */
export function deckRoleOf(data: Projected, deck: DemoDeck): DemoDeckRole {
  return deck === data.decks.played ? "played" : deck === data.decks.over ? "over" : "under";
}

export function StepBuy({ data, onOpenCard }: { data: Projected; onOpenCard: (oracleId: string, opener: HTMLElement | null) => void }) {
  const [tab, setTab] = useState<Tab>("shopping");
  const deck = shoppingDeckOf(data);
  return (
    <div data-testid="demo-buy">
      <DemoTabs tabs={TABS} value={tab} onChange={setTab} label={tabs.aria}>
        {tab === "shopping" ? (deck ? <DemoDeckScope role={deckRoleOf(data, deck)}><DemoShopping deck={deck} /></DemoDeckScope> : null) : <DemoWhich data={data} onOpenCard={onOpenCard} />}
      </DemoTabs>
    </div>
  );
}
