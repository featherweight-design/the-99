import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PrintingChoice } from "../../lib/collection/catalog-read";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { AddCardsSheet } from "./add-cards-sheet";

const copy = collectionEditCopy.add;
const scan = collectionEditCopy.scan;
const SOL = { oracleId: "11111111-1111-4111-8111-111111111111", name: "Sol Ring", typeLine: "Artifact", imageUri: null };

const choices = vi.fn();
vi.mock("../../app/collection/edit-actions", () => ({
  searchCollectionCards: vi.fn(async () => []),
  loadPrintingChoices: (...a: unknown[]) => choices(...a),
  addToCollection: vi.fn(),
}));
vi.mock("../../app/decks/assignment-actions", () => ({ assignCopy: vi.fn() }));
vi.mock("../shell/pending-push", () => ({ usePendingPush: () => ({ go: vi.fn() }) }));
// The scanner is its own surface, tested on its own: here it only has to hand the sheet a card, and close.
vi.mock("./scan/card-scanner", () => ({
  CardScanner: ({ layout, onAdd, onClose }: { layout: string; onAdd: (g: typeof SOL, m: "fast" | "normal") => Promise<boolean>; onClose: () => void }) => (
    <div data-testid="fake-scanner" data-layout={layout}>
      <button type="button" onClick={() => onAdd(SOL, "fast")}>fast add</button>
      <button type="button" onClick={() => onAdd(SOL, "normal")}>normal add</button>
      <button type="button" onClick={onClose}>close scanner</button>
    </div>
  ),
}));

const printing = (over: Partial<PrintingChoice> = {}): PrintingChoice => ({
  scryfallId: "s1", setCode: "c21", setName: "Commander 2021", collectorNumber: "263", releasedAt: "2021-04-23",
  imageUri: null, flavorName: null, finishes: ["nonfoil"], owned: {}, ...over,
});
const TWO = [printing(), printing({ scryfallId: "s2", setCode: "sld", setName: "Secret Lair", collectorNumber: "1512" })];

beforeEach(() => choices.mockReset().mockResolvedValue(TWO));
afterEach(() => {
  document.body.innerHTML = "";
});

describe("AddCardsSheet: the Scan press (card-scan PR 3)", () => {
  it("draws no Scan press without the switch", () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} />);
    expect(screen.queryByRole("button", { name: scan.press })).toBeNull();
  });

  it("opens the scanner, and a Fast add lands on the list at its first printing", async () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    expect(screen.getByTestId("fake-scanner")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    await waitFor(() => expect(choices).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    // Two adds of one card at one printing fold into one line of two copies, and nothing asks for a printing.
    await waitFor(() => expect(screen.getByText(copy.summary(1, 2))).toBeTruthy());
  });

  it("leaves a Normal add's printing to the sheet's own step once the scanner closes", async () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "normal add" }));
    await waitFor(() => expect(choices).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    await waitFor(() => expect(screen.getByText(copy.needsPrinting("Sol Ring"))).toBeTruthy());
  });

  it("asks for a Normal add's printing only once it has landed, even when Review came first", async () => {
    let land: (v: PrintingChoice[]) => void = () => {};
    choices.mockReturnValueOnce(new Promise<PrintingChoice[]>((r) => (land = r)));
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "normal add" }));
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    expect(screen.queryByText(copy.needsPrinting("Sol Ring"))).toBeNull();
    land(TWO);
    await waitFor(() => expect(screen.getByText(copy.needsPrinting("Sol Ring"))).toBeTruthy());
    expect(screen.getByText("Secret Lair", { exact: false })).toBeTruthy();
  });

  it("puts nothing on the list when a scanned card's printings could not be read", async () => {
    choices.mockResolvedValueOnce([]);
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    await waitFor(() => expect(choices).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    expect(screen.getByText(copy.nothingYet)).toBeTruthy();
  });

  it("closes the scanner, not the sheet, on Escape", () => {
    const onClose = vi.fn();
    render(<AddCardsSheet mode="add" onClose={onClose} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByTestId("fake-scanner")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("returns focus to the search when Escape closes the scanner", async () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    const search = document.querySelector<HTMLInputElement>("input")!;
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    // Focus is inside the scanner, as it is once the scanner opens; Escape unmounts what holds it.
    const inside = screen.getByRole("button", { name: "close scanner" });
    inside.focus();
    expect(document.activeElement).toBe(inside);
    fireEvent.keyDown(inside, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(search));
  });

  it("holds Save while a scanned card's printings are still loading, so the save cannot leave it out", async () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    await waitFor(() => expect(choices).toHaveBeenCalledTimes(1));
    let land: (v: PrintingChoice[]) => void = () => {};
    choices.mockReturnValueOnce(new Promise<PrintingChoice[]>((r) => (land = r)));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    const save = await screen.findByRole("button", { name: copy.save(1) });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    land(TWO);
    await waitFor(() => expect((screen.getByRole("button", { name: copy.save(2) }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("clears the search when a scanned card lands, so its results never cover the printing step", async () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    const search = document.querySelector<HTMLInputElement>("input")!;
    fireEvent.change(search, { target: { value: "sol" } });
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "normal add" }));
    await waitFor(() => expect(choices).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    await waitFor(() => expect(screen.getByText(copy.needsPrinting("Sol Ring"))).toBeTruthy());
    expect(document.querySelector<HTMLInputElement>("input")!.value).toBe("");
  });
});
