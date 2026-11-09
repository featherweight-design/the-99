import { describe, expect, it } from "vitest";
import { assembleDeckCards, assembleTopOffCandidates } from "./assemble-cards";
import type { Availability } from "../cards/availability";
import type { CandidateFacts } from "../bracket/delta";
import type { TopOffCandidate } from "./last-slots";
import type { ComboPartner } from "../combos/near-miss";
import type { DeckDetailCard } from "./grouping";
import type { PriceFact } from "./price";
import type { PriceRead } from "./price-query";
import type { DeckCommander } from "./read";

const DECK = "deck-1";
const NEWEST = new Date("2026-11-01T09:00:00Z");

const fact = (cents: number | null): PriceFact => ({ cents, foilCents: null, etchedCents: null, asOf: NEWEST });

const card = (oracleId: string, over: Partial<DeckDetailCard> = {}): DeckDetailCard => ({
  oracleId,
  name: `Card ${oracleId}`,
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "other",
  cmc: 2,
  owned: true,
  quantity: 1,
  auto: false,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
  ...over,
});

const commander = (oracleId: string): DeckCommander => ({
  oracleId,
  name: `Commander ${oracleId}`,
  colorIdentity: ["U"],
  manaCost: "{2}{U}",
  typeLine: "Legendary Creature",
  oracleText: null,
  imageUri: null,
  artCropUri: null,
});

const combo = (oracleId: string, partnerOracleId: string, otherPartners?: number): ComboPartner => ({
  oracleId,
  partnerOracleId,
  partnerName: `Card ${partnerOracleId}`,
  popularity: 10,
  variantId: `v-${oracleId}`,
  ...(otherPartners !== undefined ? { otherPartners } : {}),
});

const detail = (partner: DeckCommander | null = null) => ({
  // Deliberately not alphabetical: the assembly keeps the detail's order.
  cards: [
    card("c-3", { availability: { owned: 1, hard: 1, soft: 0, free: 0, claims: [] } }),
    card("c-1", { owned: false }),
    card("c-2"),
  ],
  commander: commander("cmd-1"),
  partner,
});

const priced: PriceRead = {
  prices: new Map([
    ["c-1", fact(150)],
    ["c-2", fact(75)],
    ["cmd-1", fact(900)],
  ]),
  newestAsOf: NEWEST,
  // The deck's held pick of c-2, in stock: `priceFor` prefers it to today's figure.
  picked: new Map([[`${DECK}|c-2`, fact(300)]]),
};

const combos = new Map<string, ComboPartner>([
  ["c-1", combo("c-1", "c-2")],
  ["c-2", combo("c-2", "c-1", 2)],
  ["cmd-1", combo("cmd-1", "c-1")],
]);

describe("assembleDeckCards", () => {
  it("keeps the detail's order, and each row is the detail's row plus its price and combo fields, nothing else", () => {
    const d = detail();
    const { cards } = assembleDeckCards({ deckId: DECK, detail: d, priced, inDeckCombos: combos });
    expect(cards.map((c) => c.oracleId)).toEqual(["c-3", "c-1", "c-2"]);
    expect(cards).toStrictEqual([
      { ...d.cards[0], price: null, comboPartner: null },
      { ...d.cards[1], price: fact(150), comboPartner: { oracleId: "c-2", name: "Card c-2" } },
      { ...d.cards[2], price: fact(300), comboPartner: { oracleId: "c-1", name: "Card c-1" }, comboOtherPartners: 2 },
    ]);
    // The availability the detail carried is the same object, not a copy.
    expect(cards[0].availability).toBe(d.cards[0].availability);
  });

  it("prices each row through the deck's pick, and a card the read has no figure for as null", () => {
    const { cards, commander: cmd } = assembleDeckCards({ deckId: DECK, detail: detail(), priced, inDeckCombos: combos });
    expect(cards.map((c) => c.price?.cents ?? null)).toEqual([null, 150, 300]);
    expect(cards[0].price).toBeNull();
    expect(cmd.price?.cents).toBe(900);
  });

  it("marks the in-deck combo partner, and carries the other-partner count only when there is one", () => {
    const { cards, commander: cmd } = assembleDeckCards({ deckId: DECK, detail: detail(), priced, inDeckCombos: combos });
    expect(cards[0]).toMatchObject({ comboPartner: null });
    expect("comboOtherPartners" in cards[0]).toBe(false);
    expect(cards[1].comboPartner).toEqual({ oracleId: "c-2", name: "Card c-2" });
    expect("comboOtherPartners" in cards[1]).toBe(false);
    expect(cards[2]).toMatchObject({ comboPartner: { oracleId: "c-1", name: "Card c-1" }, comboOtherPartners: 2 });
    expect(cmd.comboPartner).toEqual({ oracleId: "c-1", name: "Card c-1" });
  });

  it("prices nothing and marks nothing when both reads failed", () => {
    const { cards, commander: cmd } = assembleDeckCards({ deckId: DECK, detail: detail(), priced: null, inDeckCombos: null });
    for (const c of [...cards, cmd]) {
      expect(c.price).toBeNull();
      expect(c.comboPartner).toBeNull();
    }
  });

  it("answers no partner for a single-commander deck, and assembles the pair's second like the first", () => {
    expect(assembleDeckCards({ deckId: DECK, detail: detail(), priced, inDeckCombos: combos }).partner).toBeNull();
    const { partner } = assembleDeckCards({ deckId: DECK, detail: detail(commander("cmd-2")), priced, inDeckCombos: combos });
    expect(partner).toMatchObject({ oracleId: "cmd-2", price: null, comboPartner: null });
  });
});

