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
    // The query returns every printing of the card, so this one arrives with no
    // price row rather than not arriving at all — which is the store answering.
    mount(card({
      prices: indexPriceRows([
        priceRow({ scryfall_id: "other", collector_number: "999" }),
        priceRow({ as_of: null, price_cents: null }),
      ]),
    }));

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

  it("prices a bare `Name,Qty` holding when its set holds one printing", () => {
    // The commonest import in this app carries neither an id nor a collector number.
    // The catalog still names the printing when the set holds only one of the card,
    // and refusing there made the whole feature invisible on such a collection.
    mount(card({
      printings: [printing({ scryfallId: undefined, collectorNumber: "" })],
    }));

    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$2.41");
  });

  it("renders nothing when nothing narrows the holding to one printing", () => {
    mount(card({
      printings: [printing({ scryfallId: undefined, collectorNumber: "" })],
      prices: indexPriceRows([
        priceRow(),
        priceRow({ scryfall_id: "s-variant", collector_number: "400", price_cents: 9999 }),
      ]),
    }));

    expect(screen.queryByTestId("modal-price-desktop")).toBeNull();
  });

  it("never shows a sibling printing's figure under this printing's art", () => {
    mount(card({
      printings: [printing({ scryfallId: "s-unpriced", collectorNumber: "777" })],
      prices: indexPriceRows([
        priceRow({ price_cents: 9999 }),
        priceRow({ scryfall_id: "s-unpriced", collector_number: "777", as_of: null, price_cents: null }),
      ]),
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

  it("draws the word in the ink that clears 4.5:1, and the edge in the one that clears 3", () => {
    // Two floors, two tokens: a 10px word answers to 4.5:1 and a dashed mark to 3:1.
    // `wash-contrast.test.ts` measures both against every theme; this is the half that
    // says the component asks for the right ones.
    mount(card({
      prices: indexPriceRows([
        priceRow({ scryfall_id: "other", collector_number: "999" }),
        priceRow({ as_of: null, price_cents: null }),
      ]),
    }));

    // The visual node is the one carrying the ink; in standalone mode it sits under an
    // `aria-hidden` wrapper with the sr-only sentence beside it.
    const style = [...screen.getByTestId("modal-price-desktop").querySelectorAll("span")]
      .map((n) => n.getAttribute("style") ?? "")
      .find((s) => s.includes("dashed")) ?? "";
    expect(style).toContain("var(--fg-muted)");
    expect(style).toContain("dashed var(--fg-locked)");
  });

  it("says which history `no stock` is, where the visible word cannot", () => {
    mount(card({
      prices: indexPriceRows([
        priceRow({ scryfall_id: "other", collector_number: "999" }),
        priceRow({ as_of: null, price_cents: null }),
      ]),
    }));

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

describe("a card opened at a printing", () => {
  it("prices the printing the cell opened, not the one the reader owns", () => {
    // The set grid's realistic case: the cell hands over its exact id AND its art,
    // and the reader owns a different printing of the same card. The injected row is
    // the one drawn, so it is the one priced.
    render(
      <CardModal
        card={card({
          printings: [printing({ scryfallId: "s-owned", collectorNumber: "99", imageUri: "https://img/owned.jpg" })],
          prices: indexPriceRows([
            priceRow({ scryfall_id: "s-owned", collector_number: "99", price_cents: 100 }),
            priceRow({ scryfall_id: "s-exact", price_cents: 1500 }),
          ]),
        })}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
        openAtPrinting={{
          setCode: "RVR",
          collectorNumber: "12",
          scryfallId: "s-exact",
          imageUri: "https://img/exact.jpg",
        }}
      />,
    );

    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$15.00");
  });

  it("does not stamp the caller's id onto a different printing that shares the pair", () => {
    // The owned row IS a different catalog printing with the same (set, collector
    // number) — the pair is not unique. The caller named `s-exact` but handed over
    // no art for it, so the resolver keeps drawing the owned row's picture; the
    // figure has to be that row's too. Relabelling it with the caller's id would
    // print $15.00 under a printing that costs $1.00.
    render(
      <CardModal
        card={card({
          printings: [printing({ scryfallId: "s-owned", imageUri: "https://img/owned.jpg" })],
          prices: indexPriceRows([
            priceRow({ scryfall_id: "s-owned", price_cents: 100 }),
            priceRow({ scryfall_id: "s-exact", price_cents: 1500 }),
          ]),
        })}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
        openAtPrinting={{ setCode: "RVR", collectorNumber: "12", scryfallId: "s-exact", imageUri: null }}
      />,
    );

    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$1.00");
  });

  it("will not read an id-less holding as the target when the pair names two printings", () => {
    // The holding names no printing of its own, and the catalog gives this pair to
    // two. Treating it as the opened printing would put `s-exact`'s figure under a
    // picture that might be the sibling's; the exact row is injected instead, and
    // with no art of its own the owned picture stays — so the figure has to go
    // silent rather than claim either price.
    render(
      <CardModal
        card={card({
          printings: [printing({ scryfallId: undefined, imageUri: "https://img/owned.jpg" })],
          prices: indexPriceRows([
            priceRow({ scryfall_id: "s-exact", price_cents: 1500 }),
            priceRow({ scryfall_id: "s-twin", price_cents: 100 }),
          ]),
        })}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
        openAtPrinting={{ setCode: "RVR", collectorNumber: "12", scryfallId: "s-exact", imageUri: null }}
      />,
    );

    expect(screen.queryByTestId("modal-price-desktop")).toBeNull();
  });

  it("will not rewrite an owned row's art when the caller names no id and the pair is ambiguous", () => {
    // No id from either side and two printings behind the pair: rewriting the owned
    // row's picture while keeping its id would show that row's price under what may
    // be its sibling's art. The caller's printing is injected instead, the resolver
    // keeps the owned row (the only one with a picture of its own), and the figure
    // is that row's — art and price still naming one printing.
    render(
      <CardModal
        card={card({
          printings: [printing({ scryfallId: "s-owned", imageUri: "https://img/owned.jpg" })],
          prices: indexPriceRows([
            priceRow({ scryfall_id: "s-owned", price_cents: 100 }),
            priceRow({ scryfall_id: "s-twin", price_cents: 1500 }),
          ]),
        })}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
        openAtPrinting={{ setCode: "RVR", collectorNumber: "12", imageUri: "https://img/other.jpg" }}
      />,
    );

    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$1.00");
    expect(screen.getByTestId("modal-art-desktop").getAttribute("style"))
      .toContain("owned.jpg");
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
