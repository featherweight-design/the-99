// The price under the art (card-detail R2, table §1 and §2).
//
// The twelve cells of STATES §1 reduce to four visible answers — a figure, a
// foil-qualified figure, `no stock`, and nothing at all — crossed with where the
// tag renders, which is the part ownership actually changes.
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard, BrowsePrinting } from "../../lib/collection/browse";
import { indexPriceRows, type PrintingPriceRow } from "../../lib/cards/price-lookup";
import { setPageCopy } from "../../lib/copy/set-collections";

vi.mock("../../app/collection/actions", () => ({
  // The real action reports whether it wrote; a bare `vi.fn()` resolves undefined,
  // which the modal reads as a refusal and rolls the optimistic pick back.
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardModal } = await import("./card-modal");

const NEWEST = "2026-09-08 09:00:00";

const priceRow = (over: Partial<PrintingPriceRow> = {}): PrintingPriceRow => ({
  newest_as_of: NEWEST,
  scryfall_id: "s-1",
  set_code: "RVR",
  collector_number: "12",
  price_cents: 241,
  price_cents_foil: null,
  price_cents_etched: null,
  as_of: NEWEST,
  ...over,
});

const printing = (over: Partial<BrowsePrinting> = {}): BrowsePrinting => ({
  setCode: "RVR",
  scryfallId: "s-1",
  setName: "Ravnica Remastered",
  collectorNumber: "12",
  releasedAt: "2024-01-12",
  quantity: 1,
  finishes: { nonfoil: 1 },
  imageUri: null,
  flavorName: null,
  ...over,
});

const card = (over: Partial<BrowseCard> = {}): BrowseCard => ({
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  cmc: 4,
  oracleText: "",
  keywords: [],
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: null,
  printedName: null,
  quantity: 1,
  printings: [printing()],
  setCodes: ["RVR"],
  primarySetCode: "RVR",
  preferredPrinting: null,
  prices: indexPriceRows([priceRow()]),
  ...over,
});

function mount(c: BrowseCard) {
  render(<CardModal card={c} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />);
}

describe("the price under the art", () => {
  it("states the resolved printing's figure at both widths", () => {
    mount(card());

    // Both header layouts are in the DOM at once and separated by CSS, exactly as
    // the art they sit under is.
    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$2.41");
    expect(screen.getByTestId("modal-price-mobile")).toHaveTextContent("$2.41");
  });

  it("qualifies a foil-only figure, because the bare number names a printing nobody can buy", () => {
    mount(card({ prices: indexPriceRows([priceRow({ price_cents: null, price_cents_foil: 610 })]) }));

    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("◆ foil $6.10");
  });

  it("says `no stock` when the store answered and the answer was no", () => {
    // A sold-out printing keeps its last row with a frozen as_of, so liveness is the
    // comparison rather than the absence of a row.
    mount(card({
      prices: indexPriceRows([
        priceRow({ as_of: "2026-08-01 09:00:00" }),
        priceRow({ scryfall_id: "other", collector_number: "999" }),
      ]),
    }));

    expect(screen.getByTestId("modal-price-desktop"))
      .toHaveTextContent(setPageCopy.cell.noStock);
  });

  it("says `no stock` for a printing the feed has never carried", () => {
    mount(card({ prices: indexPriceRows([priceRow({ scryfall_id: "other", collector_number: "999" })]) }));

    expect(screen.getByTestId("modal-price-desktop"))
      .toHaveTextContent(setPageCopy.cell.noStock);
  });

  it("renders no node at all when no price read reached us", () => {
    // Silence is the state. Not a dash, not $0.00, not a reserved slot — and not
    // an aria-hidden placeholder either, so the absent state is absent to
    // assistive tech too.
    mount(card({ prices: null }));

    expect(screen.queryByTestId("modal-price-desktop")).toBeNull();
    expect(screen.queryByTestId("modal-price-mobile")).toBeNull();
  });

  it("renders nothing for a holding that names no printing to ask about", () => {
    // A bare `Name,Qty` import: no catalog id and no collector number. `no stock`
    // there would be a claim about a printing we cannot name.
    mount(card({
      printings: [printing({ scryfallId: undefined, collectorNumber: "" })],
    }));

    expect(screen.queryByTestId("modal-price-desktop")).toBeNull();
  });

  it("never shows a sibling printing's figure under this printing's art", () => {
    mount(card({
      printings: [printing({ scryfallId: "s-unpriced", collectorNumber: "777" })],
      prices: indexPriceRows([priceRow({ price_cents: 9999 })]),
    }));

    expect(screen.getByTestId("modal-price-desktop")).not.toHaveTextContent("$99.99");
    expect(screen.getByTestId("modal-price-desktop"))
      .toHaveTextContent(setPageCopy.cell.noStock);
  });

  it("speaks the ratified sentence rather than a bare figure", () => {
    // A tag drawn on its own in a dialog would otherwise reach a screen reader as
    // "$2.41" — a number with no subject and no date (table row 1.12). The sentence
    // rides an sr-only sibling rather than an aria-label, because a label on a bare
    // span lands on the generic role and is discarded (decks/buy-tag.tsx:127-133).
    mount(card());

    const tag = screen.getByTestId("modal-price-desktop");
    expect(tag.querySelector(".sr-only")?.textContent)
      .toMatch(/\$2\.41 at ManaPool, last checked /);
    expect(tag.querySelector("[aria-hidden='true']")?.textContent).toBe("$2.41");
  });

  it("keeps the provenance on a foil-only figure instead of trading it for the finish", () => {
    mount(card({ prices: indexPriceRows([priceRow({ price_cents: null, price_cents_foil: 610 })]) }));

    expect(screen.getByTestId("modal-price-desktop").querySelector(".sr-only")?.textContent)
      .toMatch(/◆ foil \$6\.10 at ManaPool, last checked /);
  });

  it("says which history `no stock` is, where the visible word cannot", () => {
    mount(card({ prices: indexPriceRows([priceRow({ scryfall_id: "other", collector_number: "999" })]) }));

    expect(screen.getByTestId("modal-price-desktop").querySelector(".sr-only")?.textContent)
      .toBe(setPageCopy.cellPrice.neverStocked);
  });

  it("follows the pick, because four things move together or none do", async () => {
    // The figure under the art is the one a player is choosing against when they
    // own a cheap printing and an expensive one.
    const two = [
      printing({ scryfallId: "s-1", collectorNumber: "12" }),
      printing({ scryfallId: "s-2", collectorNumber: "24", setCode: "ELD", setName: "Throne of Eldraine" }),
    ];
    mount(card({
      printings: two,
      prices: indexPriceRows([
        priceRow(),
        priceRow({ scryfall_id: "s-2", set_code: "ELD", collector_number: "24", price_cents: 1875 }),
      ]),
    }));
    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$2.41");

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /printings owned/ })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /ELD/ })[0]);
    });

    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$18.75");
  });

  it("is unchanged by ownership — an unowned card carries the same figure", () => {
    mount(card({ quantity: 0, printings: [printing({ quantity: 0, finishes: {} })] }));

    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$2.41");
  });
});

