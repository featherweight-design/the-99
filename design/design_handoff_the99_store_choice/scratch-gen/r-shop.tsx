import { writeFileSync } from "node:fs";
import { shell } from "./r-settings";
import { projected } from "../src/lib/demo/projected";
import { shoppingDeckOf } from "../src/components/landing/demo/demo-step-buy";
import { DemoProviders } from "../src/components/landing/demo/demo-providers";
import { GroupToggle } from "../src/components/decks/group-toggle";
import { DecklistGroupHeader } from "../src/components/decks/decklist-group-header";
import { DecklistRow } from "../src/components/decks/decklist-row";
import { MarkKey } from "../src/components/decks/mark-key";
import { buildMarkKeyEntries } from "../src/components/decks/mark-key-entries";
import { groupByCardType, cardCopies } from "../src/lib/decks/grouping";
import { deckCardComparator } from "../src/lib/decks/sort-cards";
import { DEFAULT_DECK_SORT } from "../src/lib/decks/sort-memory";
import { isShoppingCard } from "../src/lib/decks/shopping";
import { summarisePrices, provenanceForm } from "../src/lib/cards/price-fact";
import { proxyCopy } from "../src/lib/copy/proxies";
const G = globalThis as any;
const data = projected()!; const deck0 = (data.decks as any).under;
const NOW = new Date("2026-09-07T15:00:00Z");
// Store prices (placeholders): TCGplayer market runs a little under Mana Pool's listing, Card Kingdom over, with gaps.
const scale: Record<string, number> = { manapool: 1, tcgplayer: 0.91, cardkingdom: 1.18 };
function deckFor(store: string, gaps: number) {
  let i = 0;
  const cards = deck0.cards.map((c: any) => {
    if (!c.price || !isShoppingCard(c)) return c;
    i++;
    const drop = store === "cardkingdom" && i <= gaps;
    const r = (x: number | null) => (x == null ? null : Math.round(x * scale[store]));
    return { ...c, price: drop ? null : { ...c.price, cents: r(c.price.cents), foilCents: r(c.price.foilCents), etchedCents: r(c.price.etchedCents) } };
  });
  return { ...deck0, cards };
}
function shop(store: string, o: any = {}) {
  G.__STORE = store; G.__COPIED = !!o.copied;
  const deck = deckFor(store, o.gaps ?? 0);
  const sort = DEFAULT_DECK_SORT.shopping;
  const compare = deckCardComparator(sort.key, sort.direction, deck.newestAsOf);
  const buying = deck.cards.filter(isShoppingCard);
  const key = buildMarkKeyEntries({ cards: deck.cards, filter: "shopping", inCardView: false, commanderRows: deck.commanderShopping } as any);
  const prov = provenanceForm(deck.newestAsOf!, NOW);
  const summary = summarisePrices(buying as any, deck.newestAsOf);
  const sections = groupByCardType(buying, compare).map(([label, cards]: any) => ({ label, cards }));
  return shell(
    <DemoProviders onOpen={() => {}} onClose={() => {}} openOracleId={null}>
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="px-[16px] pt-[14px] md:px-[26px] md:pt-[22px]">
          <h1 className="m-0 font-display text-[22px] font-bold text-[color:var(--fg)] md:text-[28px]">{deck.deckName}</h1>
        </div>
        <GroupToggle allCount={deck.cards.length} shoppingCount={buying.length} filter="shopping" grouping="type" onFilterChange={() => {}} onGroupingChange={() => {}}
          priceSummary={summary} provenance={prov} shoppingCards={buying.map((c: any) => ({ name: c.name, quantity: c.quantity }))}
          sort={sort as any} onSortChange={() => {}} onSortAnnounce={() => {}} {...({} as any)} />
        <div className="px-[16px] pt-[12px] md:px-[26px]">
          <div className="mb-[14px]"><MarkKey marks={key} regionAria={proxyCopy.key.regionAria} /></div>
          {sections.map(({ label, cards }: any) => (
            <div key={label} className="mb-[16px] md:mb-[20px]">
              <DecklistGroupHeader label={label} count={cardCopies(cards)} />
              <div className="flex flex-col gap-[3px] md:grid md:gap-x-[20px] md:gap-y-[4px]" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
                {cards.map((card: any) => <DecklistRow key={card.oracleId} deckId={deck.id} card={card} siblings={deck.siblings} newestAsOf={deck.newestAsOf} inShopping hideRemove />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DemoProviders>, "/decks/x");
}
for (const [k, s, o] of [["sh-mp", "manapool"], ["sh-tcg", "tcgplayer"], ["sh-ck", "cardkingdom"], ["sh-ck-gap", "cardkingdom", { gaps: 3 }], ["sh-ck-none", "cardkingdom", { gaps: 999 }], ["sh-tcg-copied", "tcgplayer", { copied: true }]] as any)
  writeFileSync(`dz/frames/${k}.html`, shop(s, o));
console.log("ok", deck0.deckName, deck0.cards.filter(isShoppingCard).length);
