import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { CardCombo, CardComboOther } from "../../lib/combos/near-combos";
import { combosCloseCopy } from "../../lib/copy/combos-close";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";

// What a card stacked on the sheet calls it, and whether it lifted the card: `registerSheet`'s arguments.
const registerSheet = vi.fn<(label: string, ...rest: unknown[]) => () => void>(() => () => {});
vi.mock("./card-detail-provider", () => ({
  useCardDetail: () => ({ registerSheet, openOracleId: null, pendingOracleId: null, revealing: false }),
  // A plate is a press that opens the card: drawn as a button, as the real trigger is.
  CardDetailTrigger: ({ children, testId }: { children?: React.ReactNode; testId?: string }) => (
    <button type="button" data-testid={testId}>{children}</button>
  ),
}));
const addCardToDeck = vi.fn<(deckId: string, oracleId: string) => Promise<DeckMutationResult>>();
vi.mock("../../app/decks/actions", () => ({ addCardToDeck: (d: string, o: string) => addCardToDeck(d, o) }));

const { CardComboSheet, cheapestLive, offersAdd, openedCardWhere } = await import("./card-combo-sheet");

const partner = (where: CardComboOther["where"]): CardComboOther => ({
  oracleId: "id-surge",
  name: "Warstorm Surge",
  state: where.kind === "inDeck" ? "inDeck" : where.kind === "buy" ? "notOwned" : where.kind,
  mustBeCommander: false,
  decks: where.kind === "elsewhere" ? where.decks : [],
  where,
  imageUri: "https://img/surge.jpg",
  isCommander: false,
});
const combo = (where: CardComboOther["where"]): CardCombo => ({
  variantId: "v-surge", others: [partner(where)], produces: ["Infinite damage"], steps: "1. Cast.", manaNeeded: null, manaValueNeeded: 0,
  notablePrerequisites: null, usesCommander: false,
});
const CARD = { oracleId: "id-poly", name: "Polyraptor", printedName: null, imageUri: "https://img/poly.jpg", printings: [], preferredPrinting: null } as unknown as BrowseCard;

beforeEach(() => {
  registerSheet.mockClear();
  addCardToDeck.mockReset();
});

describe("openedCardWhere (OPEN-10)", () => {
  it("in the deck when in scope; else a spare, other decks, or its buy tag", () => {
    expect(openedCardWhere(CARD, true)).toEqual({ kind: "inDeck" });
    const claim = { id: "d", name: "HD - Tovolar", quantity: 1, mature: true, pending: false, commander: false };
    expect(openedCardWhere({ ...CARD, availability: { owned: 2, hard: 1, soft: 0, free: 1, claims: [claim] } } as BrowseCard, false)).toEqual({ kind: "spare" });
    expect(openedCardWhere({ ...CARD, availability: { owned: 1, hard: 1, soft: 0, free: 0, claims: [claim] } } as BrowseCard, false))
      .toEqual({ kind: "elsewhere", decks: [{ id: "d", name: "HD - Tovolar", committed: true }] });
    expect(openedCardWhere(CARD, false)).toEqual({ kind: "buy", cents: null, soldOut: false, qualifier: null });
  });

  it("an owned card whose claims could not be read has no where-line, never a buy tag (round 2)", () => {
    expect(openedCardWhere({ ...CARD, quantity: 2, availability: null } as BrowseCard, false)).toBeNull();
    // Not owned and no availability read: still its buy tag.
    expect(openedCardWhere({ ...CARD, quantity: 0, availability: null } as BrowseCard, false)?.kind).toBe("buy");
  });
});

describe("cheapestLive: the opened card's buy tag", () => {
  const now = new Date("2026-10-22T09:00:00Z");
  const stale = new Date("2026-10-20T09:00:00Z");
  const fact = (cents: number | null, foilCents: number | null, asOf = now) => ({ cents, foilCents, etchedCents: null, asOf });
  const prices = (...facts: ReturnType<typeof fact>[]) =>
    ({ byScryfallId: Object.fromEntries(facts.map((f, i) => [`s${i}`, f])), byPrintingKey: {}, ambiguousKeys: [], newestAsOf: now }) as never;
  it("the cheapest live non-foil figure first, bare", () => {
    expect(cheapestLive(prices(fact(450, 120), fact(300, null), fact(100, null, stale)))).toEqual({ cents: 300, qualifier: null });
  });
  it("a card stocked only in foil keeps its foil figure, qualified (round 1)", () => {
    expect(cheapestLive(prices(fact(null, 940), fact(null, 1200)))).toEqual({ cents: 940, qualifier: "foil" });
  });
  it("nothing live: no figure", () => {
    expect(cheapestLive(prices(fact(100, null, stale)))).toEqual({ cents: null, qualifier: null });
    expect(cheapestLive(null)).toEqual({ cents: null, qualifier: null });
  });
});

