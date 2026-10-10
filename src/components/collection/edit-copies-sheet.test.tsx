import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { CardHolding, PrintingChoice } from "../../lib/collection/catalog-read";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { AddCardsSheet } from "./add-cards-sheet";

const c = collectionEditCopy.copies;
const r = collectionEditCopy.remove;
const OID = "11111111-1111-4111-8111-111111111111";
const card = { oracleId: OID, name: "Sol Ring", imageUri: null };

const load = vi.fn();
const edit = vi.fn();
vi.mock("../../app/collection/edit-actions", () => ({
  loadEditSheet: (...a: unknown[]) => load(...a),
  editCollection: (...a: unknown[]) => edit(...a),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a"> & { href: string }) => <a href={href} {...rest}>{children}</a>,
  useLinkStatus: () => ({ pending: false }),
}));

const printing = (setCode: string, n: string, over: Partial<PrintingChoice> = {}): PrintingChoice => ({
  scryfallId: `${setCode}-${n}`, setCode, setName: setCode.toUpperCase(), collectorNumber: n, releasedAt: null,
  imageUri: null, flavorName: null, finishes: ["nonfoil", "foil"], owned: {}, ...over,
});
const CHOICES = [printing("c21", "263"), printing("sld", "1512"), printing("cmm", "410"), printing("cmr", "472")];
const held = (setCode: string, n: string, quantity: number, finish: CardHolding["finish"] = "nonfoil"): CardHolding => ({
  setCode, collectorNumber: n, finish, quantity, condition: null,
});
const HELD = [held("c21", "263", 3), held("sld", "1512", 1, "foil"), held("cmm", "410", 1)];
const deck = (id: string, name: string) => ({ deckId: id, deckName: name, oracleId: OID, cardName: "Sol Ring", short: 1 });

async function mount(holdings: CardHolding[] = HELD) {
  load.mockResolvedValue({ choices: CHOICES, holdings });
  const onClose = vi.fn();
  render(<AddCardsSheet mode="edit" card={card} onClose={onClose} />);
  await screen.findByText(/Add another printing/);
  return { onClose };
}
const save = () => screen.getByRole("button", { name: /^(Save|Remove \d+ cop(y|ies)|Checking decks…|Saving…|Try again)$/ });
// Find first, then act: a findBy inside act() never resolves.
async function press(b: HTMLElement) {
  await act(async () => fireEvent.click(b));
}
const fewer = (i: number) => screen.getAllByRole("button", { name: collectionEditCopy.add.fewer })[i];

beforeEach(() => {
  load.mockReset();
  edit.mockReset();
});
afterEach(cleanup);

