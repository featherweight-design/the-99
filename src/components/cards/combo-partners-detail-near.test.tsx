import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { CardCombo, CardComboOther } from "../../lib/combos/near-combos";
import type { ModalComboPartner } from "../../lib/combos/near-miss";
import { combosCloseCopy } from "../../lib/copy/combos-close";
import { ComboPartnersDetail } from "./combo-partners-detail";

// Combos one piece away UI-3 (`Card-Details.dc.html`): the block drawn from `card.cardCombos`.

const other = (name: string, where: CardComboOther["where"], o: Partial<CardComboOther> = {}): CardComboOther => ({
  oracleId: `id-${name}`,
  name,
  state: where.kind === "inDeck" ? "inDeck" : where.kind === "buy" ? "notOwned" : where.kind,
  mustBeCommander: false,
  decks: where.kind === "elsewhere" ? where.decks : [],
  where,
  imageUri: null,
  isCommander: false,
  ...o,
});
const line = (variantId: string, o: CardComboOther, produces: string[] = ["Infinite damage"]): CardCombo => ({
  variantId, others: [o], produces, steps: null, manaNeeded: null, manaValueNeeded: null, notablePrerequisites: null, usesCommander: false,
});
const buy = (cents: number | null) => ({ kind: "buy" as const, cents, soldOut: false, qualifier: null });
const FIXTURE: CardCombo[] = [
  line("raptor", other("Marauding Raptor", { kind: "inDeck" })),
  line("forerunner", other("Forerunner of the Empire", { kind: "inDeck" })),
  line("tread", other("Where Ancients Tread", { kind: "spare" })),
  line("surge", other("Warstorm Surge", { kind: "elsewhere", decks: [{ id: "d-tov", name: "HD - Tovolar", committed: true }] })),
  line("terror", other("Terror of the Peaks", buy(3420))),
  line("pandemonium", other("Pandemonium", buy(310))),
];
const card = (combos: CardCombo[], inScope: boolean, partners?: ModalComboPartner[]): BrowseCard =>
  ({ oracleId: "c-poly", name: "Polyraptor", cardCombos: { combos, inScope }, comboPartners: partners }) as BrowseCard;

const header = () => screen.getByRole("button", { name: /Two-card combos/ });
const open = async () => {
  await act(async () => {
    header().click();
  });
};

