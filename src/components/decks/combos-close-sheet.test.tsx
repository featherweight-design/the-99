import { priceCopy } from "../../lib/copy/price";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { combosCloseCopy } from "../../lib/copy/combos-close";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { SPELLBOOK_SOURCE } from "../../lib/bracket/sources";
import { comboModal } from "../../lib/bracket/combo-modal";
import type { MissingPieceWhere, NearCombo, NearComboCard, NearCombos } from "../../lib/combos/near-combos";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";

// What a card stacked on the sheet calls it: `registerSheet`'s first argument.
const registerSheet = vi.fn<(label: string, ...rest: unknown[]) => () => void>(() => () => {});
vi.mock("../cards/card-detail-provider", () => ({
  useCardDetail: () => ({ registerSheet, openOracleId: null, revealing: false }),
  // A plate is a press that opens the card: drawn as a button, as the real trigger is.
  CardDetailTrigger: ({ children, testId, describedBy }: { children?: React.ReactNode; testId?: string; describedBy?: string }) => (
    <button type="button" data-testid={testId} aria-describedby={describedBy}>{children}</button>
  ),
}));
const addCardToDeck = vi.fn<(deckId: string, oracleId: string) => Promise<DeckMutationResult>>();
vi.mock("../../app/decks/actions", () => ({ addCardToDeck: (d: string, o: string) => addCardToDeck(d, o) }));

const { CombosCloseSheet, groupNearCombos } = await import("./combos-close-sheet");
const { AddOptimisticCardProvider } = await import("./optimistic-deck");
const { ComboBody } = await import("./receipt-modal");
const copy = combosCloseCopy.sheet;
const detail = combosCloseCopy.detail;

const COMMANDER = "cmd";
const combo = (id: string, missing: string, held: string, where: MissingPieceWhere, produces = ["Infinite damage"]): NearCombo => ({
  variantId: id,
  pieces: [
    { oracleId: `${held}-id`, name: held, held: true },
    { oracleId: `${missing}-id`, name: missing, held: false },
  ].map((p) => (p.name === held && held === "Avatar Aang" ? { ...p, oracleId: COMMANDER } : p)),
  missing: { oracleId: `${missing}-id`, name: missing, where, card: null },
  produces,
  steps: null,
  manaNeeded: null,
  manaValueNeeded: null,
  notablePrerequisites: null,
  usesCommander: held === "Avatar Aang",
});

// The read's own order: spare, elsewhere, priced buy, unpriced buy.
const LIST: NearCombo[] = [
  combo("1", "Exquisite Blood", "Sanguine Bond", { kind: "spare" }, ["Infinite lifeloss"]),
  combo("2", "Heliod, Sun-Crowned", "Walking Ballista", {
    kind: "elsewhere",
    decks: [
      { id: "gods", name: "HD - Gods", committed: true },
      { id: "brew", name: "A brew", committed: false },
      { id: "brew2", name: "Another brew", committed: false },
    ],
  }),
  combo("3", "Searing Touch", "Avatar Aang", { kind: "buy", cents: 149, soldOut: false, qualifier: null }),
  combo("4", "Time Vault", "Voltaic Key", { kind: "buy", cents: 115000, soldOut: false, qualifier: null }, ["Infinite turns"]),
  combo("5", "Odd Card", "Some Piece", { kind: "buy", cents: null, soldOut: true, qualifier: null }),
];

const ART = new Map([[COMMANDER, { name: "Avatar Aang", imageUri: "https://img/aang.jpg" }]]);
const optimisticAdd = vi.fn();
const EDITS = { add: optimisticAdd } as unknown as Parameters<typeof AddOptimisticCardProvider>[0]["value"];

function sheet(list: NearCombo[], total: number) {
  const nearCombos: NearCombos = { combos: list, total };
  return (
    <AddOptimisticCardProvider value={EDITS}>
      <CombosCloseSheet
        nearCombos={nearCombos}
        deckId="deck-1"
        deckName="HD - Avatar Aang"
        commanderOracleIds={[COMMANDER]}
        art={ART}
        onClose={vi.fn()}
      />
    </AddOptimisticCardProvider>
  );
}

function draw(list: NearCombo[] = LIST, total = list.length) {
  return render(sheet(list, total));
}

