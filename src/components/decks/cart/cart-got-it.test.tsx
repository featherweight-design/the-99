import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrintingChoice } from "../../../lib/collection/catalog-read";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { gotItCopy } from "../../../lib/copy/i-got-it";
import { cardAssignmentsCopy } from "../../../lib/copy/card-assignments";
import type { SelectedLine } from "../../../lib/decks/cart";

const { loadPrintingChoices, markBoughtForDecks, readCartChooser, previewRevert, revertCollectionEntry } = vi.hoisted(() => ({
  loadPrintingChoices: vi.fn(),
  markBoughtForDecks: vi.fn(),
  readCartChooser: vi.fn(),
  previewRevert: vi.fn(),
  revertCollectionEntry: vi.fn(),
}));
vi.mock("../../../app/collection/edit-actions", () => ({ loadPrintingChoices }));
vi.mock("../../../app/decks/mark-bought-actions", () => ({ markBoughtForDecks, readCartChooser, markBought: vi.fn() }));
vi.mock("../../../app/decks/assignment-actions", () => ({ assignCopy: vi.fn() }));
vi.mock("../../../app/collection/history-actions", () => ({ previewRevert, revertCollectionEntry }));
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
  readCartChooser.mockResolvedValue(null);
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

  it("says `as you picked` only when the read covers the picked deck (S4, lock 7)", () => {
    const facts = { covered: [{ deckId: G, deckName: "HD - Gishath" }], still: [{ deckId: K, deckName: "HD - Kratos", need: 1 }] };
    expect(cartReceiptBody(facts, names, G)).toBe(`${copy.receipt.covered(["HD - Gishath"], true)} ${copy.receipt.still("HD - Kratos", 1)}`);
    expect(copy.receipt.covered(["HD - Gishath"], true)).toContain("as you picked");
    // The pick went somewhere the read does not confirm: the receipt names what the read says.
    expect(cartReceiptBody(facts, names, K)).toBe(`${copy.receipt.covered(["HD - Gishath"])} ${copy.receipt.still("HD - Kratos", 1)}`);
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
    // One copy landed elsewhere, and the roll-up says the cart still needs 2: a copy can clear a brew's
    // row or none, so the server's figure stands over the holding's re-base (which would say 1).
    markBoughtForDecks.mockResolvedValue({ stale: [{ oracleId: ORACLE, setCode: "cmm", collectorNumber: "400", finish: "nonfoil", quantity: 18 }], need: 2 });
    render(<CartGotItProvider deckNames={names} newestAsOf={NEWEST}><Opener /></CartGotItProvider>);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    const add = await screen.findByRole("button", { name: gotItCopy.confirm.add(2) });
    await act(async () => { fireEvent.click(add); });
    expect(await screen.findByText(copy.confirm.staleBody(2), { exact: false })).toBeTruthy();
  });

  // What the line says was added this visit, read from the provider as the cart's rows read it.
  function Counts() {
    const held = useCartGotIt()!.held.get(ORACLE);
    return <output data-testid="held">{held ? `${held.added}|${[...held.deckIds].sort().join(",")}` : "none"}</output>;
  }
  const oneDeck = (deckId: string, id: string): SelectedLine => ({
    ...line, copies: 1, cents: 150, pricedCopies: 1, selectedRows: line.selectedRows.filter((r) => r.deckId === deckId),
  });
  function Press({ of, label }: { of: SelectedLine; label: string }) {
    const gotIt = useCartGotIt()!;
    return <button type="button" onClick={(e) => gotIt.open(of, e.currentTarget)}>{label}</button>;
  }
  const buy = async (label: string, entry: string, quantity: number) => {
    markBoughtForDecks.mockResolvedValueOnce({ applied: { id: entry, quantity, receipt: { covered: [], still: [] } } });
    fireEvent.click(screen.getByRole("button", { name: label }));
    const add = await screen.findByRole("button", { name: gotItCopy.confirm.add(quantity) });
    await act(async () => { fireEvent.click(add); });
    await waitFor(() => expect(screen.getByRole("button", { name: gotItCopy.receipt.undoAria("Sol Ring") })).toBeTruthy());
  };

  it("counts what was added across presses, for the union of their decks", async () => {
    render(<CartGotItProvider deckNames={names} newestAsOf={NEWEST}><Press of={oneDeck(G, "a")} label="g" /><Press of={oneDeck(K, "b")} label="k" /><Counts /></CartGotItProvider>);
    await buy("g", "e1", 1);
    expect(screen.getByTestId("held").textContent).toBe(`1|${G}`);
    await buy("k", "e2", 1);
    // The second press was for another deck: both decks keep the slot, and both copies are counted.
    expect(screen.getByTestId("held").textContent).toBe(`2|${[G, K].sort().join(",")}`);
  });

  it("forgets the line once its only press is undone, so no slot is held for it", async () => {
    revertCollectionEntry.mockResolvedValue({ reverted: true });
    render(<CartGotItProvider deckNames={names} newestAsOf={NEWEST}><Press of={oneDeck(G, "a")} label="g" /><Counts /></CartGotItProvider>);
    await buy("g", "e1", 1);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: gotItCopy.receipt.undoAria("Sol Ring") })); });
    await waitFor(() => expect(screen.getByTestId("held").textContent).toBe("none"));
  });

  it("takes an undone press back out of the count, and its decks", async () => {
    revertCollectionEntry.mockResolvedValue({ reverted: true });
    render(<CartGotItProvider deckNames={names} newestAsOf={NEWEST}><Press of={oneDeck(G, "a")} label="g" /><Press of={oneDeck(K, "b")} label="k" /><Counts /></CartGotItProvider>);
    await buy("g", "e1", 1);
    await buy("k", "e2", 1);
    // The receipt on screen is the latest press's: undoing it subtracts that purchase only.
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: gotItCopy.receipt.undoAria("Sol Ring") })); });
    await waitFor(() => expect(screen.getByTestId("held").textContent).toBe(`1|${G}`));
    await buy("k", "e3", 1);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: gotItCopy.receipt.undoAria("Sol Ring") })); });
    await waitFor(() => expect(screen.getByTestId("held").textContent).toBe(`1|${G}`));
  });

});

