import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { PrintingChoice, CatalogCardResult } from "../../lib/collection/catalog-read";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { AddCardsSheet, type AddCardsSheetProps } from "./add-cards-sheet";
import { addedCopyCopy } from "../../lib/copy/added-copy";
import type { ContestedCard } from "../../lib/collection/summary-read";

const copy = collectionEditCopy.add;
const OID = "11111111-1111-4111-8111-111111111111";
const OID2 = "22222222-2222-4222-8222-222222222222";

const search = vi.fn();
const choices = vi.fn();
const add = vi.fn();
vi.mock("../../app/collection/edit-actions", () => ({
  searchCollectionCards: (...a: unknown[]) => search(...a),
  loadPrintingChoices: (...a: unknown[]) => choices(...a),
  addToCollection: (...a: unknown[]) => add(...a),
}));
vi.mock("../../app/decks/assignment-actions", () => ({ assignCopy: vi.fn() }));
vi.mock("next/link", () => ({
  // A press runs `onNavigate` as the real Link does on a client navigation, and goes nowhere.
  default: ({ href, children, onNavigate, ...rest }: React.ComponentProps<"a"> & { href: string; onNavigate?: () => void }) => (
    <a href={href} onClick={(e) => { e.preventDefault(); onNavigate?.(); }} {...rest}>{children}</a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

const card = (over: Partial<CatalogCardResult> = {}): CatalogCardResult => ({
  oracleId: OID, name: "Sol Ring", typeLine: "Artifact", imageUri: null, manaCost: "{1}", flavorName: null, owned: 5, ...over,
});
const printing = (over: Partial<PrintingChoice> = {}): PrintingChoice => ({
  scryfallId: "s1", setCode: "c21", setName: "Commander 2021", collectorNumber: "263", releasedAt: "2021-04-23",
  imageUri: null, flavorName: null, finishes: ["nonfoil", "foil"], owned: { nonfoil: 3 }, ...over,
});
const THREE = [printing(), printing({ scryfallId: "s2", setCode: "sld", setName: "Secret Lair", collectorNumber: "1512", owned: {} }), printing({ scryfallId: "s3", setCode: "cmm", setName: "Commander Masters", collectorNumber: "410", owned: {} })];

function mount(over: Partial<Extract<AddCardsSheetProps, { mode: "add" }>> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(<AddCardsSheet mode="add" onClose={onClose} onSaved={onSaved} totalCards={4492} {...over} />);
  return { onClose, onSaved };
}
const field = () => screen.getByRole("combobox", { name: copy.searchAria });

async function find(q: string, results: CatalogCardResult[]) {
  search.mockResolvedValueOnce(results);
  fireEvent.change(field(), { target: { value: q } });
  await screen.findAllByRole("option");
}
async function pickFirst(printingsFor: PrintingChoice[] = THREE) {
  choices.mockResolvedValueOnce(printingsFor);
  fireEvent.keyDown(field(), { key: "Enter" });
  await waitFor(() => expect(choices).toHaveBeenCalled());
}

beforeEach(() => {
  search.mockReset().mockResolvedValue([]);
  choices.mockReset();
  add.mockReset();
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("AddCardsSheet (add)", () => {
  it("opens as a modal dialog with focus in the search, and holds the page inert", () => {
    const page = document.createElement("div");
    document.body.appendChild(page);
    mount();
    const dialog = screen.getByRole("dialog", { name: copy.title });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(field()).toHaveFocus();
    expect(page.hasAttribute("inert")).toBe(true);
    expect(dialog.closest("[inert]")).toBeNull();
    expect(screen.getByRole("button", { name: copy.save(0) })).toBeDisabled();
  });

  it("searches the whole catalog and shows no-results", async () => {
    mount();
    await find("sol r", [card()]);
    expect(search).toHaveBeenCalledWith("sol r");
    expect(screen.getByRole("option")).toHaveTextContent("you own ×5");
    search.mockResolvedValueOnce([]);
    fireEvent.change(field(), { target: { value: "glimmerlite" } });
    expect(await screen.findByText(copy.noResultsTitle("glimmerlite"))).toBeInTheDocument();
  });

  it("makes the printing a required step: nothing selected, search and Save disabled", async () => {
    mount();
    await find("sol ring", [card()]);
    await pickFirst();
    const radios = await screen.findAllByRole("radio");
    expect(radios).toHaveLength(3);
    for (const r of radios) expect(r).toHaveAttribute("aria-checked", "false");
    expect(field()).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Save/ })).toBeDisabled();
    expect(screen.getByText(copy.needsPrinting("Sol Ring"))).toBeInTheDocument();
  });

  it("completes the line at nonfoil x1 on a tile and gives focus back to the search", async () => {
    mount();
    await find("sol ring", [card()]);
    await pickFirst();
    fireEvent.click((await screen.findAllByRole("radio"))[1]);
    await waitFor(() => expect(field()).toHaveFocus());
    expect(screen.getByText("SLD · #1512")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Foil" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: copy.save(1) })).toBeEnabled();
    expect(screen.getByText(copy.summary(1, 1))).toBeInTheDocument();
  });

  it("defaults a foil-only printing to foil, and skips the step for a single printing", async () => {
    mount();
    await find("sol ring", [card()]);
    await pickFirst([printing({ finishes: ["foil"], owned: {} })]);
    expect(await screen.findByRole("button", { name: "Foil" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Foil" })).toBeDisabled();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(field()).not.toBeDisabled();
  });

  // One rule for a search field that picks from a list (DECK INPUT UX): after a pick, focus is back in
  // the field for the next search, here as after a printing is chosen.
  it("gives focus back to the search after a single-printing pick by pointer", async () => {
    mount();
    await find("sol ring", [card()]);
    choices.mockResolvedValueOnce([printing({ finishes: ["foil"], owned: {} })]);
    // A press on a result row takes focus off the field in a browser (jsdom moves none on a click).
    field().blur();
    fireEvent.click(screen.getAllByRole("option")[0]);
    await waitFor(() => expect(choices).toHaveBeenCalled());
    await waitFor(() => expect(field()).toHaveFocus());
    expect(field()).toHaveValue("");
  });

  it("cancels an unchosen add with Escape and keeps the sheet open", async () => {
    mount();
    await find("sol ring", [card()]);
    await pickFirst();
    await screen.findAllByRole("radio");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryAllByRole("radio")).toHaveLength(0));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText(copy.listHeading(1))).toBeNull();
  });

  it("combines an exact duplicate, says so, and writes one line", async () => {
    mount();
    for (let i = 0; i < 2; i++) {
      await find("sol ring", [card()]);
      await pickFirst();
      fireEvent.click((await screen.findAllByRole("radio"))[0]);
      await waitFor(() => expect(field()).not.toBeDisabled());
    }
    expect(await screen.findByText(copy.combined("Sol Ring", 2))).toBeInTheDocument();
    expect(screen.getByText(copy.listHeading(1))).toBeInTheDocument();
    expect(screen.getByText(copy.summary(1, 2))).toBeInTheDocument();
  });

  it("saves one entry under one action id, and retries with the same id after a failure", async () => {
    add.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ applied: { id: "x" } });
    const { onSaved } = mount();
    await find("sol ring", [card()]);
    await pickFirst();
    fireEvent.click((await screen.findAllByRole("radio"))[0]);
    await waitFor(() => expect(field()).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    expect(await screen.findByText(copy.failed)).toBeInTheDocument();
    expect(screen.getByText(copy.listHeading(1))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    expect(await screen.findByText(copy.savedTitle(1))).toBeInTheDocument();
    expect(add).toHaveBeenCalledTimes(2);
    expect(add.mock.calls[0][0]).toBe(add.mock.calls[1][0]);
    expect(add.mock.calls[1][1]).toEqual([{ oracleId: OID, setCode: "c21", collectorNumber: "263", finish: "nonfoil", quantity: 1 }]);
    expect(screen.getByText(copy.countsAfter(4492, 4493))).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledWith(1);
  });

  it("asks before discarding a list, and not for an empty one", async () => {
    const { onClose } = mount();
    fireEvent.click(screen.getByRole("button", { name: copy.closeAria }));
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    await find("sol ring", [card()]);
    await pickFirst();
    fireEvent.click((await screen.findAllByRole("radio"))[0]);
    await waitFor(() => expect(field()).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: copy.closeAria }));
    const alert = await screen.findByRole("alertdialog");
    expect(within(alert).getByRole("button", { name: copy.keep })).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(within(alert).getByRole("button", { name: copy.discard }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("links the saved state to the entry it wrote, and closes the sheet on the way (B8)", async () => {
    add.mockResolvedValue({ applied: { id: "0b7e6c3a-1d2f-4a55-9a41-5f1c2d3e4f50" } });
    const { onClose } = mount();
    await find("sol ring", [card()]);
    await pickFirst();
    fireEvent.click((await screen.findAllByRole("radio"))[0]);
    await waitFor(() => expect(field()).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    const link = await screen.findByRole("link", { name: copy.seeInHistory });
    expect(link.getAttribute("href")).toBe("/collection/history?entry=0b7e6c3a-1d2f-4a55-9a41-5f1c2d3e4f50");
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(link);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("says where the copy went after the save, with Change, when the save says (where an added copy goes)", async () => {
    const chooser: ContestedCard = {
      oracleId: OID, cardName: "Sol Ring", arrived: 1, ownedBefore: 5, fromImport: true, owned: 6,
      claimants: [{ deckId: "d1", deckName: "HD - Brago", quantity: 1, commanderCopies: 0, granted: 0, since: 1, versionNumber: 1, allocated: 1 }],
    };
    add.mockResolvedValue({ applied: { id: "0b7e6c3a-1d2f-4a55-9a41-5f1c2d3e4f50", placed: [{
      oracleId: OID, cardName: "Sol Ring", chooser,
      went: { kind: "held", decks: [{ deckId: "d1", copies: 1, picked: false }], copies: 1, ownedBefore: 5 },
    }] } });
    mount();
    await find("sol ring", [card()]);
    await pickFirst();
    fireEvent.click((await screen.findAllByRole("radio"))[0]);
    await waitFor(() => expect(field()).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    await screen.findByText(addedCopyCopy.line.head(1));
    const said = addedCopyCopy.line.goesTo("Sol Ring", "HD - Brago");
    expect(screen.getByText((_, el) => el?.tagName === "SPAN" && el.textContent === said && el.querySelector("[data-em]") !== null)).toBeTruthy();
    const change = screen.getByRole("button", { name: addedCopyCopy.changeAria("Sol Ring") });
    fireEvent.click(change);
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    expect(change.textContent).toBe(addedCopyCopy.done);
  });

  it("draws no block when the save says nothing of where the copies went (the switch off)", async () => {
    add.mockResolvedValue({ applied: { id: "0b7e6c3a-1d2f-4a55-9a41-5f1c2d3e4f50" } });
    mount();
    await find("sol ring", [card()]);
    await pickFirst();
    fireEvent.click((await screen.findAllByRole("radio"))[0]);
    await waitFor(() => expect(field()).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    await screen.findByRole("link", { name: copy.seeInHistory });
    expect(screen.queryByText(addedCopyCopy.line.head(1))).toBeNull();
    expect(screen.queryByText(addedCopyCopy.line.nobodyOne("Sol Ring"))).toBeNull();
  });

  it("starts a fresh action id for Add more", async () => {
    add.mockResolvedValue({ applied: { id: "x" } });
    mount();
    const ids: unknown[] = [];
    for (let i = 0; i < 2; i++) {
      await find("sol ring", [card()]);
      await pickFirst();
      fireEvent.click((await screen.findAllByRole("radio"))[0]);
      await waitFor(() => expect(field()).not.toBeDisabled());
      fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
      await screen.findByText(copy.savedTitle(1));
      ids.push(add.mock.calls[i][0]);
      if (i === 0) fireEvent.click(screen.getByRole("button", { name: copy.addMore }));
    }
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("lets the count be cleared and retyped, and restores it on blur", async () => {
    mount();
    await find("sol ring", [card()]);
    await pickFirst();
    fireEvent.click((await screen.findAllByRole("radio"))[0]);
    await waitFor(() => expect(field()).not.toBeDisabled());
    const count = screen.getByRole("textbox", { name: copy.countAria("Sol Ring") });
    fireEvent.change(count, { target: { value: "" } });
    expect(count).toHaveValue("");
    fireEvent.change(count, { target: { value: "12" } });
    expect(screen.getByText(copy.summary(1, 12))).toBeInTheDocument();
    fireEvent.change(count, { target: { value: "" } });
    fireEvent.blur(count);
    expect(count).toHaveValue("12");
  });

  async function listOne(printings: PrintingChoice[] = [printing()]) {
    await find("sol ring", [card()]);
    await pickFirst(printings);
    if (printings.length > 1) fireEvent.click((await screen.findAllByRole("radio"))[0]);
    await waitFor(() => expect(field()).not.toBeDisabled());
  }

  it("mints a new action id when the list changed after a failed save", async () => {
    add.mockRejectedValueOnce(new Error("x")).mockRejectedValueOnce(new Error("x")).mockResolvedValue({ applied: { id: "x" } });
    mount();
    await listOne();
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    await screen.findByText(copy.failed);
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); // same list: same id
    await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    await screen.findByText(copy.failed);
    fireEvent.click(screen.getByRole("button", { name: copy.more }));
    fireEvent.click(screen.getByRole("button", { name: copy.retry })); // edited list: new id
    await waitFor(() => expect(add).toHaveBeenCalledTimes(3));
    expect(add.mock.calls[0][0]).toBe(add.mock.calls[1][0]);
    expect(add.mock.calls[2][0]).not.toBe(add.mock.calls[1][0]);
    expect(add.mock.calls[2][1][0].quantity).toBe(2);
  });

  it("advances the saved-state baseline across Add more", async () => {
    add.mockResolvedValue({ applied: { id: "x" } });
    mount();
    await listOne();
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    await screen.findByText(copy.countsAfter(4492, 4493));
    fireEvent.click(screen.getByRole("button", { name: copy.addMore }));
    await listOne();
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    expect(await screen.findByText(copy.countsAfter(4493, 4494))).toBeInTheDocument();
  });

  it("ignores close while a save is in flight", async () => {
    let finishSave: (v: unknown) => void = () => {};
    add.mockReturnValue(new Promise((r) => { finishSave = r; }));
    const { onClose } = mount();
    await listOne();
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    expect(screen.getByRole("button", { name: copy.closeAria })).toBeDisabled();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    finishSave({ applied: { id: "x" } });
    await screen.findByText(copy.savedTitle(1));
  });

  it("does not add a row that belongs to an earlier query", async () => {
    mount();
    await find("sol", [card()]);
    search.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.change(field(), { target: { value: "sol ri" } });
    fireEvent.click(screen.getByRole("option"));
    expect(choices).not.toHaveBeenCalled();
  });

  it("offers etched as its own finish and sends it", async () => {
    add.mockResolvedValue({ applied: { id: "x" } });
    mount();
    await listOne([printing({ finishes: ["nonfoil", "foil", "etched"], owned: {} })]);
    expect(screen.getByRole("button", { name: "Foil" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Etched" }));
    expect(screen.getByRole("button", { name: "Etched" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Foil" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    await screen.findByText(copy.savedTitle(1));
    expect(add.mock.calls[0][1][0].finish).toBe("etched");
  });

  it("says a failed search failed, rather than that no card exists, and retries", async () => {
    mount();
    search.mockRejectedValueOnce(new Error("offline"));
    fireEvent.change(field(), { target: { value: "sol" } });
    expect(await screen.findByText(copy.searchFailed)).toBeInTheDocument();
    expect(screen.queryByText(copy.noResultsTitle("sol"))).toBeNull();
    search.mockResolvedValueOnce([card()]);
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    expect(await screen.findByRole("option")).toBeInTheDocument();
  });

  it("keeps an unknown baseline unknown across Add more", async () => {
    add.mockResolvedValue({ applied: { id: "x" } });
    mount({ totalCards: undefined });
    await listOne();
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    await screen.findByText(copy.savedTitle(1));
    fireEvent.click(screen.getByRole("button", { name: copy.addMore }));
    await listOne();
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    await screen.findByText(copy.savedTitle(1));
    expect(screen.queryByText(/\u2192/)).toBeNull();
  });

  it("shows nothing about History, which has no route yet", () => {
    mount();
    expect(screen.queryByText(/history/i)).toBeNull();
  });
});
void OID2;
void act;