describe("assembleTopOffCandidates", () => {
  const candidate = (oracleId: string, owned: boolean): TopOffCandidate =>
    ({ oracleId, name: `Card ${oracleId}`, typeLine: "Creature", inclusionPct: 10, synergyPts: 5, imageUri: `catalog-${oracleId}`, owned, committedTo: null, availability: null }) as unknown as TopOffCandidate;
  const avail = (free: number) => ({ owned: 1, hard: 0, soft: 0, free, claims: [] }) as unknown as Availability;
  const facts = { kinds: ["gameChanger"] } as unknown as CandidateFacts;
  const pool = [candidate("bought", false), candidate("owned", true)];
  const reads = {
    candidateCards: pool,
    ownedArt: new Map([["owned", "owned-art"]]),
    // Both cards have a price and an availability row: the rules, not the reads, decide which row draws each.
    priced: { prices: new Map([["bought", fact(250)], ["owned", fact(50)]]), newestAsOf: NEWEST } as PriceRead,
    availability: new Map([["bought", avail(3)], ["owned", avail(1)]]),
    candidateFacts: new Map([["bought", facts]]),
    completions: new Map<string, ComboPartner>([["owned", { partnerOracleId: "partner", partnerName: "Partner Card" } as ComboPartner]]),
  };

  it("keeps the pool's order and every candidate's own fields", () => {
    const out = assembleTopOffCandidates(reads);
    expect(out.map((c) => c.oracleId)).toEqual(["bought", "owned"]);
    expect(out[0]).toMatchObject({ name: "Card bought", synergyPts: 5, owned: false });
  });

  it("prices only an unowned row, and gives availability only to an owned one", () => {
    const [bought, owned] = assembleTopOffCandidates(reads);
    expect(bought.price).toEqual(fact(250));
    expect(bought.availability).toBeNull();
    expect(owned.price).toBeNull();
    expect(owned.availability).toEqual(avail(1));
  });

  it("attaches each row's card-note facts and combo partner, null where it has none, and the art card details opens", () => {
    const [bought, owned] = assembleTopOffCandidates(reads);
    expect(bought.facts).toBe(facts);
    expect(owned.facts).toBeNull();
    expect(bought.comboPartner).toBeNull();
    expect(owned.comboPartner).toEqual({ oracleId: "partner", name: "Partner Card" });
    expect(bought.imageUri).toBe("catalog-bought");
    expect(owned.imageUri).toBe("owned-art");
  });

  it("a failed read is null on every row: no price, no marker, no note, no combo", () => {
    const out = assembleTopOffCandidates({ ...reads, priced: null, availability: null, candidateFacts: null, completions: null });
    for (const c of out) {
      expect(c.price).toBeNull();
      expect(c.availability).toBeNull();
      expect(c.facts).toBeNull();
      expect(c.comboPartner).toBeNull();
    }
  });
});