describe("the compact art header", () => {
  // Reached only with 2+ owned printings and the region open past the overflow
  // threshold, which is the state the R1 handoff did not draw and R2 rules.
  const many = Array.from({ length: 14 }, (_, i) =>
    printing({ scryfallId: `s-${i}`, collectorNumber: String(i), quantity: 1 }));

  function openPicker(c: BrowseCard) {
    mount(c);
    // Both breakpoint trees render a trigger; the first is the phone's, which is
    // the one whose header collapses.
    fireEvent.click(
      screen.getAllByRole("button", { name: /printings owned/ })[0],
    );
  }

  it("moves the tag beside the mana cost rather than dropping it", () => {
    openPicker(card({ printings: many, prices: indexPriceRows([priceRow({ scryfall_id: "s-0", collector_number: "0" })]) }));

    const tag = screen.getByTestId("modal-price-compact");
    expect(tag).toHaveTextContent("$2.41");
    expect(screen.queryByTestId("modal-price-mobile")).toBeNull();
    // E12 makes the relationship part of the contract: on a phone in this state the
    // name is in the art header and the mana cost is here, so "beside the mana cost"
    // is the half of the drawing that can be honoured — and a tag that drifted
    // elsewhere in the content column would otherwise still pass.
    // Siblings, not merely both somewhere in the column: a `querySelector` from the
    // tag's parent would find the mana cost anywhere below it and pass for a tag that
    // had drifted to the bottom of the content column.
    expect(screen.getByTestId("modal-mana-cost").parentElement).toBe(tag.parentElement);
  });

  it("keeps the figure out of the aria-hidden heading", () => {
    // The compact heading is aria-hidden because the h3 stays in the DOM as the
    // dialog's accessible name. A figure inside it would be invisible to assistive
    // tech — the one trap this placement has.
    openPicker(card({ printings: many, prices: indexPriceRows([priceRow({ scryfall_id: "s-0", collector_number: "0" })]) }));

    expect(screen.getByTestId("modal-price-compact").closest("[aria-hidden]")).toBeNull();
  });
});
