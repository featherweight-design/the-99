import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { PrintingChoice } from "../../lib/collection/catalog-read";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { AddCardsSheet } from "./add-cards-sheet";

const copy = collectionEditCopy.add;
const scan = collectionEditCopy.scan;
const SOL = { oracleId: "11111111-1111-4111-8111-111111111111", name: "Sol Ring", typeLine: "Artifact", imageUri: null };
const STONE = { oracleId: "22222222-2222-4222-8222-222222222222", name: "Mind Stone", imageUri: null };
const CAPTURE = {
  photo: "data:image/jpeg;base64,scan",
  guesses: [{ oracleId: SOL.oracleId, name: SOL.name, imageUri: null }, STONE],
};

const choices = vi.fn();
const search = vi.fn(async (_q: string) => [] as unknown[]);
const save = vi.fn(async (..._a: unknown[]) => ({ applied: { id: "e1" } }) as unknown);
vi.mock("../../app/collection/edit-actions", () => ({
  searchCollectionCards: (q: string) => search(q),
  loadPrintingChoices: (...a: unknown[]) => choices(...a),
  addToCollection: (...a: unknown[]) => save(...a),
}));
vi.mock("../../app/decks/assignment-actions", () => ({ assignCopy: vi.fn() }));
vi.mock("../shell/pending-push", () => ({ usePendingPush: () => ({ go: vi.fn() }) }));
// The scanner is its own surface: here it hands the sheet a scanned card with what the scan saw, and its ways out.
vi.mock("./scan/card-scanner", () => ({
  CardScanner: (p: {
    onAdd: (g: typeof SOL, m: "fast" | "normal", s: typeof CAPTURE) => Promise<boolean>;
    onClose: () => void;
    onNoneOfThese: () => void;
  }) => (
    <div data-testid="fake-scanner">
      <button type="button" onClick={() => p.onAdd(SOL, "fast", CAPTURE)}>fast add</button>
      <button type="button" onClick={() => p.onAdd(SOL, "normal", CAPTURE)}>normal add</button>
      <button type="button" onClick={() => p.onAdd(SOL, "fast", { ...CAPTURE, guesses: [...CAPTURE.guesses, { oracleId: "33333333-3333-4333-8333-333333333333", name: "Arcane Signet", imageUri: null }] })}>three add</button>
      <button type="button" onClick={p.onNoneOfThese}>none of these</button>
      <button type="button" onClick={p.onClose}>close scanner</button>
    </div>
  ),
}));

const printing = (over: Partial<PrintingChoice> = {}): PrintingChoice => ({
  scryfallId: "s1", setCode: "c21", setName: "Commander 2021", collectorNumber: "263", releasedAt: "2021-04-23",
  imageUri: null, flavorName: null, finishes: ["nonfoil"], owned: {}, ...over,
});
const TWO = [printing(), printing({ scryfallId: "s2", setCode: "sld", setName: "Secret Lair", collectorNumber: "1512" })];

beforeEach(() => {
  choices.mockReset().mockResolvedValue(TWO);
  search.mockReset().mockResolvedValue([]);
});
afterEach(() => {
  document.body.innerHTML = "";
});