const rows = () => [...document.querySelectorAll<HTMLElement>("[data-combo-row]")];
const row = (name: string) => rows().find((r) => r.textContent!.includes(name))!;
const whereLine = (name: string) => row(name).querySelector<HTMLElement>("[data-where-line]")!;

describe("CombosCloseSheet", () => {
  it("heads the sheet One piece away · N combos, with the deck in the lead, singular for one", () => {
    const view = draw();
    expect(screen.getByText(copy.eyebrow)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "5 combos" })).toBeTruthy();
    expect(screen.getByText("Each needs one more card in HD - Avatar Aang. Here’s where that card is.")).toBeTruthy();
    view.unmount();
    draw([LIST[0]]);
    expect(screen.getByRole("heading", { name: "1 combo" })).toBeTruthy();
    expect(screen.getByText("It needs one more card in HD - Avatar Aang. Here’s where that card is.")).toBeTruthy();
  });

  it("groups You own it (spare, then another deck) over To buy (cheapest first, unpriced last), each with its count", () => {
    draw();
    const headings = [...document.querySelectorAll("[data-combos-close-group]")].map((h) => h.textContent);
    expect(headings).toEqual([`${copy.groups.own}2`, `${copy.groups.buy}3`]);
    expect(rows().map((r) => r.dataset.where)).toEqual(["spare", "elsewhere", "buy", "buy", "buy"]);
    // You own it keeps the read's order; To buy is a price list, cheapest first and unpriced last.
    const { own, buy } = groupNearCombos([LIST[2], LIST[0], LIST[4], LIST[1], LIST[3]]);
    expect(own.map((c) => c.variantId)).toEqual(["1", "2"]);
    expect(buy.map((c) => c.variantId)).toEqual(["3", "4", "5"]);
  });

  it("sorts To buy by price even where the read led with one combo per outcome", () => {
    // The read's order: $1 (outcome A), $10 (outcome B, promoted as its outcome's first), $2 (A again).
    const read = [
      combo("a1", "One", "Piece", { kind: "buy", cents: 100, soldOut: false, qualifier: null }, ["Infinite mana"]),
      combo("b10", "Ten", "Piece", { kind: "buy", cents: 1000, soldOut: false, qualifier: null }, ["Infinite turns"]),
      combo("a2", "Two", "Piece", { kind: "buy", cents: 200, soldOut: false, qualifier: null }, ["Infinite mana"]),
    ];
    expect(groupNearCombos(read).buy.map((c) => c.variantId)).toEqual(["a1", "a2", "b10"]);
  });

  it("lets a long deck name wrap inside its column, keeping the +N after it", () => {
    const long = "HD - " + "Averyveryverylongunbrokendeckname".repeat(3);
    draw([combo("l", "Long Deck Piece", "Piece", { kind: "elsewhere", decks: [{ id: "x", name: long, committed: true }, { id: "y", name: "Other", committed: false }] })]);
    const link = screen.getByRole("link", { name: copy.where.deckLinkAria(long) });
    expect(link.className).toContain("[overflow-wrap:anywhere]");
    expect(link.parentElement!.className).toContain("min-w-0");
    expect(whereLine("Long Deck Piece").textContent).toBe(`${copy.where.inDeck} ${long} ${copy.where.more(1)}`);
  });

  it("names a foil-only or etched-only price's finish beside the figure, as the buy tag does", () => {
    draw([
      combo("f", "Foil Card", "Piece", { kind: "buy", cents: 940, soldOut: false, qualifier: "foil" }),
      combo("e", "Etched Card", "Piece", { kind: "buy", cents: 1200, soldOut: false, qualifier: "etched" }),
    ]);
    expect(whereLine("Foil Card").textContent).toBe("$9.40 foil");
    expect(whereLine("Etched Card").textContent).toBe("$12.00 etched");
  });

  it("draws no group that has no rows", () => {
    draw(LIST.slice(2));
    expect([...document.querySelectorAll("[data-combos-close-group]")].map((h) => h.textContent)).toEqual([`${copy.groups.buy}3`]);
    expect(screen.queryByText(copy.groups.own)).toBeNull();
  });

  it("names the missing card, with the held piece, and tags a commander", () => {
    draw();
    expect(row("Searing Touch").textContent).toContain("with Avatar Aang" + copy.commander);
    expect(row("Exquisite Blood").textContent).toContain("with Sanguine Bond");
    expect(row("Exquisite Blood").textContent).not.toContain(copy.commander);
  });

  it("says where each missing card is: a spare, in another deck, or its price", () => {
    draw();
    expect(whereLine("Exquisite Blood").textContent).toBe(copy.where.spare);
    expect(whereLine("Exquisite Blood").querySelector('[data-dot="owned"]')).not.toBeNull();
    expect(whereLine("Searing Touch").textContent).toBe("$1.49");
    expect(whereLine("Searing Touch").querySelector('[data-dot="buy"]')).not.toBeNull();
    expect(whereLine("Time Vault").textContent).toBe("$1,150.00");
    // Stocked before and not now: the buy tag's own word. Never stocked: silence, as the tag leaves it.
    expect(whereLine("Odd Card").textContent).toBe(priceCopy.tag.soldOut);
  });

  it("leaves a card the feed has never stocked silent after its dot, as the buy tag does", () => {
    draw([combo("6", "Never Stocked", "Other Piece", { kind: "buy", cents: null, soldOut: false, qualifier: null })]);
    expect(whereLine("Never Stocked").textContent).toBe("");
    expect(whereLine("Never Stocked").querySelector('[data-dot="buy"]')).not.toBeNull();
  });

  it("names the first committed deck as a link to it, with +N for the rest", () => {
    draw();
    const line = whereLine("Heliod, Sun-Crowned");
    expect(line.textContent).toBe("in HD - Gods +2");
    const link = within(line).getByRole("link", { name: copy.where.deckLinkAria("HD - Gods") });
    expect(link).toHaveAttribute("href", "/decks/gods");
    // The row is a container, not a button: a link may not sit inside one.
    expect(link.closest("button")).toBeNull();
    expect(row("Heliod, Sun-Crowned").tagName).toBe("DIV");
  });

  it("draws the turn-again mark only on a combo that loops turns, and says what each does", () => {
    draw();
    expect(row("Time Vault").querySelector('[data-testid="card-fact-extraTurns"]')).not.toBeNull();
    expect(row("Searing Touch").querySelector('[data-testid="card-fact-extraTurns"]')).toBeNull();
    expect(row("Exquisite Blood").textContent).toContain("Infinite lifeloss");
  });

  it("ends the list with where it comes from, and the sheet sizes to its rows in the 900 modal", () => {
    draw();
    expect(screen.getByText(copy.foot)).toBeTruthy();
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("md:w-[900px]");
    expect(dialog.className).toContain("max-h-[calc(100%-52px)]");
    expect(dialog.className).toContain("rounded-t-[18px]");
    expect(screen.getByRole("button", { name: copy.done })).toBeTruthy();
  });
});