describe("the combo block's near-combos face", () => {
  it("counts the closed row from the same lines", () => {
    render(<ComboPartnersDetail card={card(FIXTURE, true)} deckName="HD - Gishath" />);
    expect(header().textContent).toContain("2 in this deck · 2 you own · 2 you don’t");
  });

  it("draws the new face from cardCombos even when shipped partners ride along, never a switch", async () => {
    const shipped: ModalComboPartner[] = [{ oracleId: "x", name: "Shipped Partner", state: "owned", popularity: 1 }];
    render(<ComboPartnersDetail card={card(FIXTURE, false, shipped)} />);
    await open();
    expect(screen.queryByText("Shipped Partner")).toBeNull();
    expect(screen.getByText("Warstorm Surge")).toBeTruthy();
  });

  it("opened from a deck that lists the card: two groups, the scope line, in the board's order", async () => {
    render(<ComboPartnersDetail card={card(FIXTURE, true)} deckName="HD - Gishath" />);
    await open();
    expect(screen.getByText("against HD - Gishath")).toBeTruthy();
    const headings = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(headings).toEqual([combosCloseCopy.card.groups.whole, combosCloseCopy.card.groups.oneAway]);
    const lists = document.querySelectorAll("[data-combo-lines=split] ul");
    expect(lists).toHaveLength(2);
    const names = (ul: Element) => [...ul.querySelectorAll("li b")].map((b) => b.textContent);
    expect(names(lists[0])).toEqual(["Marauding Raptor", "Forerunner of the Empire"]);
    // Spare, elsewhere, then to buy cheapest first (OPEN-7).
    expect(names(lists[1])).toEqual(["Where Ancients Tread", "Warstorm Surge", "Pandemonium", "Terror of the Peaks"]);
    expect(within(lists[0] as HTMLElement).getAllByText(combosCloseCopy.detail.plate.inThisDeck)).toHaveLength(2);
    expect(screen.getByText("$34.20")).toBeTruthy();
  });

  it("deck-less: one flat list, no headings and no scope line", async () => {
    render(<ComboPartnersDetail card={card(FIXTURE.slice(2), false)} />);
    await open();
    expect(screen.queryAllByRole("heading", { level: 4 })).toHaveLength(0);
    expect(document.querySelector("[data-combo-lines=flat]")).not.toBeNull();
    expect(screen.queryByText(/^against /)).toBeNull();
  });

  it("a press on the line or its chevron opens the combo; the deck's link does not", async () => {
    const onOpenCombo = vi.fn();
    render(<ComboPartnersDetail card={card(FIXTURE, true)} deckName="HD - Gishath" onOpenCombo={onOpenCombo} />);
    await open();
    const surge = document.querySelector<HTMLElement>("[data-combo-line=surge]")!;
    fireEvent.click(within(surge).getByRole("link", { name: combosCloseCopy.sheet.where.deckLinkAria("HD - Tovolar") }));
    expect(onOpenCombo).not.toHaveBeenCalled();
    fireEvent.click(within(surge).getByText("Warstorm Surge"));
    expect(onOpenCombo).toHaveBeenLastCalledWith(FIXTURE[3]);
    fireEvent.click(screen.getByRole("button", { name: combosCloseCopy.card.openAria("Polyraptor", "Terror of the Peaks") }));
    expect(onOpenCombo).toHaveBeenLastCalledWith(FIXTURE[4]);
    expect(onOpenCombo).toHaveBeenCalledTimes(2);
  });

  it("a stacked card (no onOpenCombo) draws its lines with no chevron and no press (OPEN-9)", async () => {
    render(<ComboPartnersDetail card={card(FIXTURE, true)} deckName="HD - Gishath" />);
    await open();
    expect(document.querySelectorAll("[data-combo-press]")).toHaveLength(0);
    const raptor = document.querySelector<HTMLElement>("[data-combo-line=raptor]")!;
    expect(raptor.className).not.toContain("cursor-pointer");
  });

  it("the partner's name is plain text, never a button", async () => {
    render(<ComboPartnersDetail card={card(FIXTURE, true)} deckName="HD - Gishath" onSelectPartner={vi.fn()} onOpenCombo={vi.fn()} />);
    await open();
    expect(screen.queryByRole("button", { name: "Marauding Raptor" })).toBeNull();
  });

  it("marks a loop of turns beside the glyph, and a commander partner with its tag (OPEN-13)", async () => {
    const combos = [
      line("turns", other("Turn Partner", { kind: "spare" }), ["Infinite turns"]),
      line("cmdr", other("Gishath", { kind: "inDeck" }, { isCommander: true })),
    ];
    render(<ComboPartnersDetail card={card(combos, true)} deckName="HD - Gishath" />);
    await open();
    const turns = document.querySelector<HTMLElement>("[data-combo-line=turns]")!;
    expect(turns.querySelector('[data-testid="card-fact-extraTurns"]')).not.toBeNull();
    expect(document.querySelector('[data-combo-line=cmdr] [data-testid="card-fact-extraTurns"]')).toBeNull();
    const cmdr = document.querySelector<HTMLElement>("[data-combo-line=cmdr]")!;
    expect(within(cmdr).getByText(combosCloseCopy.sheet.commander)).toBeTruthy();
    expect(within(turns).queryByText(combosCloseCopy.sheet.commander)).toBeNull();
  });

  it("a line's press names the card by its printed name, as the sheet it opens does", async () => {
    render(<ComboPartnersDetail card={{ ...card(FIXTURE, true), printedName: "Godzilla, Doom Inevitable" }} deckName="HD - Gishath" onOpenCombo={vi.fn()} />);
    await open();
    expect(screen.getByRole("button", { name: combosCloseCopy.card.openAria("Godzilla, Doom Inevitable", "Terror of the Peaks") })).toBeTruthy();
  });
});
