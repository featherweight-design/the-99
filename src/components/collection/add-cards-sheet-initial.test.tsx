import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PrintingChoice } from "../../lib/collection/catalog-read";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { AddCardsSheet, type AddCardsSheetProps } from "./add-cards-sheet";

// Add a card from anywhere, READINESS O5: the sheet opens with a card on its list, or a query typed.
const copy = collectionEditCopy.add;
const OID = "11111111-1111-4111-8111-111111111111";

const search = vi.fn();
const choices = vi.fn();
const add = vi.fn();
vi.mock("../../app/collection/edit-actions", () => ({
  searchCollectionCards: (...a: unknown[]) => search(...a),
  loadPrintingChoices: (...a: unknown[]) => choices(...a),
  addToCollection: (...a: unknown[]) => add(...a),
}));
vi.mock("../../app/decks/assignment-actions", () => ({ assignCopy: vi.fn() }));
vi.mock("../shell/pending-push", () => ({ usePendingPush: () => ({ go: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, onNavigate, onClick, ...rest }: React.ComponentProps<"a"> & { href: string; onNavigate?: (e: { preventDefault: () => void }) => void }) => (
    <a href={href} onClick={(e) => { onClick?.(e); e.preventDefault(); onNavigate?.({ preventDefault: () => {} }); }} {...rest}>{children}</a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

const printing = (over: Partial<PrintingChoice> = {}): PrintingChoice => ({
  scryfallId: "s1", setCode: "c21", setName: "Commander 2021", collectorNumber: "263", releasedAt: "2021-04-23",
  imageUri: null, flavorName: null, finishes: ["nonfoil", "foil"], owned: {}, ...over,
});
const THREE = [printing(), printing({ scryfallId: "s2", setCode: "sld", collectorNumber: "1512" }), printing({ scryfallId: "s3", setCode: "cmm", collectorNumber: "410" })];
const GHALTA = { oracleId: OID, name: "Ghalta, Primal Hunger", imageUri: null };

function mount(over: Partial<Extract<AddCardsSheetProps, { mode: "add" }>> = {}) {
  const onClose = vi.fn();
  render(<AddCardsSheet mode="add" onClose={onClose} totalCards={4492} {...over} />);
  return { onClose };
}
const field = () => screen.getByRole("combobox", { name: copy.searchAria });

beforeEach(() => {
  search.mockReset().mockResolvedValue([]);
  choices.mockReset();
  add.mockReset();
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("AddCardsSheet initialCard", () => {
  it("opens with the card on the list and its printing step open: no default, Save waiting (C4)", async () => {
    choices.mockResolvedValueOnce(THREE);
    mount({ initialCard: GHALTA });
    await waitFor(() => expect(choices).toHaveBeenCalledWith(OID));
    const radios = await screen.findAllByRole("radio");
    expect(radios).toHaveLength(3);
    for (const r of radios) expect(r).toHaveAttribute("aria-checked", "false");
    expect(field()).toBeDisabled();
    expect(screen.getByText(copy.needsPrinting(GHALTA.name))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.save(0) })).toHaveAttribute("aria-disabled", "true");
    // Read once, not again on a re-render.
    expect(choices).toHaveBeenCalledTimes(1);
    expect(search).not.toHaveBeenCalled();
  });

  it("takes a single printing as the answer, as a pick does", async () => {
    choices.mockResolvedValueOnce([printing()]);
    mount({ initialCard: GHALTA });
    await waitFor(() => expect(screen.getByRole("button", { name: copy.save(1) })).not.toHaveAttribute("aria-disabled"));
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("says the printings could not be read, and opens on an empty list", async () => {
    choices.mockRejectedValueOnce(new Error("offline"));
    mount({ initialCard: GHALTA });
    expect(await screen.findByText(copy.printingsFailed)).toBeInTheDocument();
    expect(screen.getByText(copy.nothingYet)).toBeInTheDocument();
  });

  it("asks before throwing the card away, as for any list", async () => {
    choices.mockResolvedValueOnce([printing()]);
    const { onClose } = mount({ initialCard: GHALTA });
    await waitFor(() => expect(screen.getByRole("button", { name: copy.save(1) })).not.toHaveAttribute("aria-disabled"));
    fireEvent.click(screen.getByRole("button", { name: copy.closeAria }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});

describe("AddCardsSheet initialQuery", () => {
  it("opens with the query typed and its read running (the dock's bridge)", async () => {
    search.mockResolvedValueOnce([{ oracleId: OID, name: GHALTA.name, typeLine: "Creature", imageUri: null, manaCost: null, flavorName: null, owned: 0 }]);
    mount({ initialQuery: "ghalta" });
    expect(field()).toHaveValue("ghalta");
    await waitFor(() => expect(search).toHaveBeenCalledWith("ghalta"));
    expect(await screen.findByRole("option")).toHaveTextContent(GHALTA.name);
  });
});

describe("AddCardsSheet onClose", () => {
  it("closes on Done with no leaving flag, and on See it in History with one", async () => {
    choices.mockResolvedValueOnce([printing()]);
    add.mockResolvedValue({ applied: { id: "0b7e6c3a-1d2f-4a55-9a41-5f1c2d3e4f50" } });
    const { onClose } = mount({ initialCard: GHALTA });
    await waitFor(() => expect(screen.getByRole("button", { name: copy.save(1) })).not.toHaveAttribute("aria-disabled"));
    fireEvent.click(screen.getByRole("button", { name: copy.save(1) }));
    fireEvent.click(await screen.findByRole("button", { name: copy.done }));
    expect(onClose).toHaveBeenLastCalledWith();
    fireEvent.click(screen.getByRole("link", { name: copy.seeInHistory }));
    expect(onClose).toHaveBeenLastCalledWith(true);
  });
});
