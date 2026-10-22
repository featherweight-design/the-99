import { priceCopy } from "../../lib/copy/price";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { combosCloseCopy } from "../../lib/copy/combos-close";
import type { MissingPieceWhere, NearCombo, NearCombos } from "../../lib/combos/near-combos";

vi.mock("../cards/card-detail-provider", () => ({
  useCardDetail: () => ({ registerSheet: () => () => {}, openOracleId: null, revealing: false }),
  CardDetailTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const { CombosCloseSheet, groupNearCombos } = await import("./combos-close-sheet");
const copy = combosCloseCopy.sheet;

const COMMANDER = "cmd";
const combo = (id: string, missing: string, held: string, where: MissingPieceWhere, produces = ["Infinite damage"]): NearCombo => ({
  variantId: id,
  pieces: [
    { oracleId: `${held}-id`, name: held, held: true },
    { oracleId: `${missing}-id`, name: missing, held: false },
  ].map((p) => (p.name === held && held === "Avatar Aang" ? { ...p, oracleId: COMMANDER } : p)),
  missing: { oracleId: `${missing}-id`, name: missing, where },
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

function draw(list: NearCombo[] = LIST, total = list.length) {
  const nearCombos: NearCombos = { combos: list, total };
  return render(<CombosCloseSheet nearCombos={nearCombos} deckName="HD - Avatar Aang" commanderOracleIds={[COMMANDER]} onClose={vi.fn()} />);
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
