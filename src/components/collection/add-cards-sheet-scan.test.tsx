import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import type { PrintingChoice } from "../../lib/collection/catalog-read";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { AddCardsSheet } from "./add-cards-sheet";

const copy = collectionEditCopy.add;
const scan = collectionEditCopy.scan;
const SOL = { oracleId: "11111111-1111-4111-8111-111111111111", name: "Sol Ring", typeLine: "Artifact", imageUri: null };

// Sol Ring as the scanner reads a Secret Lair copy: the server scored that printing best (its own scan index row).
const SOL_MATCHED = { ...SOL, printings: [{ scryfallId: "s2", score: 0.95 }, { scryfallId: "s1", score: 0.6 }] };
const choices = vi.fn();
const search = vi.fn(async (_q: string) => [] as unknown[]);
vi.mock("../../app/collection/edit-actions", () => ({
  searchCollectionCards: (q: string) => search(q),
  loadPrintingChoices: (...a: unknown[]) => choices(...a),
  addToCollection: vi.fn(),
}));
vi.mock("../../app/decks/assignment-actions", () => ({ assignCopy: vi.fn() }));
vi.mock("../shell/pending-push", () => ({ usePendingPush: () => ({ go: vi.fn() }) }));
// The scanner is its own surface, tested on its own: here it only has to hand the sheet a card, and close.
const outcomes: unknown[] = [];
// Each mount of the scanner takes the next number, so a test can tell a redraw from a fresh start.
const mounts = { n: 0 };
vi.mock("./scan/card-scanner", () => ({
  CardScanner: function FakeScanner({ layout, onAdd, onClose, listed }: { layout: string; onAdd: (g: typeof SOL, m: "fast" | "normal") => Promise<unknown>; onClose: () => void; listed: ReadonlyMap<string, number> }) {
    const [mount] = useState(() => ++mounts.n);
    return (
    <div data-testid="fake-scanner" data-layout={layout} data-mount={mount}>
      <span data-testid="tray">{listed.get(SOL.oracleId) ?? 0}</span>
      <button type="button" onClick={() => void onAdd(SOL, "fast").then((o) => outcomes.push(o))}>fast add</button>
      <button type="button" onClick={() => onAdd(SOL, "normal")}>normal add</button>
      <button type="button" onClick={() => void onAdd(SOL_MATCHED, "fast").then((o) => outcomes.push(o))}>fast add matched</button>
      <button type="button" onClick={onClose}>close scanner</button>
    </div>
    );
  },
}));

const printing = (over: Partial<PrintingChoice> = {}): PrintingChoice => ({
  scryfallId: "s1", setCode: "c21", setName: "Commander 2021", collectorNumber: "263", releasedAt: "2021-04-23",
  imageUri: null, flavorName: null, finishes: ["nonfoil"], owned: {}, ...over,
});
const TWO = [printing(), printing({ scryfallId: "s2", setCode: "sld", setName: "Secret Lair", collectorNumber: "1512" })];

beforeEach(() => {
  outcomes.length = 0;
  choices.mockReset().mockResolvedValue(TWO);
  search.mockReset().mockResolvedValue([]);
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("AddCardsSheet holds moments and the tour off while it is open", () => {
  it("counts as over the page, since it locks no scroll (Edit copies: edit-copies-sheet.test)", async () => {
    const { overPageCount } = await import("../../lib/moments/hold");
    const add = render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} />);
    expect(overPageCount().holds).toBe(1);
    add.unmount();
    expect(overPageCount().holds).toBe(0);
  });
});