describe("the S1b chooser", () => {
  const T = "44444444-4444-4444-8444-444444444444";
  const three: SelectedLine = {
    ...line,
    selectedRows: [...line.selectedRows, { ...line.selectedRows[0], deckId: T }],
    copies: 3, cents: 450, pricedCopies: 3,
  };
  const names3 = new Map([...names, [T, "HD -Thorin"]]);
  const claimant = (deckId: string, deckName: string) => ({
    deckId, deckName, quantity: 1, commanderCopies: 0, granted: 0, since: null, versionNumber: null, brew: true, allocated: 0,
  });
  const contested = {
    oracleId: ORACLE, cardName: "Sol Ring", arrived: 0, ownedBefore: 0, fromImport: false, owned: 17,
    claimants: [claimant(G, "HD - Gishath"), claimant(K, "HD - Kratos"), claimant(T, "HD -Thorin")],
  };
  function Opener3() {
    const gotIt = useCartGotIt()!;
    return <button type="button" onClick={(e) => gotIt.open(three, e.currentTarget)}>open</button>;
  }
  const CHOOSER = /^Which decks get Sol Ring/;
  const open = async () => {
    render(<CartGotItProvider deckNames={names3} newestAsOf={NEWEST}><Opener3 /></CartGotItProvider>);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    await screen.findByRole("button", { name: gotItCopy.confirm.add(3) });
    await waitFor(() => expect(readCartChooser).toHaveBeenCalledWith(ORACLE, [G, K, T]));
  };

  it("lists the decks at full count, and turns them into the chooser below it", async () => {
    readCartChooser.mockResolvedValue(contested);
    await open();
    expect(screen.queryByRole("radiogroup", { name: CHOOSER })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.fewer }));
    const group = await screen.findByRole("radiogroup", { name: CHOOSER });
    // Two copies, three decks, every one a brew: the first two listed get one, the third buys.
    const options = within(group).getAllByRole("radio");
    expect(options.map((o) => o.getAttribute("aria-checked"))).toEqual(["false", "false", "false"]);
    const c = cardAssignmentsCopy.contested;
    expect(options.map((o) => o.getAttribute("aria-label"))).toEqual([
      c.a11yOption("HD - Gishath", c.gets), c.a11yOption("HD - Kratos", c.gets), c.a11yOption("HD -Thorin", c.buys),
    ]);
    // A pick moves a copy: Thorin gets it, the last of the default order buys.
    fireEvent.click(options[2]);
    expect(within(group).getAllByRole("radio").map((o) => o.getAttribute("aria-label"))).toEqual([
      c.a11yOption("HD - Gishath", c.gets), c.a11yOption("HD - Kratos", c.buys), c.a11ySelected("HD -Thorin"),
    ]);
  });

  it("sends the pick with the purchase, and drops it at full count", async () => {
    readCartChooser.mockResolvedValue(contested);
    markBoughtForDecks.mockResolvedValue({ applied: { id: "e1", receipt: { covered: [{ deckId: G, deckName: "HD - Gishath" }, { deckId: T, deckName: "HD -Thorin" }], still: [{ deckId: K, deckName: "HD - Kratos", need: 1 }] } } });
    await open();
    fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.fewer }));
    const group = await screen.findByRole("radiogroup", { name: CHOOSER });
    fireEvent.click(within(group).getAllByRole("radio")[2]);
    expect(within(group).getAllByRole("radio")[2].getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(copy.confirm.undo("HD -Thorin"), { exact: false })).toBeTruthy();
    // Back to first listed clears it; picking again restores it.
    fireEvent.click(screen.getByRole("button", { name: copy.confirm.backToDefault }));
    expect(screen.getByText(copy.confirm.cleared("HD - Gishath", "Sol Ring"))).toBeTruthy();
    // A pick clears it, so a second way back is a fresh announcement.
    fireEvent.click(within(screen.getByRole("radiogroup", { name: CHOOSER })).getAllByRole("radio")[2]);
    expect(screen.queryByText(copy.confirm.cleared("HD - Gishath", "Sol Ring"))).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: copy.confirm.backToDefault }));
    expect(screen.getByText(copy.confirm.cleared("HD - Gishath", "Sol Ring"))).toBeTruthy();
    expect(within(screen.getByRole("radiogroup", { name: CHOOSER })).getAllByRole("radio")[2].getAttribute("aria-checked")).toBe("false");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: CHOOSER })).getAllByRole("radio")[2]);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.add(2) })); });
    expect(markBoughtForDecks).toHaveBeenCalledWith(ORACLE, expect.objectContaining({ deckIds: [G, K, T], quantity: 2, pickDeckId: T }));
    await waitFor(() => expect(screen.getByText(copy.receipt.covered(["HD - Gishath", "HD -Thorin"], true), { exact: false })).toBeTruthy());
  });

  it("sends no pick when the count comes back up to the decks", async () => {
    readCartChooser.mockResolvedValue(contested);
    markBoughtForDecks.mockResolvedValue({ applied: { id: "e1", receipt: null } });
    await open();
    fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.fewer }));
    fireEvent.click(within(await screen.findByRole("radiogroup", { name: CHOOSER })).getAllByRole("radio")[2]);
    fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.more }));
    expect(screen.queryByRole("radiogroup", { name: CHOOSER })).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.add(3) })); });
    expect(markBoughtForDecks).toHaveBeenCalledWith(ORACLE, expect.objectContaining({ quantity: 3, pickDeckId: null }));
  });

  it("holds the pick while the press is in flight", async () => {
    readCartChooser.mockResolvedValue(contested);
    markBoughtForDecks.mockReturnValue(new Promise(() => {}));
    await open();
    fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.fewer }));
    const radios = () => within(screen.getByRole("radiogroup", { name: CHOOSER })).getAllByRole("radio");
    fireEvent.click(radios()[2]);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.add(2) })); });
    fireEvent.click(radios()[0]);
    expect(radios().map((o) => o.getAttribute("aria-checked"))).toEqual(["false", "false", "true"]);
    // Held, and said so: no option is operable or a tab stop while the press is in flight.
    expect(radios().every((o) => o.getAttribute("aria-disabled") === "true" && o.tabIndex === -1)).toBe(true);
    expect((screen.getByRole("button", { name: copy.confirm.backToDefault }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("drops back to the plain list when a press comes back stale", async () => {
    readCartChooser.mockResolvedValue(contested);
    markBoughtForDecks.mockResolvedValue({ stale: [], need: 2 });
    await open();
    fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.fewer }));
    fireEvent.click(within(await screen.findByRole("radiogroup", { name: CHOOSER })).getAllByRole("radio")[2]);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.add(2) })); });
    expect(markBoughtForDecks).toHaveBeenCalledWith(ORACLE, expect.objectContaining({ pickDeckId: T }));
    await waitFor(() => expect(screen.queryByRole("radiogroup", { name: CHOOSER })).toBeNull());
    expect(screen.getByText("HD -Thorin")).toBeTruthy();
  });

  it("keeps the plain list when the claimants cannot be read", async () => {
    readCartChooser.mockRejectedValue(new Error("down"));
    await open();
    fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.fewer }));
    expect(screen.queryByRole("radiogroup", { name: CHOOSER })).toBeNull();
    expect(screen.getByText("HD -Thorin")).toBeTruthy();
  });
});