// UI-2: the combo, pushed inside the sheet (`How-It-Works.dc.html`).
const press = (name: string) => row(name).querySelector<HTMLButtonElement>("[data-combo-press]")!;
const shownDetail = () => document.querySelector<HTMLElement>("[data-combo-detail]");
const plate = (name: string) => screen.getAllByTestId("receipt-tile").find((t) => t.textContent!.includes(name))!;
const plateWhere = (name: string) => plate(name).querySelector<HTMLElement>("[data-plate-where]");
const CARD: NearComboCard = {
  typeLine: "Instant", cardTypeGroup: "Instants", role: "removal", cmc: 1, manaCost: "{R}", imageUri: "https://img/searing.jpg",
};
const SEARING: NearCombo = {
  ...LIST[2],
  missing: { ...LIST[2].missing, card: CARD },
  steps: "Cast Searing Touch with buyback.\nIt goes back to your hand.\n",
  manaNeeded: "{R}",
  manaValueNeeded: 1,
  notablePrerequisites: "Avatar Aang transformed into Aang, Master of Elements.",
};

describe("a row opens its combo inside the sheet", () => {
  beforeEach(() => {
    registerSheet.mockClear();
    addCardToDeck.mockReset();
    optimisticAdd.mockReset();
  });

  it("pushes the combo on the row's press, under ← N combos, at 760 with no Done", () => {
    draw();
    expect(shownDetail()).toBeNull();
    fireEvent.click(press("Searing Touch"));
    expect(shownDetail()?.dataset.comboDetail).toBe("3");
    expect(document.querySelector("[data-combos-close-list]")).toHaveAttribute("hidden");
    const back = screen.getByRole("button", { name: detail.backAria(5) });
    expect(back.textContent).toBe("←" + detail.back(5));
    expect(back).toHaveFocus();
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("md:w-[760px]");
    expect(screen.queryByRole("button", { name: copy.done })).toBeNull();
    // The close stays, beside the way back.
    expect(screen.getByRole("button", { name: copy.closeAria })).toBeTruthy();
  });

  it("pushes it from a press anywhere else on the row too", () => {
    draw();
    fireEvent.click(within(row("Exquisite Blood")).getByText("Exquisite Blood"));
    expect(shownDetail()?.dataset.comboDetail).toBe("1");
  });

  it("returns to the same list on the way back, focus on the row it left", () => {
    draw();
    const list = document.querySelector("[data-combos-close-list]");
    fireEvent.click(press("Time Vault"));
    fireEvent.click(screen.getByRole("button", { name: detail.backAria(5) }));
    expect(shownDetail()).toBeNull();
    // The same node, kept under the combo, so its scroll and rows are where the reader left them.
    expect(document.querySelector("[data-combos-close-list]")).toBe(list);
    expect(list).not.toHaveAttribute("hidden");
    expect(press("Time Vault")).toHaveFocus();
    expect(screen.getByRole("button", { name: copy.done })).toBeTruthy();
  });

  it("leaves the other deck's link its own control: it navigates and does not open the combo", () => {
    draw();
    const link = within(row("Heliod, Sun-Crowned")).getByRole("link");
    expect(link).toHaveAttribute("href", "/decks/gods");
    // Next's Link stands down for a press already handled; the row's own handler still sees it.
    link.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(link);
    expect(shownDetail()).toBeNull();
    expect(link.closest("button")).toBeNull();
  });

  it("makes the press a real button a keyboard reaches, so Enter and Space open the combo", () => {
    draw();
    const p = press("Searing Touch");
    expect(p.tagName).toBe("BUTTON");
    expect(p).toHaveAttribute("type", "button");
    expect(p).not.toHaveAttribute("tabindex");
    expect(p).toHaveAccessibleName(copy.openAria("Searing Touch", ["Avatar Aang"]));
    // What a browser does with Enter or Space on a focused button.
    p.focus();
    act(() => p.click());
    expect(shownDetail()?.dataset.comboDetail).toBe("3");
  });

  it("draws the combo's steps, mana and needs from the stored fields, as the receipt reads them", () => {
    draw([SEARING]);
    fireEvent.click(press("Searing Touch"));
    const body = within(shownDetail()!);
    expect(body.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Infinite damage",
      "Cast Searing Touch with buyback.",
      "It goes back to your hand.",
    ]);
    expect(shownDetail()!.querySelector('[data-mana="costs"]')).not.toBeNull();
    expect(body.getByText(deckAnalysisCopy.receipt.prerequisites)).toBeTruthy();
    expect(body.getByText("Avatar Aang transformed into Aang, Master of Elements.")).toBeTruthy();
    // The title leads with the lemniscate, then the pair.
    const title = body.getByRole("heading", { level: 3 });
    expect(title.querySelector("svg")).not.toBeNull();
    expect(title.textContent).toBe("Avatar Aang + Searing Touch");
  });

  it("says where each piece is under its plate, and outlines the missing one", () => {
    draw([SEARING]);
    fireEvent.click(press("Searing Touch"));
    expect(plateWhere("Avatar Aang")!.textContent).toBe(detail.plate.inThisDeck);
    expect(plateWhere("Avatar Aang")!.querySelector('[data-dot="owned"]')).not.toBeNull();
    expect(plateWhere("Searing Touch")!.textContent).toBe("$1.49");
    expect(plateWhere("Searing Touch")!.querySelector('[data-dot="buy"]')).not.toBeNull();
    expect(plate("Searing Touch").querySelector("[data-missing-piece]")!.className).toContain("[outline:1.5px_dashed_var(--accent)]");
    expect(plate("Avatar Aang").querySelector("[data-missing-piece]")).toBeNull();
    // Focusing a plate says where the card is: its where-line describes the press.
    const describedBy = plate("Searing Touch").getAttribute("aria-describedby");
    expect(describedBy && document.getElementById(describedBy)).toBe(plateWhere("Searing Touch"));
    expect(registerSheet).toHaveBeenLastCalledWith("Avatar Aang + Searing Touch", undefined, false, undefined);
    // The missing card's art is the catalog's (the read's `missing.card`).
    expect(plate("Searing Touch").querySelector<HTMLImageElement>("img")?.getAttribute("src") ?? plate("Searing Touch").innerHTML).toContain("https://img/searing.jpg");
  });

  it.each([
    ["a spare", { kind: "spare" } as MissingPieceWhere, detail.plate.spare, "owned"],
    // The detail lists every deck holding a copy (G4), committed first; the row names the first and +N.
    ["another deck's", LIST[1].missing.where, "in HD - Gods, A brew, Another brew", "owned"],
    ["a foil price", { kind: "buy", cents: 940, soldOut: false, qualifier: "foil" } as MissingPieceWhere, "$9.40 foil", "buy"],
    ["sold out", { kind: "buy", cents: null, soldOut: true, qualifier: null } as MissingPieceWhere, priceCopy.tag.soldOut, "buy"],
    ["never stocked", { kind: "buy", cents: null, soldOut: false, qualifier: null } as MissingPieceWhere, "", "buy"],
  ])("writes %s on the missing plate as the row decides it", (_, where, text, dot) => {
    draw([combo("w", "Missing Card", "Avatar Aang", where)]);
    fireEvent.click(press("Missing Card"));
    expect(plateWhere("Missing Card")!.textContent).toBe(text);
    expect(plateWhere("Missing Card")!.querySelector(`[data-dot="${dot}"]`)).not.toBeNull();
    // The plate is a press (it opens the card), so a deck it names is words, never a link inside it.
    expect(within(shownDetail()!).queryByRole("link", { name: copy.where.deckLinkAria("HD - Gods") })).toBeNull();
  });

  it("lays the plates out held first and the missing piece last, the title in the same order", () => {
    // The read sorts pieces by name (`shapeNearCombos`), so the missing "Aardvark Lens" arrives first.
    const byName = combo("o", "Aardvark Lens", "Zebra Totem", { kind: "spare" });
    draw([{ ...byName, pieces: [...byName.pieces].sort((a, b) => a.name.localeCompare(b.name)) }]);
    fireEvent.click(press("Aardvark Lens"));
    const names = within(shownDetail()!).getAllByTestId("receipt-tile").map((t) => t.textContent);
    expect(names[0]).toContain("Zebra Totem");
    expect(names[1]).toContain("Aardvark Lens");
    expect(within(shownDetail()!).getByRole("heading", { level: 3 }).textContent).toMatch(/Zebra Totem.*\+.*Aardvark Lens/);
    // The dialog's title and a stacked card's back label name it in the same order.
    expect(registerSheet).toHaveBeenLastCalledWith("Zebra Totem + Aardvark Lens", undefined, false, undefined);
  });

  it("keeps the turn-again mark beside the combo mark in the detail's title for a loop of turns", () => {
    draw();
    fireEvent.click(press("Time Vault"));
    const title = within(shownDetail()!).getByRole("heading", { level: 3 });
    expect(title.querySelector('[data-testid="card-fact-extraTurns"]')).not.toBeNull();
  });

  it("draws no turn-again mark on a combo that does not loop turns", () => {
    draw([SEARING]);
    fireEvent.click(press("Searing Touch"));
    expect(within(shownDetail()!).getByRole("heading", { level: 3 }).querySelector('[data-testid="card-fact-extraTurns"]')).toBeNull();
  });

  it("ends the combo with Commander Spellbook bottom left and Add bottom right, and nothing else", () => {
    draw([SEARING]);
    fireEvent.click(press("Searing Touch"));
    const foot = shownDetail()!.querySelector<HTMLElement>('[data-combo-foot="one-away"]')!;
    const link = within(foot).getByRole("link");
    expect(link).toHaveAttribute("href", SPELLBOOK_SOURCE.variantUrl("3"));
    expect(link.textContent).toBe(deckAnalysisCopy.provenance.source(deckAnalysisCopy.receipt.spellbook));
    expect(within(foot).getByRole("button").textContent).toBe(detail.add("Searing Touch"));
    expect(foot.textContent).not.toContain(deckAnalysisCopy.receipt.assembled);
  });

  it("leaves the Analysis receipt's foot as it shipped: assembled, the link, no Add and no where-lines", () => {
    render(<ComboBody combo={comboModal({ ...SEARING, cards: SEARING.pieces, bracketTag: "" })} art={new Map()} />);
    const body = screen.getByTestId("receipt-combo");
    expect(body.querySelector("[data-combo-foot]")).toBeNull();
    expect(within(body).getByText(deckAnalysisCopy.receipt.assembled)).toBeTruthy();
    expect(within(body).getByRole("link")).toHaveAttribute("href", SPELLBOOK_SOURCE.variantUrl("3"));
    expect(within(body).queryByText(detail.add("Searing Touch"))).toBeNull();
    expect(body.querySelector("[data-plate-where]")).toBeNull();
    expect(body.querySelector("[data-missing-piece]")).toBeNull();
    expect(within(body).getByRole("heading", { level: 3 }).querySelector("svg")).toBeNull();
  });

  it("adds the missing card to this deck, predicts its row, then goes back to the list", async () => {
    addCardToDeck.mockResolvedValue({ ok: true });
    draw([SEARING, LIST[0]]);
    fireEvent.click(press("Searing Touch"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: detail.add("Searing Touch") }));
    });
    expect(addCardToDeck).toHaveBeenCalledWith("deck-1", "Searing Touch-id");
    expect(optimisticAdd).toHaveBeenCalledWith(
      expect.objectContaining({ oracleId: "Searing Touch-id", name: "Searing Touch", typeLine: "Instant", owned: false, quantity: 1, imageUri: CARD.imageUri }),
    );
    expect(shownDetail()).toBeNull();
    expect(press("Searing Touch")).toHaveFocus();
  });

  it("keeps focus in the sheet when the added combo's row then leaves the list", async () => {
    addCardToDeck.mockResolvedValue({ ok: true });
    const view = draw([SEARING, LIST[0]]);
    fireEvent.click(press("Searing Touch"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: detail.add("Searing Touch") }));
    });
    // The revalidated read drops the added combo: focus lands on the surviving row, not the page.
    view.rerender(sheet([LIST[0]], 1));
    expect(press("Exquisite Blood")).toHaveFocus();
  });

  it("does not let a late Add dismiss another combo the reader has opened since", async () => {
    let finish: (r: DeckMutationResult) => void = () => {};
    addCardToDeck.mockReturnValue(new Promise<DeckMutationResult>((r) => (finish = r)));
    draw([SEARING, LIST[0]]);
    fireEvent.click(press("Searing Touch"));
    fireEvent.click(screen.getByRole("button", { name: detail.add("Searing Touch") }));
    // Back to the list while it is pending, and into another combo.
    fireEvent.click(document.querySelector<HTMLButtonElement>("[data-sheet-back]")!);
    fireEvent.click(press("Exquisite Blood"));
    await act(async () => finish({ ok: true }));
    expect(shownDetail()?.getAttribute("data-combo-detail")).toBe(LIST[0].variantId);
  });

  it("stays on the combo and says why when the add is refused", async () => {
    addCardToDeck.mockResolvedValue({ ok: false, message: "That deck is full." });
    draw([SEARING]);
    fireEvent.click(press("Searing Touch"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: detail.add("Searing Touch") }));
    });
    expect(shownDetail()).not.toBeNull();
    expect(screen.getByRole("alert").textContent).toBe("That deck is full.");
  });

  it("is back on the list when the read stops listing the open combo", () => {
    const view = draw([SEARING, LIST[0]], 2);
    fireEvent.click(press("Searing Touch"));
    view.rerender(sheet([LIST[0]], 1));
    expect(shownDetail()).toBeNull();
    expect(screen.getByRole("heading", { name: "1 combo" })).toBeTruthy();
  });
});