describe("AddCardsSheet: the Scan press (card-scan PR 3)", () => {
  it("draws no Scan press without the switch", () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} />);
    expect(screen.queryByRole("button", { name: scan.press })).toBeNull();
  });

  it("opens the scanner, and an Auto add lands on the list at its first printing", async () => {
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

  // Auto is optimistic (Hugh, 2026-10-16): on the list before its printings are read, then kept or taken back.
  it("lists an Auto add at once, before its printings land, and keeps it at the first printing", async () => {
    let land: (v: PrintingChoice[]) => void = () => {};
    choices.mockReturnValueOnce(new Promise<PrintingChoice[]>((r) => (land = r)));
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    await waitFor(() => expect(screen.getByTestId("tray").textContent).toBe("1"));
    await waitFor(() => expect(outcomes).toHaveLength(1));
    // Pending, it asks for nothing: the footer does not call for its printing.
    expect(screen.queryByText(copy.needsPrinting("Sol Ring"))).toBeNull();
    const out = outcomes[0] as { settled: Promise<boolean> };
    expect(out.settled).toBeInstanceOf(Promise);
    land(TWO);
    expect(await out.settled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    await waitFor(() => expect(screen.getByText(copy.summary(1, 1))).toBeTruthy());
    expect(screen.queryByText(copy.needsPrinting("Sol Ring"))).toBeNull();
  });

  // Auto skips the printing step, not the scan's match: a recognized Secret Lair copy lands as that printing, never
  // as the newest set's (the full-art basic added as an arbitrary basic, Hugh 2026-10-19).
  it("lands an Auto add at the printing the scan matched, not the first loaded", async () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add matched" }));
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(await (outcomes[0] as { settled: Promise<boolean> }).settled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    expect(await screen.findByText("SLD · #1512")).toBeTruthy();
    expect(screen.queryByText("C21 · #263")).toBeNull();
  });

  it("takes an Auto add back off the list when its printings cannot be read", async () => {
    let land: (v: PrintingChoice[]) => void = () => {};
    choices.mockReturnValueOnce(new Promise<PrintingChoice[]>((r) => (land = r)));
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    await waitFor(() => expect(screen.getByTestId("tray").textContent).toBe("1"));
    await waitFor(() => expect(outcomes).toHaveLength(1));
    land([]);
    expect(await (outcomes[0] as { settled: Promise<boolean> }).settled).toBe(false);
    await waitFor(() => expect(screen.getByTestId("tray").textContent).toBe("0"));
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    expect(screen.getByText(copy.nothingYet)).toBeTruthy();
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
    expect(save).toHaveAttribute("aria-disabled", "true");
    land(TWO);
    await waitFor(() => expect(screen.getByRole("button", { name: copy.save(2) })).not.toHaveAttribute("aria-disabled"));
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

  it("holds the search while a scanned card is still landing, so a search pick cannot drop it", async () => {
    choices.mockReturnValueOnce(new Promise<PrintingChoice[]>(() => {}));
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    await waitFor(() => expect(document.querySelector<HTMLInputElement>("input")!.disabled).toBe(true));
  });

  it("says a scanned card could not be added when its printings fail after the scanner closed", async () => {
    let land: (v: PrintingChoice[]) => void = () => {};
    choices.mockReturnValueOnce(new Promise<PrintingChoice[]>((r) => (land = r)));
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    land([]);
    expect(await screen.findByRole("alert")).toHaveTextContent(copy.printingsFailed);
  });

  it("keeps a scanned card that lands while a search pick is still loading its printings", async () => {
    const STONE = { oracleId: "22222222-2222-4222-8222-222222222222", name: "Mind Stone", imageUri: null, typeLine: "Artifact" };
    search.mockResolvedValue([STONE]);
    let landPick: (v: PrintingChoice[]) => void = () => {};
    choices.mockReturnValueOnce(new Promise<PrintingChoice[]>((r) => (landPick = r)));
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.change(document.querySelector("input")!, { target: { value: "mind" } });
    const result = await screen.findByRole("option", { name: /Mind Stone/ });
    // On the desktop the scanner stands in for the search box and the results below stay pressable.
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(result);
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    await waitFor(() => expect(screen.getByText(copy.summary(1, 1))).toBeTruthy());
    landPick([printing({ scryfallId: "m1", setCode: "wwk", collectorNumber: "133" })]);
    // Both are on the list: the pick did not write over the scanned card it never saw.
    await waitFor(() => expect(screen.getByText(copy.summary(2, 2))).toBeTruthy());
  });

  it("closes the scanner when Save starts, so the receipt is the sheet's own state", async () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    // The desktop's Save stays pressable beside its open scanner.
    fireEvent.click(await screen.findByRole("button", { name: copy.save(1) }));
    await waitFor(() => expect(screen.queryByTestId("fake-scanner")).toBeNull());
  });

  it("asks before closing while a scanned card is still on its way to the list", async () => {
    choices.mockReturnValueOnce(new Promise<PrintingChoice[]>(() => {}));
    const onClose = vi.fn();
    render(<AddCardsSheet mode="add" onClose={onClose} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    fireEvent.click(screen.getByRole("button", { name: "fast add" }));
    fireEvent.click(screen.getByRole("button", { name: "close scanner" }));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("AddCardsSheet: the scanner across the 768px line", () => {
  let wide = false;
  const listeners = new Set<() => void>();
  const original = window.matchMedia;
  beforeEach(() => {
    wide = false;
    listeners.clear();
    window.matchMedia = ((query: string) => ({
      get matches() {
        return wide;
      },
      media: query, onchange: null, dispatchEvent: () => false, addListener: () => {}, removeListener: () => {},
      addEventListener: (_: string, l: () => void) => listeners.add(l),
      removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = original;
  });
  const turn = (to: boolean) =>
    act(() => {
      wide = to;
      listeners.forEach((l) => l());
    });

  it("keeps the one scanner it opened when a phone turns wide and back", () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    const first = screen.getByTestId("fake-scanner").dataset.mount;
    expect(screen.getByTestId("fake-scanner").dataset.layout).toBe("phone");
    turn(true);
    expect(screen.getByTestId("fake-scanner").dataset.layout).toBe("desk");
    turn(false);
    expect(screen.getByTestId("fake-scanner").dataset.layout).toBe("phone");
    expect(screen.getByTestId("fake-scanner").dataset.mount).toBe(first);
  });

  it("holds the sheet inert under the phone's scanner, and not beside the desktop's", () => {
    render(<AddCardsSheet mode="add" onClose={vi.fn()} totalCards={10} scan />);
    fireEvent.click(screen.getByRole("button", { name: scan.press }));
    const scanner = screen.getByTestId("fake-scanner");
    expect(scanner.closest("[inert]")).toBeNull();
    expect(screen.getByRole("button", { name: copy.closeAria }).closest("[inert]")).not.toBeNull();
    turn(true);
    expect(scanner.closest("[inert]")).toBeNull();
    expect(screen.getByRole("button", { name: copy.closeAria }).closest("[inert]")).toBeNull();
  });
});
