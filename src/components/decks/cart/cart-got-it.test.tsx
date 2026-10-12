import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrintingChoice } from "../../../lib/collection/catalog-read";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { gotItCopy } from "../../../lib/copy/i-got-it";
import type { SelectedLine } from "../../../lib/decks/cart";

const { loadPrintingChoices, markBoughtForDecks, previewRevert } = vi.hoisted(() => ({
  loadPrintingChoices: vi.fn(),
  markBoughtForDecks: vi.fn(),
  previewRevert: vi.fn(),
}));
vi.mock("../../../app/collection/edit-actions", () => ({ loadPrintingChoices }));
vi.mock("../../../app/decks/mark-bought-actions", () => ({ markBoughtForDecks, markBought: vi.fn() }));
vi.mock("../../../app/collection/history-actions", () => ({ previewRevert, revertCollectionEntry: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { CartGotItProvider, cartReceiptBody, useCartGotIt } = await import("./cart-got-it");

const ORACLE = "33333333-3333-4333-8333-333333333333";
const G = "11111111-1111-4111-8111-111111111111";
const K = "22222222-2222-4222-8222-222222222222";
const NEWEST = new Date("2026-10-10T09:00:00Z");
const names = new Map([[G, "HD - Gishath"], [K, "HD - Kratos"]]);

const choice: PrintingChoice = {
  scryfallId: "a0000000-0000-4000-8000-000000000000", setCode: "cmm", setName: "Commander Masters",
  collectorNumber: "400", releasedAt: "2023-08-04", imageUri: null, flavorName: null,
  finishes: ["nonfoil"], owned: { nonfoil: 17 },
};

const line: SelectedLine = {
  oracleId: ORACLE, name: "Sol Ring", commander: false, owned: 17, heldElsewhere: 17,
  rows: [], selectedRows: [
    { deckId: G, quantity: 1, cents: 150, state: "priced", commander: false, held: 0, finish: null, printing: choice.scryfallId },
    { deckId: K, quantity: 1, cents: 150, state: "priced", commander: false, held: 0, finish: null, printing: choice.scryfallId },
  ],
  copies: 2, cents: 300, pricedCopies: 2,
};

function Opener() {
  const gotIt = useCartGotIt()!;
  return <button type="button" onClick={(e) => gotIt.open(line, e.currentTarget)}>open</button>;
}

beforeEach(() => {
  loadPrintingChoices.mockResolvedValue([choice]);
  previewRevert.mockResolvedValue({ rows: [], entryRows: [], differs: false, decks: [], expected: {} });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("cartReceiptBody", () => {
  it("names the covered decks, then the one still short", () => {
    expect(cartReceiptBody({
      covered: [{ deckId: G, deckName: "HD - Gishath" }],
      still: [{ deckId: K, deckName: "HD - Kratos", need: 1 }],
    }, names)).toBe(`${copy.receipt.covered(["HD - Gishath"])} ${copy.receipt.still("HD - Kratos", 1)}`);
  });

  it("names a deck the read gave no name from the cart's own list, and sums several still short", () => {
    expect(cartReceiptBody({
      covered: [],
      still: [{ deckId: G, deckName: "", need: 1 }, { deckId: K, deckName: "HD - Kratos", need: 2 }],
    }, names)).toBe(copy.receipt.stillMany(2, 3));
    expect(cartReceiptBody({ covered: [{ deckId: G, deckName: "" }], still: [] }, names))
      .toBe(copy.receipt.covered(["HD - Gishath"]));
  });
});

describe("CartGotItProvider", () => {
  it("opens a confirm for the line's decks and writes once for all of them", async () => {
    markBoughtForDecks.mockResolvedValue({ applied: { id: "e1", receipt: { covered: [{ deckId: G, deckName: "HD - Gishath" }, { deckId: K, deckName: "HD - Kratos" }], still: [] } } });
    render(<CartGotItProvider deckNames={names} newestAsOf={NEWEST}><Opener /></CartGotItProvider>);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    expect(await screen.findByText(copy.confirm.forDecks(2))).toBeTruthy();
    expect(screen.getByText("HD - Gishath")).toBeTruthy();
    expect(screen.getAllByText(copy.confirm.needsEach(1))).toHaveLength(2);
    expect(screen.getByText(copy.confirm.need(2, 2))).toBeTruthy();
    expect(screen.getByText(copy.confirm.readAgain)).toBeTruthy();
    const add = await screen.findByRole("button", { name: gotItCopy.confirm.add(2) });
    await act(async () => { fireEvent.click(add); });
    expect(markBoughtForDecks).toHaveBeenCalledWith(ORACLE, expect.objectContaining({
      deckIds: [G, K], scryfallId: choice.scryfallId, finish: "nonfoil", quantity: 2, expected: 17,
    }));
    // The receipt replaces the confirm, naming the decks the read says were covered.
    await waitFor(() => expect(screen.getByText(copy.receipt.covered(["HD - Gishath", "HD - Kratos"]))).toBeTruthy());
    expect(screen.queryByText(copy.confirm.forDecks(2))).toBeNull();
  });

  it("keeps the confirm and says nothing was added when the write is refused", async () => {
    markBoughtForDecks.mockResolvedValue({ refused: "notInDeck" });
    render(<CartGotItProvider deckNames={names} newestAsOf={NEWEST}><Opener /></CartGotItProvider>);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    const add = await screen.findByRole("button", { name: gotItCopy.confirm.add(2) });
    await act(async () => { fireEvent.click(add); });
    expect(await screen.findByText(gotItCopy.confirm.failedTitle)).toBeTruthy();
    expect(screen.getByText(copy.confirm.forDecks(2))).toBeTruthy();
  });

  const second: PrintingChoice = { ...choice, scryfallId: "b0000000-0000-4000-8000-000000000000", collectorNumber: "401", owned: { nonfoil: 0 } };
  const lineWith = (printings: (string | null)[]): SelectedLine => ({
    ...line,
    selectedRows: line.selectedRows.map((r, i) => ({ ...r, printing: printings[i] })),
  });
  function OpenerFor({ of }: { of: SelectedLine }) {
    const gotIt = useCartGotIt()!;
    return <button type="button" onClick={(e) => gotIt.open(of, e.currentTarget)}>open</button>;
  }

  it("presets the first deck's printing, and none when the first deck has none", async () => {
    loadPrintingChoices.mockResolvedValue([choice, second]);
    const { unmount } = render(<CartGotItProvider deckNames={names} newestAsOf={NEWEST}><OpenerFor of={lineWith([second.scryfallId, choice.scryfallId])} /></CartGotItProvider>);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    expect(await screen.findByRole("button", { name: gotItCopy.confirm.add(2) })).toBeTruthy();
    expect(screen.getAllByRole("radio").find((r) => r.getAttribute("aria-checked") === "true")?.textContent).toContain("#401");
    unmount();
    render(<CartGotItProvider deckNames={names} newestAsOf={NEWEST}><OpenerFor of={lineWith([null, choice.scryfallId])} /></CartGotItProvider>);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    // Once the choices have loaded, nothing is selected.
    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(2));
    expect(screen.getAllByRole("radio").some((r) => r.getAttribute("aria-checked") === "true")).toBe(false);
  });

  it("keeps the player's printing through a refused press", async () => {
    loadPrintingChoices.mockResolvedValue([choice, second]);
    markBoughtForDecks.mockResolvedValue({ refused: "notInDeck" });
    render(<CartGotItProvider deckNames={names} newestAsOf={NEWEST}><OpenerFor of={lineWith([choice.scryfallId, choice.scryfallId])} /></CartGotItProvider>);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    await screen.findByRole("button", { name: gotItCopy.confirm.add(2) });
    const pickSecond = screen.getAllByRole("radio").find((r) => r.textContent?.includes("#401"))!;
    fireEvent.click(pickSecond);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.add(2) })); });
    await screen.findByText(gotItCopy.confirm.failedTitle);
    expect(screen.getAllByRole("radio").find((r) => r.getAttribute("aria-checked") === "true")?.textContent).toContain("#401");
  });

  it("says the cart, never the deck, when a copy landed elsewhere while it was open", async () => {
    markBoughtForDecks.mockResolvedValue({ stale: [{ oracleId: ORACLE, setCode: "cmm", collectorNumber: "400", finish: "nonfoil", quantity: 18 }] });
    render(<CartGotItProvider deckNames={names} newestAsOf={NEWEST}><Opener /></CartGotItProvider>);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    const add = await screen.findByRole("button", { name: gotItCopy.confirm.add(2) });
    await act(async () => { fireEvent.click(add); });
    expect(await screen.findByText(copy.confirm.staleBody(1), { exact: false })).toBeTruthy();
  });
});
