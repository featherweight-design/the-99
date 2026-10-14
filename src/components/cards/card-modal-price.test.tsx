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
import { priceCopy } from "../../lib/copy/price";

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

  it("names the cheapest printing when the one on screen is dearer", () => {
    // The bug this answers: /commanders/[slug] quotes a card's cheapest printing
    // and this modal quotes the printing on screen, so the reader met $2.34 on one
    // surface and $4.39 on the next with nothing saying they were two questions.
    mount(card({
      prices: indexPriceRows([
        priceRow({ price_cents: 439 }),
        priceRow({ scryfall_id: "cheap", collector_number: "999", price_cents: 234 }),
      ]),
    }));

    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$4.39");
    // Both widths, as with the tag they sit beside: the desktop stack and the
    // phone's plate are in the DOM at once and separated by CSS.
    expect(screen.getByTestId("modal-price-from-desktop")).toHaveTextContent("from $2.34");
    expect(screen.getByTestId("modal-price-from-mobile")).toHaveTextContent("from $2.34");
    // The spoken half names the FINISH. `cheapestLiveCents` is non-foil only, so a
    // live foil can undercut this figure and "cheapest printing" would be a false
    // claim made to the one reader who cannot see the tag beside it.
    expect(screen.getByTestId("modal-price-from-desktop"))
      .toHaveTextContent(priceCopy.cheapest.aria("$2.34"));
  });

  it("says nothing when the printing on screen IS the cheapest", () => {
    // `from $2.41` beside `$2.41` is the same number twice, which answers a
    // question nobody has.
    mount(card({
      prices: indexPriceRows([
        priceRow({ price_cents: 241 }),
        priceRow({ scryfall_id: "dear", collector_number: "999", price_cents: 980 }),
      ]),
    }));

    expect(screen.queryByTestId("modal-price-from-desktop")).toBeNull();
  });

  // The unowned case end to end (Zul Ashur): the catalog lists FDC #135 first, which the feed
  // never carried. `catalogCard` now opens it on the cheapest live printing, so the tag is that
  // figure, and the `from` line goes because the printing on screen IS the cheapest.
  it("opens an unowned card on its cheapest live printing: its figure, no `no stock`, no `from` line", async () => {
    const { catalogCard } = await import("../../lib/collection/card-detail");
    const prices = indexPriceRows([
      priceRow({ scryfall_id: "s-fdc", set_code: "FDC", collector_number: "135", price_cents: null, as_of: null as unknown as string }),
      priceRow({ scryfall_id: "s-77", set_code: "FDN", collector_number: "77", price_cents: 32 }),
      priceRow({ scryfall_id: "s-326", set_code: "FDN", collector_number: "326", price_cents: 203 }),
    ]);
    const catalog = catalogCard(
      {
        oracleId: "o1", scryfallId: "s-nowhere", name: "Zul Ashur, Lich Lord", typeLine: "Legendary Creature",
        manaCost: "{1}{B}", cmc: 2, oracleText: "", keywords: [], rarity: "rare", colorIdentity: ["B"],
        imageUri: "https://img/oracle.jpg", layout: "normal", backImageUri: null,
      },
      [
        { scryfallId: "s-fdc", setCode: "fdc", setName: "Foundations Commander", collectorNumber: "135", releasedAt: "2024-11-15", imageUri: "https://img/fdc.jpg", backImageUri: null, flavorName: null },
        { scryfallId: "s-77", setCode: "fdn", setName: "Foundations", collectorNumber: "77", releasedAt: "2024-11-15", imageUri: "https://img/77.jpg", backImageUri: null, flavorName: null },
        { scryfallId: "s-326", setCode: "fdn", setName: "Foundations", collectorNumber: "326", releasedAt: "2024-11-15", imageUri: "https://img/326.jpg", backImageUri: null, flavorName: null },
      ],
      prices,
    );
    mount({ ...catalog, prices });

    expect(screen.getAllByText("$0.32").length).toBeGreaterThan(0);
    expect(screen.queryByText(setPageCopy.cell.noStock)).toBeNull();
    expect(screen.queryByTestId("modal-price-from-desktop")).toBeNull();
    expect(screen.queryByTestId("modal-price-from-mobile")).toBeNull();
  });

  it("names the cheapest printing beside a `no stock` tag", () => {
    // Same reader, same question, and no figure on screen to hold the answer
    // against — which is the case that most needs it.
    mount(card({
      prices: indexPriceRows([
        priceRow({ as_of: "2026-08-01 09:00:00" }),
        priceRow({ scryfall_id: "cheap", collector_number: "999", price_cents: 234 }),
      ]),
    }));

    expect(screen.getByTestId("modal-price-desktop"))
      .toHaveTextContent(setPageCopy.cell.noStock);
    // Both widths, as with the tag they sit beside: the desktop stack and the
    // phone's plate are in the DOM at once and separated by CSS.
    expect(screen.getByTestId("modal-price-from-desktop")).toHaveTextContent("from $2.34");
    expect(screen.getByTestId("modal-price-from-mobile")).toHaveTextContent("from $2.34");
  });

  it("does not quote a foil figure as the cheapest", () => {
    // A bare `from` with a foil figure behind it names a finish the reader cannot
    // buy, which is what the tag's own qualifier exists to prevent.
    mount(card({
      prices: indexPriceRows([
        priceRow({ price_cents: 439 }),
        priceRow({
          scryfall_id: "foil",
          collector_number: "999",
          price_cents: null,
          price_cents_foil: 120,
        }),
      ]),
    }));

    expect(screen.queryByTestId("modal-price-from-desktop")).toBeNull();
  });

  it("says nothing when the figure on screen is already lower, whatever its finish", () => {
    // The cheapest is non-foil only and the tag draws whichever finish this
    // printing was stocked in, so the two sides can name different finishes. The
    // rule is that this line never sits beside a smaller number claiming the card
    // starts higher — so a foil-only $1.20 with a $4.39 non-foil sibling is
    // silent.
    mount(card({
      prices: indexPriceRows([
        priceRow({ price_cents: null, price_cents_foil: 120 }),
        priceRow({ scryfall_id: "plain", collector_number: "999", price_cents: 439 }),
      ]),
    }));

    expect(screen.getByTestId("modal-price-tag-desktop")).toHaveTextContent("$1.20");
    expect(screen.queryByTestId("modal-price-from-desktop")).toBeNull();
  });

  it("names the cheapest beside a dearer foil-only figure", () => {
    // The mirror of the case above, and the reason a reader would look: the
    // printing on screen is stocked in foil at $9.80 and the card starts at $4.39.
    mount(card({
      prices: indexPriceRows([
        priceRow({ price_cents: null, price_cents_foil: 980 }),
        priceRow({ scryfall_id: "plain", collector_number: "999", price_cents: 439 }),
      ]),
    }));

    expect(screen.getByTestId("modal-price-from-desktop")).toHaveTextContent("from $4.39");
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

    // The TAG is what must not fall back — the figure under the art belongs to
    // the art. The `from` line beside it carries a sibling's figure on purpose
    // and says so in words, which is the whole difference between the two.
    expect(screen.getByTestId("modal-price-tag-desktop")).not.toHaveTextContent("$99.99");
    expect(screen.getByTestId("modal-price-tag-desktop"))
      .toHaveTextContent(setPageCopy.cell.noStock);
    expect(screen.getByTestId("modal-price-from-desktop")).toHaveTextContent("from $99.99");
  });

  it("speaks the ratified sentence rather than a bare figure", () => {
    // A tag drawn on its own in a dialog would otherwise reach a screen reader as
    // "$2.41" — a number with no subject and no date (table row 1.12). The sentence
    // rides an sr-only sibling rather than an aria-label, because a label on a bare
    // span lands on the generic role and is discarded (decks/buy-tag.tsx:127-133).
    mount(card());

    const tag = screen.getByTestId("modal-price-desktop");
    expect(tag.querySelector(".sr-only")?.textContent)
      .toMatch(/\$2\.41 at Mana Pool, last checked /);
    expect(tag.querySelector("[aria-hidden='true']")?.textContent).toBe("$2.41");
  });

  it("keeps the provenance on a foil-only figure instead of trading it for the finish", () => {
    mount(card({ prices: indexPriceRows([priceRow({ price_cents: null, price_cents_foil: 610 })]) }));

    expect(screen.getByTestId("modal-price-desktop").querySelector(".sr-only")?.textContent)
      .toMatch(/◆ foil \$6\.10 at Mana Pool, last checked /);
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

  // The pair is shared and the caller named the printing both ways — id AND art. The
  // injected row has to WIN the pair match, or the owned sibling that happens to sort first
  // is drawn and priced under the identity the reader clicked.
  it("draws and prices the clicked printing when the pair is shared", () => {
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
        openAtPrinting={{
          setCode: "RVR", collectorNumber: "12",
          scryfallId: "s-exact", imageUri: "https://img/exact.jpg",
        }}
      />,
    );

    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$15.00");
    expect(screen.getByTestId("modal-art-desktop").getAttribute("style"))
      .toContain("exact.jpg");
  });

  // The same rule on the OWNED path: the reader already holds the clicked printing, so
  // nothing is injected — and the sibling sharing its pair could still win the pair match
  // and be drawn and priced under the clicked cell's identity.
  it("prefers the owned row the caller's id names over its pair sibling", () => {
    render(
      <CardModal
        card={card({
          printings: [
            printing({ scryfallId: "s-twin", imageUri: "https://img/twin.jpg" }),
            printing({ scryfallId: "s-exact", imageUri: "https://img/exact.jpg" }),
          ],
          prices: indexPriceRows([
            priceRow({ scryfall_id: "s-twin", price_cents: 100 }),
            priceRow({ scryfall_id: "s-exact", price_cents: 1500 }),
          ]),
        })}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
        openAtPrinting={{
          setCode: "RVR", collectorNumber: "12",
          scryfallId: "s-exact", imageUri: "https://img/exact.jpg",
        }}
      />,
    );

    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$15.00");
    expect(screen.getByTestId("modal-art-desktop").getAttribute("style"))
      .toContain("exact.jpg");
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

describe("the phone sheet's second line (carousel R2)", () => {
  // The compact 72px header retired with the 180px one (README R2 "Full"): the art lives in the
  // card band now, so opening the picker past the overflow threshold collapses nothing and the
  // tag has nowhere to move to.
  const many = Array.from({ length: 14 }, (_, i) =>
    printing({ scryfallId: `s-${i}`, collectorNumber: String(i), quantity: 1 }));

  function openPicker(c: BrowseCard) {
    mount(c);
    // Both breakpoint trees render a trigger; the first is the phone's.
    fireEvent.click(
      screen.getAllByRole("button", { name: /printings owned/ })[0],
    );
  }

  it("keeps the tag beside what the reader owns with the picker open past the threshold", () => {
    openPicker(card({ printings: many, prices: indexPriceRows([priceRow({ scryfall_id: "s-0", collector_number: "0" })]) }));

    const tag = screen.getByTestId("modal-price-mobile");
    expect(tag).toHaveTextContent("$2.41");
    // Siblings on one line, as `PhoneHero.dc.html` draws them: a tag that drifted elsewhere in
    // the sheet would still pass a presence check.
    expect(screen.getByTestId("owned-line").parentElement).toBe(tag.parentElement);
  });

  it("draws the tag at both snaps, outside the column the teaser hides", () => {
    mount(card({ prices: indexPriceRows([priceRow({ scryfall_id: "s-0", collector_number: "0" })]), printings: [printing({ scryfallId: "s-0", collectorNumber: "0", quantity: 1 })] }));
    const hidden = (el: Element) => el.closest(".max-md\\:hidden") !== null;
    const tag = () => screen.getByTestId("modal-price-mobile");
    expect(tag()).toHaveTextContent("$2.41");
    expect(hidden(tag())).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Show all details" }));
    expect(tag()).toHaveTextContent("$2.41");
    expect(hidden(tag())).toBe(false);
  });

  it("is reachable by assistive technology", () => {
    openPicker(card({ printings: many, prices: indexPriceRows([priceRow({ scryfall_id: "s-0", collector_number: "0" })]) }));

    expect(screen.getByTestId("modal-price-mobile").closest("[aria-hidden]")).toBeNull();
  });
});