describe("offersAdd (OPEN-11)", () => {
  it("only on the deck's page, for a partner the deck lacks, with the card in the deck", () => {
    expect(offersAdd(combo({ kind: "spare" }), true, "deck-1")).toBe(true);
    expect(offersAdd(combo({ kind: "inDeck" }), true, "deck-1")).toBe(false);
    expect(offersAdd(combo({ kind: "spare" }), false, "deck-1")).toBe(false);
    expect(offersAdd(combo({ kind: "spare" }), true, null)).toBe(false);
  });
});

describe("the combo over the card", () => {
  const draw = (c: CardCombo, inScope: boolean, deckId: string | null, onAddSettled = vi.fn(), onAddLanded = vi.fn()) =>
    render(<CardComboSheet card={CARD} combo={c} inScope={inScope} deckId={deckId} onClose={vi.fn()} onAddLanded={onAddLanded} onAddSettled={onAddSettled} />);

  it("stacks over the card, named `{card} + {partner}`, the way back named for the card", () => {
    draw(combo({ kind: "spare" }), true, "deck-1");
    const [label, , overCard] = registerSheet.mock.calls[0];
    expect(label).toBe("Polyraptor + Warstorm Surge");
    expect(overCard).toBe(true);
  });

  it("the opened card's plate comes first and is not a press; the partner's opens its card", () => {
    draw(combo({ kind: "spare" }), true, "deck-1");
    const plates = screen.getAllByTestId("receipt-tile");
    expect(plates.map((p) => p.textContent?.includes("Polyraptor"))).toEqual([true, false]);
    expect(plates[0].tagName).toBe("DIV");
    expect(plates[1].tagName).toBe("BUTTON");
    // The partner the deck lacks is outlined; the opened card says it is in the deck.
    expect(plates[1].querySelector("[data-missing-piece]")).not.toBeNull();
    expect(plates[0].textContent).toContain(combosCloseCopy.detail.plate.inThisDeck);
  });

  it("offers Add for a one-away partner on the deck page, and goes back to the card once it lands", async () => {
    addCardToDeck.mockResolvedValue({ ok: true } as DeckMutationResult);
    const onAddSettled = vi.fn();
    const onAddLanded = vi.fn();
    draw(combo({ kind: "spare" }), true, "deck-1", onAddSettled, onAddLanded);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: combosCloseCopy.detail.add("Warstorm Surge") }));
    });
    expect(addCardToDeck).toHaveBeenCalledWith("deck-1", "id-surge");
    expect(onAddLanded).toHaveBeenCalledTimes(1);
    expect(onAddSettled).toHaveBeenCalledTimes(1);
  });

  it("a refused Add reports nothing landed", async () => {
    addCardToDeck.mockResolvedValue({ ok: false, error: "nope" } as unknown as DeckMutationResult);
    const onAddSettled = vi.fn();
    const onAddLanded = vi.fn();
    draw(combo({ kind: "spare" }), true, "deck-1", onAddSettled, onAddLanded);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: combosCloseCopy.detail.add("Warstorm Surge") }));
    });
    expect(onAddLanded).not.toHaveBeenCalled();
    expect(onAddSettled).not.toHaveBeenCalled();
  });

  it("a whole combo, a deck-less card or a card outside the deck: the Spellbook link alone", () => {
    const add = () => screen.queryByRole("button", { name: combosCloseCopy.detail.add("Warstorm Surge") });
    const a = draw(combo({ kind: "inDeck" }), true, "deck-1");
    expect(add()).toBeNull();
    expect(document.querySelector("[data-missing-piece]")).toBeNull();
    a.unmount();
    const b = draw(combo({ kind: "spare" }), false, null);
    expect(add()).toBeNull();
    b.unmount();
    draw(combo({ kind: "spare" }), false, "deck-1");
    expect(add()).toBeNull();
    expect(document.querySelector("[data-combo-foot=one-away] a")).not.toBeNull();
  });
});