describe("Edit copies, at rest", () => {
  it("draws one line per holding, names the card and its totals, and cannot save with no change", async () => {
    await mount();
    expect(screen.getByText(c.sheetSub("Sol Ring", 5, 3))).toBeTruthy();
    expect(screen.getAllByRole("listitem").length).toBe(3);
    expect((save() as HTMLButtonElement).disabled).toBe(true);
  });

  it("opens a card the player does not own on the required printing step, titled Add to collection", async () => {
    load.mockResolvedValue({ choices: CHOICES, holdings: [] });
    render(<AddCardsSheet mode="edit" card={card} onClose={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: c.addToCollection })).toBeTruthy();
    expect(screen.getByText(c.sheetSubNone("Sol Ring"))).toBeTruthy();
    expect(screen.getByText(c.newPrintingFirst)).toBeTruthy();
    expect((screen.getByRole("button", { name: r.action }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("says so when the holdings cannot be read, and reads again on Try again", async () => {
    load.mockRejectedValueOnce(new Error("x"));
    render(<AddCardsSheet mode="edit" card={card} onClose={vi.fn()} />);
    expect(await screen.findByText(c.loadFailed)).toBeTruthy();
    load.mockResolvedValue({ choices: CHOICES, holdings: HELD });
    await press(screen.getByRole("button", { name: c.retry }));
    expect(await screen.findByText(/Add another printing/)).toBeTruthy();
  });
});

describe("Edit copies, saving", () => {
  it("lowers a line, shows the diff beside Save, and writes ONE edit carrying the count the sheet showed", async () => {
    const { onClose } = await mount();
    fireEvent.click(fewer(0));
    // The line's note and the diff beside Save both read −1.
    expect(screen.getAllByText("−1")).toHaveLength(2);
    edit.mockResolvedValue({ applied: { id: "entry-1" } });
    await press(save());
    expect(edit).toHaveBeenCalledTimes(1);
    expect(edit.mock.calls[0][0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(edit.mock.calls[0][1]).toEqual([
      { oracleId: OID, setCode: "c21", collectorNumber: "263", finish: "nonfoil", quantity: 2, expected: 3 },
    ]);
    expect(onClose).toHaveBeenCalledWith({ saved: { entryId: "entry-1", removed: false, total: 4, copiesRemoved: 5 } });
  });

  it("reads Checking decks while a lowering is being checked, and Saving while a raise is written", async () => {
    await mount();
    let done!: (v: unknown) => void;
    edit.mockReturnValue(new Promise((res) => { done = res; }));
    fireEvent.click(fewer(0));
    await press(save());
    expect(screen.getByRole("button", { name: collectionEditCopy.shortWarning.checking })).toBeTruthy();
    await act(async () => done({ applied: { id: "e" } }));
  });

  it("asks before leaving staged changes behind, and Keep editing returns to them", async () => {
    const { onClose } = await mount();
    fireEvent.click(fewer(0));
    fireEvent.click(screen.getByRole("button", { name: collectionEditCopy.add.closeAria }));
    expect(screen.getByText(c.discardTitle)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: c.keep }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: collectionEditCopy.add.closeAria }));
    fireEvent.click(screen.getByRole("button", { name: c.discard }));
    expect(onClose).toHaveBeenCalledWith({ saved: null });
  });

  it("closes at once when nothing is staged", async () => {
    const { onClose } = await mount();
    fireEvent.click(screen.getByRole("button", { name: collectionEditCopy.add.closeAria }));
    expect(onClose).toHaveBeenCalledWith({ saved: null });
  });

  it("keeps the staged lines and says nothing was saved when the write fails, then retries under the same id", async () => {
    await mount();
    fireEvent.click(fewer(0));
    edit.mockRejectedValueOnce(new Error("offline"));
    await press(save());
    expect((await screen.findByRole("alert")).textContent).toBe(c.failed);
    edit.mockResolvedValue({ applied: { id: "e" } });
    await press(screen.getByRole("button", { name: c.retry }));
    expect(edit.mock.calls[1][0]).toBe(edit.mock.calls[0][0]);
  });

  it("reads the card again, saying so, when the collection moved while the sheet was open", async () => {
    await mount();
    fireEvent.click(fewer(0));
    edit.mockResolvedValue({ stale: [{ oracleId: OID, setCode: "c21", collectorNumber: "263", finish: "nonfoil", quantity: 9 }] });
    load.mockResolvedValue({ choices: CHOICES, holdings: [held("c21", "263", 9)] });
    await press(save());
    expect(await screen.findByText(c.stale)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(c.sheetSub("Sol Ring", 9, 1))).toBeTruthy());
  });
});

describe("Edit copies, a printing fixed by re-picking", () => {
  it("is one save: the old holding to zero and the new one up, and says 1 printing changed", async () => {
    const { onClose } = await mount();
    const chips = screen.getAllByRole("button", { name: /printing .* Change it/ });
    fireEvent.click(chips[1]); // the foil SLD line
    expect(await screen.findByText(c.fixIntro(CHOICES.length))).toBeTruthy();
    fireEvent.click(await screen.findByRole("radio", { name: /CMR/i }));
    expect(screen.getByText(c.printingChanged(1))).toBeTruthy();
    expect(screen.getByText(`${c.was("SLD · #1512")} · ${c.goesWith(1)}`)).toBeTruthy();
    edit.mockResolvedValue({ applied: { id: "e" } });
    await press(save());
    expect(edit).toHaveBeenCalledTimes(1);
    expect(edit.mock.calls[0][1]).toHaveLength(2);
    expect(onClose).toHaveBeenCalled();
  });
});

describe("Edit copies, another printing", () => {
  it("opens the required step with the held printings left out and blocks Save until one is chosen", async () => {
    await mount();
    fireEvent.click(screen.getByText(/Add another printing/));
    expect(screen.getByText(c.newPrinting)).toBeTruthy();
    expect(screen.getByText(c.newPrintingFirst)).toBeTruthy();
    expect((save() as HTMLButtonElement).disabled).toBe(true);
    const tiles = await screen.findAllByRole("radio");
    expect(tiles).toHaveLength(1); // only CMR is not held
  });
});

describe("Edit copies, removal", () => {
  it("stages every holding at zero, reads Remove N copies and not the accent, and Keep them unstages it", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: r.action }));
    expect(screen.getByText(r.leaves("Sol Ring"))).toBeTruthy();
    const b = save();
    expect(b.textContent).toBe(r.confirm(5));
    expect(b.className).toContain("elevated");
    fireEvent.click(screen.getByRole("button", { name: r.keep }));
    expect(save().textContent).toBe(c.save);
  });

  it("says it is the last copy when the lines are taken off one by one, and saves it as a removal", async () => {
    const { onClose } = await mount([held("c21", "263", 1)]);
    fireEvent.click(screen.getByRole("button", { name: collectionEditCopy.add.removeLineAria("Sol Ring") }));
    expect(screen.getByText(c.lastCopy("Sol Ring"))).toBeTruthy();
    edit.mockResolvedValue({ applied: { id: "e" } });
    await press(save());
    expect(onClose).toHaveBeenCalledWith({ saved: { entryId: "e", removed: true, total: 0, copiesRemoved: 1 } });
  });

  it("runs the deck check first: a removal that leaves decks short asks, and Remove anyway resends the SAME id with those decks", async () => {
    const { onClose } = await mount();
    fireEvent.click(screen.getByRole("button", { name: r.action }));
    const decks = [deck("d1", "HD - Kinnan"), deck("d2", "Atraxa Counters")];
    edit.mockResolvedValueOnce({ wouldShort: decks });
    await press(save());
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(collectionEditCopy.shortWarning.titleRemove("Sol Ring", 2))).toBeTruthy();
    expect(within(dialog).getByText("HD - Kinnan")).toBeTruthy();
    edit.mockResolvedValueOnce({ applied: { id: "e" } });
    await press(within(dialog).getByRole("button", { name: collectionEditCopy.shortWarning.confirmRemove }));
    expect(edit.mock.calls[1][0]).toBe(edit.mock.calls[0][0]);
    expect(edit.mock.calls[1][2]).toEqual(decks);
    expect(onClose).toHaveBeenCalled();
  });
});

describe("Edit copies, the deck warning on a lowering", () => {
  it("titles a save, keeps every staged line when cancelled, and redraws saying so when the answer changed", async () => {
    await mount();
    fireEvent.click(fewer(0));
    edit.mockResolvedValueOnce({ wouldShort: [deck("d1", "HD - Kinnan")] });
    await press(save());
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(collectionEditCopy.shortWarning.titleSave(1))).toBeTruthy();
    // Confirming comes back with another deck: the same dialog, redrawn, with a notice and a new tag.
    edit.mockResolvedValueOnce({ wouldShort: [deck("d1", "HD - Kinnan"), deck("d2", "Meren Value")] });
    await press(within(dialog).getByRole("button", { name: collectionEditCopy.shortWarning.confirmSave }));
    const again = await screen.findByRole("alertdialog");
    expect(within(again).getByText(collectionEditCopy.shortWarning.changed)).toBeTruthy();
    expect(within(again).getByText(collectionEditCopy.shortWarning.newTag)).toBeTruthy();
    await press(within(again).getByRole("button", { name: collectionEditCopy.shortWarning.cancel }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getAllByText("−1")).toHaveLength(2);
  });
});