async function scanned(press = "fast add") {
  render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
  fireEvent.click(screen.getByRole("button", { name: scan.press }));
  fireEvent.click(screen.getByRole("button", { name: press }));
  await waitFor(() => expect(choices).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
}

describe("AddCardsSheet: the scan review (card-scan PR 4)", () => {
  it("makes a scanned line's name a press that opens its fix: the photo and the closest cards, its own ticked first", async () => {
    await scanned();
    const name = await screen.findByRole("button", { name: "Sol Ring", expanded: false });
    fireEvent.click(name);
    expect(name.getAttribute("aria-expanded")).toBe("true");
    const region = screen.getByRole("group", { name: scan.fix.regionLabel });
    expect(within(region).getByRole("img", { name: scan.fix.yourScan }).getAttribute("src")).toBe(CAPTURE.photo);
    const tiles = within(region).getAllByRole("radio");
    expect(tiles.map((t) => t.getAttribute("aria-checked"))).toEqual(["true", "false"]);
    expect(within(tiles[0]).getByText(scan.fix.onList)).toBeTruthy();
    expect(within(region).getByRole("button", { name: scan.fix.search })).toBeTruthy();
  });

  it("swaps the line to another of the closest cards at its first printing", async () => {
    await scanned();
    fireEvent.click(await screen.findByRole("button", { name: "Sol Ring", expanded: false }));
    const stoneFirst = printing({ scryfallId: "m1", setCode: "wwk", collectorNumber: "133" });
    choices.mockResolvedValueOnce([stoneFirst, printing({ scryfallId: "m2", setCode: "c13" })]);
    fireEvent.click(screen.getByRole("radio", { name: /Mind Stone/ }));
    await waitFor(() => expect(choices).toHaveBeenLastCalledWith(STONE.oracleId));
    await waitFor(() => expect(screen.getByRole("radio", { name: /Mind Stone/ }).getAttribute("aria-checked")).toBe("true"));
    expect(screen.getByRole("button", { name: copy.printingChipAria("Mind Stone", "WWK · #133") })).toBeTruthy();
  });

  it("sets the scanned line aside and opens the search by name when none of them match", async () => {
    await scanned();
    fireEvent.click(await screen.findByRole("button", { name: "Sol Ring", expanded: false }));
    fireEvent.click(screen.getByRole("button", { name: scan.fix.search }));
    expect(screen.queryByRole("button", { name: "Sol Ring" })).toBeNull();
    expect(screen.getByText(copy.nothingYet)).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(document.querySelector("input")));
  });

  it("gives a search pick no name press", async () => {
    search.mockResolvedValue([{ oracleId: SOL.oracleId, name: SOL.name, imageUri: null, typeLine: "Artifact" }]);
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.change(document.querySelector("input")!, { target: { value: "sol" } });
    fireEvent.click(await screen.findByRole("option", { name: /Sol Ring/ }));
    fireEvent.click((await screen.findAllByRole("radio"))[0]);
    await waitFor(() => expect(screen.getByText(copy.summary(1, 1))).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Sol Ring" })).toBeNull();
  });

  it("closes the scanner onto the search by name on None of these, adding nothing", async () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "none of these" }));
    expect(screen.queryByTestId("fake-scanner")).toBeNull();
    expect(screen.getByText(copy.nothingYet)).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(document.querySelector("input")));
  });

  it("folds the scanned lines still waiting in Normal mode with their printing still to choose (L3)", async () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "normal add" }));
    fireEvent.click(screen.getByRole("button", { name: "normal add" }));
    await waitFor(() => expect(choices).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    await waitFor(() => expect(screen.getByText(copy.needsPrinting("Sol Ring"))).toBeTruthy());
    // One line asks; the other waits folded, saying its printing is still to choose.
    expect(screen.getAllByText(copy.choosePrinting).length).toBeGreaterThanOrEqual(2);
  });

  it("holds Save while a swap waits for its card's printings", async () => {
    await scanned();
    fireEvent.click(await screen.findByRole("button", { name: "Sol Ring", expanded: false }));
    let land: (v: PrintingChoice[]) => void = () => {};
    choices.mockReturnValueOnce(new Promise<PrintingChoice[]>((r) => (land = r)));
    fireEvent.click(screen.getByRole("radio", { name: /Mind Stone/ }));
    expect((screen.getByRole("button", { name: copy.save(1) }) as HTMLButtonElement).disabled).toBe(true);
    land([printing({ scryfallId: "m1", setCode: "wwk", collectorNumber: "133" })]);
    await waitFor(() => expect((screen.getByRole("button", { name: copy.save(1) }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("closes the fix with its line when a printing folds that line into another", async () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    fireEvent.click(screen.getByRole("button", { name: "normal add" }));
    await waitFor(() => expect(choices).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    // The Normal line asks for its printing: Secret Lair. The Fast line holds Commander 2021.
    fireEvent.click((await screen.findAllByRole("radio"))[1]);
    await waitFor(() => expect(screen.getAllByRole("button", { name: copy.removeLineAria("Sol Ring") })).toHaveLength(2));
    // Open the Fast line's fix, then move that line to Secret Lair: it folds into the other.
    const names = screen.getAllByRole("button", { name: "Sol Ring", expanded: false });
    fireEvent.click(names[names.length - 1]);
    const chip = screen.getByRole("button", { name: copy.printingChipAria("Sol Ring", "C21 · #263") });
    fireEvent.click(chip);
    fireEvent.click(screen.getAllByRole("radio").find((r) => /Secret Lair/.test(r.textContent ?? ""))!);
    // One line of two, drawn whole: no fix is left holding the list folded.
    await waitFor(() => expect(screen.getAllByRole("button", { name: copy.removeLineAria("Sol Ring") })).toHaveLength(1));
    expect(screen.queryByRole("group", { name: scan.fix.regionLabel })).toBeNull();
  });

  it("closes an open fix when a search pick starts, and does not bring it back after", async () => {
    search.mockResolvedValue([{ oracleId: STONE.oracleId, name: STONE.name, imageUri: null, typeLine: "Artifact" }]);
    await scanned();
    fireEvent.click(await screen.findByRole("button", { name: "Sol Ring", expanded: false }));
    fireEvent.change(document.querySelector("input")!, { target: { value: "mind" } });
    fireEvent.click(await screen.findByRole("option", { name: /Mind Stone/ }));
    fireEvent.click((await screen.findAllByRole("radio"))[0]);
    await waitFor(() => expect(screen.getByText(copy.summary(2, 2))).toBeTruthy());
    expect(screen.queryByRole("group", { name: scan.fix.regionLabel })).toBeNull();
  });

  it("moves through the closest cards with the arrow keys, ticked tile the only tab stop", async () => {
    await scanned();
    fireEvent.click(await screen.findByRole("button", { name: "Sol Ring", expanded: false }));
    const tiles = screen.getAllByRole("radio");
    expect(tiles.map((t) => t.tabIndex)).toEqual([0, -1]);
    tiles[0].focus();
    choices.mockResolvedValueOnce([printing({ scryfallId: "m1", setCode: "wwk", collectorNumber: "133" })]);
    fireEvent.keyDown(tiles[0], { key: "ArrowRight" });
    await waitFor(() => expect(choices).toHaveBeenLastCalledWith(STONE.oracleId));
    // Mind Stone is now on the line, ticked where it stood, and has focus.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("radio", { name: /Mind Stone/ })));
    expect(screen.getByRole("radio", { name: /Mind Stone/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("walks all three closest cards with the arrows, the tiles holding still as the tick moves", async () => {
    const SIGNET = { oracleId: "33333333-3333-4333-8333-333333333333", name: "Arcane Signet", imageUri: null };
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "three add" }));
    await waitFor(() => expect(choices).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sol Ring", expanded: false }));
    const names = () => screen.getAllByRole("radio").map((t) => t.textContent?.replace(scan.fix.onList, "").replace("✓", "").trim());
    const order = names();
    screen.getAllByRole("radio")[0].focus();
    for (const card of [STONE, SIGNET]) {
      fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
      await waitFor(() => expect(screen.getByRole("radio", { name: new RegExp(card.name) }).getAttribute("aria-checked")).toBe("true"));
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("radio", { name: new RegExp(card.name) })));
    }
    expect(names()).toEqual(order);
  });

  it("gives focus back to the line's name when Escape closes the fix from inside it", async () => {
    await scanned();
    const name = await screen.findByRole("button", { name: "Sol Ring", expanded: false });
    fireEvent.click(name);
    const tile = screen.getAllByRole("radio")[0];
    tile.focus();
    fireEvent.keyDown(tile, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("group", { name: scan.fix.regionLabel })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sol Ring", expanded: false })));
  });

  it("gives focus to the line a swap folded the fixed line into", async () => {
    const stone = printing({ scryfallId: "m1", setCode: "wwk", collectorNumber: "133" });
    search.mockResolvedValue([{ oracleId: STONE.oracleId, name: STONE.name, imageUri: null, typeLine: "Artifact" }]);
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    // Mind Stone, by search, at WWK.
    fireEvent.change(document.querySelector("input")!, { target: { value: "mind" } });
    choices.mockResolvedValueOnce([stone]);
    fireEvent.click(await screen.findByRole("option", { name: /Mind Stone/ }));
    await waitFor(() => expect(screen.getByText(copy.summary(1, 1))).toBeTruthy());
    // Sol Ring by scan, then swapped to Mind Stone at that same printing: the two lines fold into one.
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    await waitFor(() => expect(screen.getByText(copy.summary(2, 2))).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sol Ring", expanded: false }));
    choices.mockResolvedValueOnce([stone]);
    const tile = screen.getByRole("radio", { name: /Mind Stone/ });
    tile.focus();
    fireEvent.click(tile);
    await waitFor(() => expect(screen.getByText(copy.summary(1, 2))).toBeTruthy());
    await waitFor(() => expect(document.activeElement?.closest("[data-line-id]")).toBeTruthy());
  });

  it("keeps the fix open on Escape while a swap waits for its printings, then focus stays with it", async () => {
    await scanned();
    fireEvent.click(await screen.findByRole("button", { name: "Sol Ring", expanded: false }));
    let land: (v: PrintingChoice[]) => void = () => {};
    choices.mockReturnValueOnce(new Promise<PrintingChoice[]>((r) => (land = r)));
    const tile = screen.getByRole("radio", { name: /Mind Stone/ });
    tile.focus();
    fireEvent.click(tile);
    fireEvent.keyDown(tile, { key: "Escape" });
    expect(screen.getByRole("group", { name: scan.fix.regionLabel })).toBeTruthy();
    land([printing({ scryfallId: "m1", setCode: "wwk", collectorNumber: "133" })]);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("radio", { name: /Mind Stone/ })));
  });

  it("closes the sheet from the receipt even when Save was pressed with a fix open", async () => {
    const onClose = vi.fn();
    render(<AddCardsSheet mode="add" onClose={onClose} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    await waitFor(() => expect(choices).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sol Ring", expanded: false }));
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    await screen.findByText(copy.savedTitle(1));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

